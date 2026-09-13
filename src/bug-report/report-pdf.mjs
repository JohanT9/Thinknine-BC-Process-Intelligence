import { PDFDocument, StandardFonts, rgb, PDFString } from "pdf-lib";
import JSZip from "jszip";

const plain = value => String(value || "").replace(/\*\*/gu, "").trim();
export function project(pkg) {
  const sv = pkg.documentLanguage !== "en-US";
  const errors = [pkg.errorEvidence?.primary, ...(pkg.errorEvidence?.additional || [])].filter(Boolean);
  const bc = pkg.environment?.businessCentral || {};
  const steps = (pkg.reproduction || []).filter(step => plain(step.instruction));
  const triggerId = pkg.errorEvidence?.primary?.precedingActionEventId;
  const triggerIndex = steps.findIndex(step => triggerId
    ? step.source?.sourceCanonicalEventIds?.includes(triggerId) : step.failurePoint);
  const trigger = triggerIndex >= 0 ? { number: triggerIndex + 1,
    instruction: plain(steps[triggerIndex].instruction) } : null;
  const sections = [];
  const add = (id, title, rows) => { rows = rows.map(plain).filter(Boolean);
    if (rows.length) sections.push({ id, title, rows }); };
  add("actual", sv ? "Faktiskt resultat" : "Actual result", [...new Set([
    pkg.actualResult?.userDescription, ...errors.map(error => error.rawMessage)
  ].filter(Boolean))]);
  add("expected", sv ? "Förväntat resultat" : "Expected result", [pkg.expectedResult]);
  add("reproduction", sv ? "Steg för att återskapa" : "Steps to reproduce",
    steps.map((step, index) => `${index + 1}. ${plain(step.instruction)}${index === triggerIndex
      ? (sv ? " - Felet inträffade här" : " - Error occurred here") : ""}`));
  add("environment", sv ? "Miljö" : "Environment", [
    bc.environment && `${sv ? "Miljö" : "Environment"}: ${bc.environment}`,
    bc.company && `${sv ? "Företag" : "Company"}: ${bc.company}`,
    bc.pageId && `${sv ? "BC-sida" : "BC page"}: ${bc.pageId}`
  ]);
  const diagnosticLabels = {
    timestamp: sv ? "Tidpunkt" : "Timestamp",
    internalSessionId: sv ? "BC:s interna sessions-ID" : "BC internal session ID",
    applicationInsightsSessionId: sv ? "Application Insights sessions-ID" : "Application Insights session ID",
    clientActivityId: sv ? "Klientaktivitets-ID" : "Client activity ID",
    serverInstanceId: sv ? "Serverinstans-ID" : "Server instance ID"
  };
  const capturedRows = errors.flatMap(error => Object.entries(error.structuredDiagnostics || {})
    .filter(([key, value]) => diagnosticLabels[key] && plain(value))
    .map(([key, value]) => `${diagnosticLabels[key]}: ${plain(value)}`));
  const existingRows = (pkg.diagnostics?.rows || []).filter(row => plain(row.label) && plain(row.value))
    .map(row => `${row.label}: ${plain(row.value)}`);
  add("diagnostics", sv ? "Teknisk diagnostik" : "Technical diagnostics",
    [...new Set(capturedRows.length ? capturedRows : existingRows)]);
  const stacks = (pkg.inclusion?.callStack === false ? [] : pkg.callStack || []).map(stack => stack.rawCallStack ||
    (stack.frames || []).map(frame => [frame.objectType, frame.objectId, frame.objectName,
      frame.methodName, frame.sourceLine].filter(Boolean).join(" ")).join("\n"));
  // Respect an explicit export exclusion; older packages can use captured evidence.
  if (pkg.inclusion?.callStack !== false) stacks.push(...errors.map(error => error.rawCallStack));
  add("callStack", sv ? "AL-anropsstack (AL Call Stack)" : "AL Call Stack",
    [...new Set(stacks.filter(value => plain(value)))]);
  const links = [...new Set(errors.map(error => error.supportUrl).filter(url => {
    try { const parsed = new URL(url); return parsed.protocol === "https:" && !parsed.username &&
      !parsed.password && (parsed.hostname === "businesscentral.dynamics.com" ||
      parsed.hostname.endsWith(".businesscentral.dynamics.com")); } catch { return false; }
  }))];
  return { title: plain(pkg.title), date: pkg.errorEvidence?.primary?.capturedAt || pkg.sourceUpdatedAt || pkg.generatedAt,
    company: bc.company || "", environment: bc.environment || "", sections, links, sv, trigger,
    steps: steps.map((step, index) => ({ number: index + 1, instruction: plain(step.instruction),
      id: step.reproductionStepId, assets: step.screenshotAssetIds || step.source?.screenshotAssetIds || [] })) };
}

export function base64(bytes) {
  if (typeof Buffer !== "undefined") return Buffer.from(bytes).toString("base64");
  let text = "";
  for (let i = 0; i < bytes.length; i += 8192) text += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(text);
}

export async function create(pkg, attachments = []) {
  const model = project(pkg);
  const doc = await PDFDocument.create();
  doc.setTitle(model.title); doc.setProducer("BC Process Studio");
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const width = 595.28, height = 841.89, margin = 44, usable = width - 2 * margin;
  const ink = rgb(.09, .17, .27), teal = rgb(0, .48, .51), muted = rgb(.35, .40, .45);
  const surface = rgb(.94, .97, .97), lineColor = rgb(.80, .87, .88);
  let page, y;
  const safe = text => Array.from(String(text)).map(char => {
    if (char === "\t") return "  ";
    if (char === "\n" || char === "\r") return char;
    try { regular.encodeText(char); return char; } catch { return `[U+${char.codePointAt(0).toString(16).toUpperCase()}]`; }
  }).join("");
  function newPage() {
    page = doc.addPage([width, height]); y = height - 76;
    page.drawRectangle({ x: 0, y: height - 49, width, height: 49, color: rgb(.02, .28, .31) });
    page.drawText("BC Process Studio", { x: margin, y: height - 30, size: 12, font: bold, color: rgb(1, 1, 1) });
    page.drawText(model.sv ? "Business Central | Felrapport" : "Business Central | Error report",
      { x: width - margin - 175, y: height - 29, size: 9, font: regular, color: rgb(.79, .94, .94) });
  }
  const ensure = space => { if (!page || y - space < 56) newPage(); };
  function wrapped(text, size, font) {
    const result = [];
    for (const paragraph of safe(text).replace(/\r/gu, "").split("\n")) {
      let line = "";
      for (const char of paragraph) {
        if (font.widthOfTextAtSize(line + char, size) > usable) {
          const space = line.lastIndexOf(" ");
          if (space > 0) { result.push(line.slice(0, space)); line = line.slice(space + 1); }
          else { result.push(line); line = ""; }
        }
        line += char;
      }
      result.push(line);
    }
    return result;
  }
  function text(value, size = 11, font = regular, color = ink) {
    for (const line of wrapped(value, size, font)) {
      ensure(size + 6); page.drawText(line, { x: margin, y, size, font, color }); y -= size + 5;
    }
    y -= 7;
  }
  function heading(title) {
    ensure(58); y -= 5;
    page.drawRectangle({ x: margin - 8, y: y - 9, width: usable + 16, height: 29, color: surface });
    page.drawRectangle({ x: margin - 8, y: y - 9, width: 3, height: 29, color: teal });
    text(title, 13, bold, teal); y -= 4;
  }
  function directLinks() {
    for (const url of model.links) {
      const label = model.sv ? "Öppna i Business Central" : "Open in Business Central";
      ensure(32); const linkY = y; text(label, 11, bold, teal);
      const annotation = doc.context.register(doc.context.obj({ Type: "Annot", Subtype: "Link",
        Rect: [margin, linkY - 3, margin + bold.widthOfTextAtSize(label, 11), linkY + 13],
        Border: [0, 0, 0], A: { Type: "Action", S: "URI", URI: PDFString.of(url) } }));
      page.node.addAnnot(annotation);
    }
  }
  async function screenshot(attachment, maxHeight) {
    try {
      const png = /^data:image\/png;base64,/u.test(attachment.dataUrl);
      const jpg = /^data:image\/jpe?g;base64,/u.test(attachment.dataUrl);
      if (!png && !jpg) throw new Error("Unsupported image");
      const image = png ? await doc.embedPng(attachment.dataUrl) : await doc.embedJpg(attachment.dataUrl);
      const factor = Math.min(usable / image.width, maxHeight / image.height);
      page.drawRectangle({ x: margin - 1, y: y - image.height * factor - 1,
        width: image.width * factor + 2, height: image.height * factor + 2,
        borderColor: lineColor, borderWidth: .6 });
      page.drawImage(image, { x: margin, y: y - image.height * factor,
        width: image.width * factor, height: image.height * factor });
      y -= image.height * factor + 20;
    } catch {
      text(model.sv ? "Skärmbilden kunde inte inkluderas." : "The screenshot could not be included.");
    }
  }
  // The final captured error image is the lead evidence, not an appendix.
  const leadImage = attachments.findLast(image => image.role === "error-evidence" && image.dataUrl);
  newPage(); text(model.title, 20, bold);
  text([model.company, model.environment, model.date].filter(Boolean).join(" · "), 10, regular, muted);
  directLinks();
  if (leadImage) {
    heading(model.sv ? "Felbild" : "Error screenshot");
    await screenshot(leadImage, Math.min(300, y - 110));
  }
  if (model.trigger) text(`${model.sv ? "Felet inträffade vid steg" : "Error occurred at step"} ${model.trigger.number}: ${model.trigger.instruction}`, 11, bold);
  for (const section of model.sections) {
    heading(section.title);
    for (const row of section.rows) text(row, 11, regular, section.id === "actual" ? rgb(.65, .12, .10) : ink);
  }
  const seen = new Set(leadImage ? [leadImage.dataUrl] : []);
  const images = attachments.filter(image => {
    if (!image.dataUrl || seen.has(image.dataUrl)) return false;
    seen.add(image.dataUrl); return true;
  });
  for (const [index, attachment] of images.entries()) {
    if (!attachment.dataUrl) continue;
    newPage(); heading(index === 0 && attachment.role === "error-evidence"
      ? (model.sv ? "Felbild" : "Error screenshot") : `${model.sv ? "Skärmbild" : "Screenshot"} ${index + 1}`);
    const equivalentImages = attachments.filter(image => image.dataUrl === attachment.dataUrl);
    const refs = model.steps.filter(step => equivalentImages.some(image =>
      (step.id && step.id === image.sourceRef) || (image.assetId && step.assets.includes(image.assetId))));
    for (const step of refs) text(`${model.sv ? "Steg" : "Step"} ${step.number}: ${step.instruction}`, 11, bold);
    await screenshot(attachment, y - 65);
  }
  for (const [index, p] of doc.getPages().entries()) {
    p.drawLine({ start: { x: margin, y: 43 }, end: { x: width - margin, y: 43 }, color: lineColor, thickness: .6 });
    p.drawText("BC Process Studio", { x: margin, y: 28, size: 8, font: regular, color: muted });
    p.drawText(`${model.sv ? "Sida" : "Page"} ${index + 1} / ${doc.getPageCount()}`,
      { x: width - margin - 65, y: 28, size: 8, font: regular, color: muted });
  }
  return { bytes: await doc.save(), model, pageCount: doc.getPageCount() };
}

export async function technicalZip(offline) {
  const zip = new JSZip();
  zip.file("felrapport.json", JSON.stringify(offline, null, 2));
  zip.file("felrapport.md", offline.bugReportMarkdown || "");
  for (const [index, image] of (offline.attachments || []).entries()) {
    const match = /^data:image\/(png|jpe?g);base64,([A-Za-z0-9+/=]+)$/u.exec(image.dataUrl || "");
    if (match) zip.file(`bilder/bild-${index + 1}.${match[1] === "png" ? "png" : "jpg"}`, match[2], { base64: true });
  }
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}
globalThis.T9BugReportPdf = { create, project, base64, technicalZip };
