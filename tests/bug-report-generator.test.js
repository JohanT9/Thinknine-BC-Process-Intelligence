const assert = require("assert");
const fs = require("fs");
const model = require("../src/bug-report/bug-report-model");
const technical = require("../src/bug-report/technical-diagnostics");
const generator = require("../src/bug-report/bug-report-generator");
const completeness = require("../src/bug-report/bug-report-completeness");
const exporter = require("../src/bug-report/bug-report-text-export");
const workspace = require("../src/bug-report/technical-report-workspace");
const view = require("../src/ui/technical-report-workspace-view");
const stacks = require("./fixtures/al-call-stacks.json");

const evidence = [{ errorEvidenceId: "error-1", recordingId: "recording-1",
  capturedAt: "2026-08-24T10:00:00Z",
  rawMessage: "Exact BC error! <script>alert(1)</script>",
  rawDiagnostics: "Client Activity ID: activity-sanitized",
  rawCallStack: stacks.standard, diagnosticsStatus: "diagnostics-captured",
  structuredDiagnostics: { clientActivityId: "activity-sanitized" },
  errorScreenshotAssetId: "asset-error" },
{ errorEvidenceId: "error-2", recordingId: "recording-1",
  capturedAt: "2026-08-24T10:00:02Z", rawMessage: "Second exact error.",
  rawDiagnostics: "", rawCallStack: "",
  diagnosticsStatus: "diagnostics-unavailable" }];
const technicalDiagnostics = evidence.map(item => technical.derive(item));
const report = model.normalize({ schemaVersion: 1, bugReportId: "bug-report:1",
  recordingId: "recording-1", status: "draft",
  createdAt: evidence[0].capturedAt, updatedAt: evidence[0].capturedAt,
  summary: { title: "Posting fails", summary: "Posting cannot complete.",
    severity: "high", category: "technical" },
  environment: { businessCentral: { environment: "Sandbox" },
    browser: { name: "Edge", version: "test" }, productVersion: "4.6.0" },
  reproduction: { steps: [{ reproductionStepId: "step-1", order: 1,
    instruction: "Select Post.", failurePoint: true, outcome: "error",
    stepOverride: { fields: {
      instruction: "Select Post and wait." } }, source: { recordingId: "recording-1",
      sourceCanonicalEventIds: ["event-1"], sourceStepId: "task-1",
      screenshotAssetIds: ["asset-step"] } }] },
  expectedResult: { text: "The order is posted." },
  actualResult: { human: { text: "Posting stops." },
    capturedErrorRefs: ["error-1", "error-2"] },
  businessCentralError: { primaryErrorEvidenceId: null,
    errorEvidenceIds: ["error-1", "error-2"] },
  diagnostics: { rawEvidenceRefs: ["error-1", "error-2"] },
  callStack: { rawEvidenceRef: "error-1", frames: technicalDiagnostics[0]
    .callStack.frames, parsed: true }, technicalDiagnostics,
  evidence: { screenshots: [{ assetId: "asset-step", role: "reproduction" },
    { assetId: "asset-error", role: "error" }], diagnosticRefs: ["error-1"],
    attachmentRefs: [] }, notes: [{ noteId: "note-1", text: "Sandbox only." }],
  annotations: [{ annotationId: "annotation-1", screenshotRef: "asset-step" }],
  traceability: { canonicalEventIds: ["event-1"], sourceStepIds: ["task-1"],
    screenshotAssetIds: ["asset-step", "asset-error"] } });

const before = JSON.stringify(report);
const document = generator.project(report, { errorEvidence: evidence });
assert.strictEqual(JSON.stringify(report), before, "projection must be immutable");
assert.deepStrictEqual(document.sectionOrder, generator.SECTION_ORDER);
assert.deepStrictEqual(document.sections.map(section => section.id),
generator.SECTION_ORDER);
assert.strictEqual(document.title, "Posting fails");
assert.strictEqual(document.sections.find(section => section.id === "reproduction")
  .content[0].instruction, "Select Post and wait.");
const errors = document.sections.find(section => section.id === "bc-errors").content;
assert.strictEqual(errors.primary, null, "multiple errors require manual primary selection");
assert.strictEqual(errors.additional.length, 2);
assert.strictEqual(document.sections.find(section => section.id === "actual-result")
  .content.capturedErrors[0].rawMessage, evidence[0].rawMessage);
const callStack = document.sections.find(section => section.id === "al-call-stack")
  .content[0];
assert.strictEqual(callStack.frames[0].objectId, 80);
assert.strictEqual(callStack.rawCallStack, stacks.standard);
assert.strictEqual(document.sections.find(section => section.id === "affected-objects")
  .content.objects[0].objectName, "Sales-Post");
assert.strictEqual(document.completeness.ready, true);

const fallback = generator.project(model.normalize({ ...report,
  summary: { title: "", summary: "", severity: "", category: "" },
  expectedResult: { text: "" } }), { errorEvidence: [evidence[0]] });
assert.strictEqual(fallback.title, "Business Central error during recorded process");
assert.strictEqual(fallback.sections[0].content.summary, evidence[0].rawMessage);
assert(fallback.completeness.issues.some(item => item.code === "missing-title"));
assert(fallback.completeness.issues.some(item =>
  item.code === "missing-expected-result"));
assert.strictEqual(completeness.evaluate(report, [{ ...evidence[0],
  rawDiagnostics: "", diagnosticsStatus: "diagnostics-capture-failed" }]).ready,
true, "missing BC diagnostics must not block readiness");

const markdown = exporter.markdown(document);
assert(markdown.includes("# Posting fails"));
assert(markdown.includes("Exact BC error! <script>alert(1)</script>"));
assert(markdown.includes("Codeunit 80"));
assert.strictEqual(exporter.markdown(document), markdown);
assert(exporter.plainText(document).includes("Steps to Reproduce"));
assert(markdown.includes("productVersion: 4.6.0"));
const swedishReport = model.normalize({ ...report, documentLanguage: "sv-SE" });
const swedishDocument = generator.project(swedishReport, { errorEvidence: evidence });
assert.strictEqual(swedishDocument.documentLanguage, "sv-SE");
assert.strictEqual(swedishDocument.sections[0].title, "Sammanfattning");
const swedishMarkdown = exporter.markdown(swedishDocument);
assert(swedishMarkdown.includes("## Steg för att återskapa"));
assert(swedishMarkdown.includes("## Application Insights-telemetri"));
assert(swedishMarkdown.includes("Inte konfigurerad eller inte hämtad."));
assert(swedishDocument.sections.find(section =>
  section.id === "technical-diagnostics").content.rows.some(row =>
  row.label === "Klientaktivitets-ID"));

const memory = { saved: null };
const controller = workspace.create({ report, errorEvidence: evidence,
  store: { async save(value) { memory.saved = model.normalize(value);
    return memory.saved; } } });
controller.edit({ summary: { title: "Edited title" },
  expectedResult: "Edited expected result", actualResult: "Edited actual result",
  notes: [{ noteId: "note-2", text: "Edited note" }] },
"2026-08-24T11:00:00Z");
assert.strictEqual(controller.state().saveState, "unsaved");
controller.selectPrimaryError("error-2", "2026-08-24T11:01:00Z");
assert.strictEqual(controller.state().report.businessCentralError
  .primaryErrorEvidenceId, "error-2");
controller.undo();
assert.strictEqual(controller.state().report.businessCentralError
  .primaryErrorEvidenceId, null);
controller.redo();

class Element {
  constructor(tag) { this.tagName = tag; this.children = []; this.dataset = {};
    this.attributes = {}; this.textContent = ""; this.listeners = {}; this.value = ""; }
  appendChild(child) { this.children.push(child); return child; }
  append(...children) { children.forEach(child => this.appendChild(child)); }
  replaceChildren(...children) { this.children = []; this.append(...children); }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  addEventListener(name, listener) { this.listeners[name] = listener; }
}
const fakeDocument = { createElement: tag => new Element(tag) };
const container = new Element("main");
const copied = [];
const rendered = view.render(container, controller.state(), {
  onCopy: value => copied.push(value), mediaAssets: {
    "asset-error": { source: "data:image/png;base64,AA==" }
  }
}, fakeDocument);
assert.strictEqual(rendered.sectionCount, generator.SECTION_ORDER.length);
assert.strictEqual(container.attributes["aria-label"],
  "Technical Bug Report: Edited title");
const allElements = node => [node, ...node.children.flatMap(allElements)];
assert(allElements(container).some(item => item.tagName === "details"));
assert(allElements(container).some(item => item.tagName === "table"));
const coreFields = allElements(container).find(item =>
  item.className === "report-core-fields");
const moreFields = allElements(container).find(item =>
  item.className === "report-more-fields");
assert(!allElements(coreFields).some(item =>
  item.id === "technical-report-summary"));
assert(!allElements(coreFields).some(item =>
  item.id === "technical-report-actualResult"));
assert(allElements(moreFields).some(item =>
  item.id === "technical-report-summary"));
assert(allElements(moreFields).some(item =>
  item.id === "technical-report-actualResult"));
assert(allElements(container).some(item => item.className === "failure-point"));
assert(allElements(container).some(item => item.textContent ===
  " — Error occurred here"));
assert.strictEqual(allElements(container).filter(item =>
  item.className === "primary-evidence").length, 1);
const additionalEvidence = allElements(container).find(item =>
  item.className === "additional-evidence");
assert(additionalEvidence);
assert.strictEqual(additionalEvidence.open, undefined,
  "supporting screenshots must be collapsed by default");
const incompleteContainer = new Element("main");
view.render(incompleteContainer, { ...controller.state(), document: fallback },
  {}, fakeDocument);
const incompleteText = allElements(incompleteContainer).map(item =>
  item.textContent);
assert(incompleteText.includes("Add a report title."));
assert(!incompleteText.includes("Add the expected result."),
  "recommended technical and quality guidance stays out of the default view");
assert(!fs.readFileSync("src/ui/technical-report-workspace-view.js", "utf8")
  .includes("innerHTML"));
assert(fs.readFileSync("src/recorder/background.js", "utf8")
  .includes("T9_OPEN_TECHNICAL_REPORT"));

(async () => {
  await controller.save();
  assert.strictEqual(memory.saved.summary.title, "Edited title");
  assert.strictEqual(controller.state().saveState, "saved");
  let releaseSave;
  const concurrent = workspace.create({ report, errorEvidence: evidence,
    store: { save(snapshot) { return new Promise(resolve => {
      releaseSave = () => resolve(snapshot);
    }); } } });
  concurrent.edit({ summary: { title: "First edit" } });
  const pendingSave = concurrent.save();
  concurrent.edit({ summary: { title: "Newer edit" } });
  releaseSave(); await pendingSave;
  assert.strictEqual(concurrent.state().report.summary.title, "Newer edit",
    "a completed autosave must not overwrite a newer edit");
  assert.strictEqual(concurrent.state().saveState, "unsaved");
  assert((await controller.exportMarkdown()).includes("Edited title"));
  const source = ["bug-report-generator.js", "bug-report-text-export.js",
    "bug-report-completeness.js"].map(file => fs.readFileSync(
      `src/bug-report/${file}`, "utf8")).join("\n");
  for (const forbidden of ["chrome.", "globalThis.document", "docx", "fetch(", "OpenAI",
    "ApplicationInsights"]) assert(!source.includes(forbidden));
  console.log("Bug Report Generator and Technical Report Workspace tests passed.");
})().catch(error => { console.error(error); process.exitCode = 1; });
