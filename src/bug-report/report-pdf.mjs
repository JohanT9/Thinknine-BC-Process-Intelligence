import { PDFDocument, StandardFonts, rgb, PDFString } from "pdf-lib";
import JSZip from "jszip";

const plain = value => String(value || "").replace(/\*\*/gu, "").trim();
export function project(pkg) {
  const sv = pkg.documentLanguage !== "en-US";
  const errors = [pkg.errorEvidence?.primary, ...(pkg.errorEvidence?.additional || [])].filter(Boolean);
  const bc = { ...(pkg.environment?.businessCentral || {}) };
  if (!plain(bc.company)) {
    const primary = pkg.errorEvidence?.primary;
    bc.company = plain(primary?.structuredDiagnostics?.company);
    if (!bc.company && primary?.supportUrl) {
      try {
        const url = new URL(primary.supportUrl);
        if (url.protocol === "https:" && url.hostname === "businesscentral.dynamics.com" &&
            !url.username && !url.password) bc.company = plain(url.searchParams.get("company"));
      } catch { /* No captured company: do not guess from current settings. */ }
    }
  }
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
    ...errors.map(error => error.rawMessage)
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
    company: bc.company || "", environment: bc.environment || "", severity: plain(pkg.summary?.severity), sections, links, sv, trigger,
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
  function wrapped(text, size, font, maxWidth = usable) {
    const result = [];
    for (const paragraph of safe(text).replace(/\r/gu, "").split("\n")) {
      let line = "";
      for (const char of paragraph) {
        if (font.widthOfTextAtSize(line + char, size) > maxWidth) {
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
  const measure = (value, size = 11, font = regular, maxWidth = usable) =>
    wrapped(value, size, font, maxWidth).length * (size + 5) + 7;
  function informationCard() {
    const fields = [[model.sv ? "FÖRETAG" : "COMPANY", model.company],
      [model.sv ? "MILJÖ" : "ENVIRONMENT", model.environment],
      [model.sv ? "TIDPUNKT" : "TIMESTAMP", model.date && String(model.date).replace("T", " ").replace(/Z$/u, " UTC")]]
      .filter(([, value]) => value);
    if (!fields.length) return;
    const column = usable / fields.length;
    const lines = fields.map(([, value]) => wrapped(value, 9, regular, column - 24));
    const cardHeight = Math.max(...lines.map(value => value.length)) * 14 + 34;
    ensure(cardHeight + 12);
    page.drawRectangle({ x: margin, y: y - cardHeight + 10, width: usable, height: cardHeight,
      color: surface, borderColor: lineColor, borderWidth: .6 });
    fields.forEach(([label], index) => {
      const x = margin + index * column + 12;
      page.drawText(label, { x, y: y - 5, size: 8, font: bold, color: teal });
      lines[index].forEach((line, lineIndex) => page.drawText(line,
        { x, y: y - 23 - lineIndex * 14, size: 9, font: regular, color: ink }));
    });
    y -= cardHeight + 8;
  }
  function processStep(step) {
    const failed = step.number === model.trigger?.number;
    const color = failed ? rgb(.68, .13, .11) : teal;
    const content = step.instruction + (failed ? (model.sv ? " - Felet inträffade här" : " - Error occurred here") : "");
    const lines = wrapped(content, 11, regular, usable - 34);
    const blockHeight = lines.length * 16 + 12;
    ensure(Math.min(blockHeight, height - 132));
    page.drawCircle({ x: margin + 10, y: y + 3, size: 10, color });
    const number = String(step.number);
    const numberSize = number.length > 2 ? 7 : 9;
    page.drawText(number, { x: margin + 10 - bold.widthOfTextAtSize(number, numberSize) / 2,
      y, size: numberSize, font: bold, color: rgb(1, 1, 1) });
    for (const line of lines) {
      ensure(17); page.drawText(line, { x: margin + 32, y, size: 11, font: regular, color: failed ? color : ink });
      y -= 16;
    }
    y -= 12;
  }
  function imageCaption(attachment, lead = false) {
    const equivalents = attachments.filter(image => image.dataUrl === attachment.dataUrl);
    const refs = model.steps.filter(step => equivalents.some(image =>
      (step.id && step.id === image.sourceRef) || (image.assetId && step.assets.includes(image.assetId))));
    if (lead && model.trigger && !refs.some(step => step.number === model.trigger.number)) refs.push(model.trigger);
    return refs.length ? refs.map(step => `${model.sv ? "Steg" : "Step"} ${step.number}: ${step.instruction}`).join("\n")
      : lead ? (model.sv ? "Slutlig felbild från inspelningen." : "Final captured error screenshot.")
        : (model.sv ? "Skärmbild från inspelningen." : "Recorded screenshot.");
  }
  function directLinks() {
    for (const url of model.links) {
      const label = model.sv ? "Öppna i Business Central (länk)" : "Open in Business Central (link)";
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
  y -= 10;
  informationCard();
  if (model.severity) text(`${model.sv ? "Allvarlighetsgrad" : "Severity"}: ${model.severity}`, 11, bold, teal);
  y -= 6;
  directLinks();
  y -= 10;
  if (leadImage) {
    heading(model.sv ? "Felbild" : "Error screenshot");
    const caption = imageCaption(leadImage, true);
    await screenshot(leadImage, Math.max(20, Math.min(300, y - 80 - measure(caption, 9))));
    text(caption, 9, regular, muted);
    y -= 8;
  }
  if (model.trigger) {
    text(`${model.sv ? "Felet inträffade vid steg" : "Error occurred at step"} ${model.trigger.number}: ${model.trigger.instruction}`, 11, bold);
    y -= 16;
  }
  // Company/environment are already shown in the summary card; retain only page context here.
  const displayedSections = model.sections.map(section => section.id === "environment"
    ? { ...section, rows: section.rows.filter(row => /^(?:BC-sida|BC page):/u.test(row)) } : section)
    .filter(section => section.rows.length);
  const sectionHeight = section => 34 + (section.id === "reproduction"
    ? model.steps.reduce((total, step) => total + measure(step.instruction +
      (step.number === model.trigger?.number ? " - Felet inträffade här" : ""), 11, regular, usable - 34) + 5, 0)
    : section.rows.reduce((total, row) => total + measure(row), 0));
  for (const section of displayedSections) {
    // Reproduction is a separate chapter, never squeezed onto the cover page.
    if (section.id === "reproduction") newPage();
    if (section.id === "diagnostics") {
      const technicalHeight = displayedSections.filter(item => ["diagnostics", "callStack"].includes(item.id))
        .reduce((total, item) => total + sectionHeight(item), 0);
      if (technicalHeight <= height - 132) ensure(technicalHeight);
    }
    const blockHeight = sectionHeight(section);
    if (blockHeight <= height - 132) ensure(blockHeight);
    heading(section.title);
    if (section.id === "reproduction") model.steps.forEach(processStep);
    else for (const row of section.rows) {
      text(row, section.id === "actual" ? 12 : 11, regular, section.id === "actual" ? rgb(.65, .12, .10) : ink);
      if (section.id === "actual") y -= 8;
    }
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
    const caption = imageCaption(attachment);
    await screenshot(attachment, Math.max(20, y - 65 - measure(caption, 9)));
    text(caption, 9, regular, muted);
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
