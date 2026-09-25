import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import JSZip from "jszip";
import { create, project, base64, technicalZip } from "../src/bug-report/report-pdf.mjs";
import email from "../src/bug-report/email-draft.js";
import diagnostics from "../src/bug-report/bc-diagnostic-evidence.js";

const url = "https://businesscentral.dynamics.com/demo/Sandbox?company=Demo%20Company&page=5768&dc=0&bookmark=example";
const pkg = { title: "Fel vid Registrera vikt", documentLanguage: "sv-SE", generatedAt: "2026-09-13",
  environment: { businessCentral: { company: "Demoföretag", environment: "Sandbox", pageId: 5768 }, extensionVersion: "SECRET" },
  errorEvidence: { primary: { rawMessage: "Ett fel inträffade.", supportUrl: url } },
  reproduction: [{ instruction: "Välj **Registrera vikt**." }], callStack: [], diagnostics: { rows: [] } };
const model = project(pkg);
const staleDescription = project({ ...pkg, actualResult: { userDescription: "REMOVED_LEGACY_TEXT" } });
assert.ok(!JSON.stringify(staleDescription).includes("REMOVED_LEGACY_TEXT"));
assert.ok(JSON.stringify(staleDescription).includes(pkg.errorEvidence.primary.rawMessage));
assert.equal(model.severity, "");
assert.equal(project({ ...pkg, summary: { severity: "High" } }).severity, "High");
const legacy = { ...pkg, environment: { businessCentral: { environment: "Sandbox" } } };
assert.equal(project(legacy).company, "Demo Company", "Recover company from captured error deep link");
assert.equal(project({ ...legacy, errorEvidence: { primary: { supportUrl: url.replace("%20", "+") } } }).company, "Demo Company");
assert.equal(project({ ...legacy, errorEvidence: { primary: { supportUrl: "https://example.com/?company=Wrong" } } }).company, "");
assert.equal(project({ ...legacy, errorEvidence: { primary: { structuredDiagnostics: { company: "Captured Company" }, supportUrl: url } } }).company, "Captured Company");
assert.equal(project(pkg).company, "Demoföretag", "Recorded metadata takes precedence over URL fallback");
assert.ok(!legacy.environment.businessCentral.company, "Do not mutate the original package");
const captured = diagnostics.normalize({ errorEvidenceId: "error-1", recordingId: "recording-1",
  capturedAt: "2026-09-13T10:15:00Z", rawMessage: "Ett BC-fel.", rawDiagnostics:
    'Internal session ID:\n\nsession-123\nClient activity ID:\nactivity-456\nTimestamp:\n2026-09-13T10:15:00Z\nAL call stack:\n"Demo"(CodeUnit 50000).RegisterWeight line 12' });
assert.equal(captured.structuredDiagnostics.internalSessionId, "session-123");
assert.equal(captured.structuredDiagnostics.clientActivityId, "activity-456");
assert.equal(captured.structuredDiagnostics.timestamp, "2026-09-13T10:15:00Z");
assert.deepEqual(diagnostics.parseRawDiagnostics("Internal session ID:\nClient activity ID:\nactivity-456")
  .structuredDiagnostics, { clientActivityId: "activity-456" });
const technicalPkg = { ...pkg, errorEvidence: { primary: captured } };
const technicalModel = project(technicalPkg);
assert.match(technicalModel.sections.find(s => s.id === "diagnostics").rows.join("\n"), /BC:s interna sessions-ID: session-123/);
assert.match(technicalModel.sections.find(s => s.id === "callStack").rows[0], /RegisterWeight/);
assert.ok(!project({ ...technicalPkg, inclusion: { callStack: false } }).sections.some(s => s.id === "callStack"));
assert.ok(!project({ ...technicalPkg, callStack: [{ rawCallStack: "PRIVATE_STACK" }],
  inclusion: { callStack: false } }).sections.some(s => s.id === "callStack"),
  "Explicit exclusion must suppress stored package stacks, not only evidence fallback");
assert.ok(!project({ ...pkg, diagnostics: { rows: [{ label: "", value: "" },
  { label: "Sessions-ID", value: null }] } }).sections.some(s => s.id === "diagnostics"));
const technicalPdf = await create(technicalPkg);
const technicalDraft = email.build(technicalPkg, "", { to: "support@example.com", attachments: [{
  fileName: "report.pdf", mediaType: "application/pdf", base64: base64(technicalPdf.bytes) }] });
assert.match(technicalDraft.content, /application\/pdf/);
const attachmentPart = technicalDraft.content.split("Content-Disposition: attachment;")[1];
const encodedPdf = attachmentPart.split("\r\n\r\n")[1].split("\r\n--")[0].replace(/\s/gu, "");
assert.deepEqual(Buffer.from(encodedPdf, "base64"), Buffer.from(technicalPdf.bytes),
  "Email must attach the exact generated PDF bytes");
assert.equal((await PDFDocument.load(technicalPdf.bytes)).getPageCount(), technicalPdf.pageCount);
assert.deepEqual(model.links, [url]);
assert.deepEqual(model.sections.map(s => s.id), ["actual", "reproduction", "environment"]);
assert.ok(!JSON.stringify(model).includes("SECRET"));
assert.ok(!JSON.stringify(model).includes("**"));
assert.ok(!project({ ...pkg, reproduction: [{}] }).sections.some(s => s.id === "reproduction"));
assert.deepEqual(project({ ...pkg, errorEvidence: { primary: { supportUrl: "javascript:alert(1)" } } }).links, []);
const result = await create(pkg);
const pdf = await PDFDocument.load(result.bytes);
assert.equal(pdf.getPageCount(), 1,
  "Short report sections share a page instead of creating whitespace");
const annotation = pdf.context.lookup(pdf.getPage(0).node.Annots().get(0));
assert.ok(annotation.toString().includes(url), "Exact original URL including %20 and query order");
const long = await create({ ...pkg, errorEvidence: { primary: { rawMessage: "Ett långt felmeddelande. ".repeat(2000) } } });
assert.ok(long.pageCount > 2);
const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a0WQAAAAASUVORK5CYII=";
const withImage = await create(pkg, [{ role: "error-evidence", dataUrl: png }]);
assert.ok(withImage.pageCount <= 2);
const imagePdf = await PDFDocument.load(withImage.bytes);
assert.ok(imagePdf.getPage(0).node.Resources().toString().includes("/Image"), "Error image on first page");
const multipleImages = await create(pkg, [{ role: "reproduction-evidence", dataUrl: png },
  { role: "error-evidence", dataUrl: png }]);
assert.equal(multipleImages.pageCount, withImage.pageCount, "Identical screenshots are not repeated");
assert.equal(model.trigger, null, "Do not infer failure from last step alone");
const classified = project({ ...pkg, errorEvidence: { primary: { capturedAt: "2026-09-13T10:00:00Z", precedingActionEventId: "event-1" } },
  reproduction: [{ instruction: "Välj Registrera vikt.", source: { sourceCanonicalEventIds: ["event-1"] } }] });
assert.equal(classified.trigger.number, 1);
assert.equal(classified.date, "2026-09-13T10:00:00Z");
assert.match(classified.sections.find(s => s.id === "reproduction").rows[0], /Felet inträffade här/);
assert.equal(project({ ...pkg, reproduction: [{ reproductionStepId: "s1", instruction: "Öppna order.",
  screenshotAssetIds: ["a1"] }] }).steps[0].assets[0], "a1");
const zipBytes = await technicalZip({ bugReportMarkdown: "Report", attachments: [{ dataUrl: png }] });
const zip = await JSZip.loadAsync(zipBytes);
assert.ok(zip.file("bilder/bild-1.png"));
const draft = email.build(pkg, "", { to: "support@example.com", attachments: [{ fileName: "report.pdf", mediaType: "application/pdf", base64: base64(result.bytes) }] });
assert.match(draft.content, /application\/pdf/);
assert.ok(!draft.content.includes("application/json"));
assert.match(draft.content, /X-Unsent: 1/);
console.log("Bug report PDF content, pagination, exact links, screenshots, ZIP and email tests passed.");
