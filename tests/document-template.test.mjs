// Document templates (src/document/document-template.js): the model, how a template of the
// user's own reaches the document plan, Word and the preview, and how templates are stored.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import JSZip from "jszip";
import "../src/exporters/word-exporter-docx.mjs";

const require = createRequire(import.meta.url);
const model = require("../src/document/document-template.js");
const pipeline = require("../src/exporters/word-export-pipeline.js");
const workspace = require("../src/document/document-workspace.js");
const keys = require("../src/engine/storage-keys.js");

const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const NOW = "2026-11-12T10:00:00.000Z";

// The model.
assert.deepEqual(model.BUILT_IN.map(item => item.templateId), ["thinknine", "minimal", "corporate"]);
assert.equal(model.builtIn("minimal").builtIn, true);
assert.equal(model.builtIn("unknown"), null);
assert.throws(() => model.normalize({ templateId: "thinknine" }), TypeError,
  "a template of the user's own cannot take a built-in id");
assert.throws(() => model.normalize({ templateId: "later", schemaVersion: 2 }),
  error => error.code === "unsupported-template");
const kept = model.normalize({ templateId: "own", name: "Own", futureField: { a: 1 },
  color: "not a colour", font: "Comic Sans", logo: { dataUrl: "data:image/gif;base64,AA==", width: 1, height: 1 } });
assert.deepEqual(kept.futureField, { a: 1 }, "fields of a later version are kept");
assert.equal(kept.color, model.builtIn("thinknine").color);
assert.equal(kept.font, model.builtIn("thinknine").font);
assert.equal(kept.logo, null, "only a PNG logo is kept");

const own = model.create(model.builtIn("corporate"), { templateId: "acme", name: "Acme", now: NOW });
assert.equal(own.baseThemeId, "corporate");
assert.equal(own.color, model.builtIn("corporate").color);
assert.equal(own.createdAt, NOW);
const copy = model.create(own, { templateId: "acme-copy", name: "Acme (copy)", now: NOW });
assert.equal(copy.templateId, "acme-copy");
assert.equal(copy.baseThemeId, "corporate");

const edited = model.update(own, { company: "Acme AB", color: "#FFCC00", font: "Georgia",
  footer: "{dokument} · {datum} · {sida}", logo: { dataUrl: PNG, width: 1, height: 1 },
  templateId: "other", baseThemeId: "minimal" }, "2026-11-12T11:00:00.000Z");
assert.equal(edited.templateId, "acme", "the id cannot be edited");
assert.equal(edited.baseThemeId, "corporate", "the base theme cannot be edited");
assert.equal(edited.color, "#ffcc00");
assert.equal(edited.updatedAt, "2026-11-12T11:00:00.000Z");
assert.equal(edited.logo.dataUrl, PNG);

// Footer fields in the user's own language, and the page number kept for the renderer.
assert.equal(model.footerText("{dokument} · {datum} · {sida}", { document: "Order", date: "2026-11-12" }),
  "Order · 2026-11-12 · {page}");
assert.equal(model.footerText("{asiakirja} {päivämäärä} {sivu} {unknown}", { document: "A", date: "B" }),
  "A B {page} {unknown}");
assert.deepEqual(model.footerParts("Page {page} of", 3),
  [{ text: "Page " }, { page: true, text: "3" }, { text: " of" }]);

// A colour hard to read on white is darkened for text; a readable one is kept.
assert.ok(model.contrastOnWhite(model.readableColor("#ffcc00")) >= 4.5);
assert.equal(model.readableColor("#17365d"), "#17365d");

// A document names its template; one that is not here gets the default template.
assert.equal(model.resolve([own], "acme").templateId, "acme");
assert.equal(model.resolve([own], "minimal").templateId, "minimal");
assert.equal(model.resolve([own], "removed", "acme").templateId, "acme");
assert.equal(model.resolve([], "removed", "removed-too").templateId, "thinknine");

// Storage: one entry per template; an unreadable one is reported and left as it is.
function fakeStorage(initial = {}, { listKeys = true } = {}) {
  const data = { ...initial };
  const storage = {
    data,
    reads: [],
    async get(names) {
      storage.reads.push(names);
      if (names === null) return { ...data };
      const list = Array.isArray(names) ? names : [names];
      return Object.fromEntries(list.filter(name => name in data).map(name => [name, data[name]]));
    },
    async set(values) { Object.assign(data, values); },
    async remove(name) { delete data[name]; }
  };
  if (listKeys) storage.getKeys = async () => Object.keys(data);
  return storage;
}
const storage = fakeStorage({
  [keys.DOCUMENT_TEMPLATE_PREFIX + "later"]: { templateId: "later", schemaVersion: 9 },
  t9_recording_large: { events: new Array(3).fill("x") }
});
await model.save(storage, keys, edited);
const listed = await model.list(storage, keys);
assert.deepEqual(listed.templates.map(item => item.templateId), ["acme"]);
assert.deepEqual(listed.unreadable, [{ key: keys.DOCUMENT_TEMPLATE_PREFIX + "later", code: "unsupported-template" }]);
assert.ok(storage.data[keys.DOCUMENT_TEMPLATE_PREFIX + "later"], "an unreadable template is not removed");
assert.ok(!storage.reads.includes(null), "only the template entries are read");
const withoutKeys = fakeStorage(storage.data, { listKeys: false });
assert.equal((await model.list(withoutKeys, keys)).templates.length, 1);

assert.equal(await model.defaultTemplateId(storage, keys, listed.templates), "thinknine");
await model.setDefault(storage, keys, "acme");
assert.equal(await model.defaultTemplateId(storage, keys, listed.templates), "acme");
assert.equal(await model.defaultTemplateId(storage, keys, []), "thinknine",
  "a default template that is not here is not used");
await assert.rejects(model.remove(storage, keys, "minimal"), TypeError);
await model.remove(storage, keys, "acme");
assert.equal((await model.list(storage, keys)).templates.length, 0);

// The document: a template of the user's own gives Word and the preview its header, footer,
// cover and logo, without changing the content.
const session = { id: "template-session", name: "Create purchase order", startedAt: NOW };
const review = { sessionId: session.id, sessionName: session.name,
  tasks: [{ taskId: "step-1", instruction: "Choose a vendor." }] };
const original = JSON.stringify(review);
const prepared = pipeline.create({ session, review, template: edited, now: NOW, documentLanguage: "sv-SE" });
assert.equal(JSON.stringify(review), original, "the template does not change the review");
const header = prepared.plan.components.find(component => component.kind === "header");
const footer = prepared.plan.components.find(component => component.kind === "footer");
assert.equal(header.appearance.branding.templateId, "acme");
assert.equal(header.appearance.branding.organizationName, "Acme AB");
assert.equal(header.appearance.branding.logo, model.LOGO_ASSET_ID);
assert.match(footer.content.text, /^Create purchase order · .+ · \{page\}$/u);
assert.ok(pipeline.requiredMediaAssetIds(prepared.plan).includes(model.LOGO_ASSET_ID));
assert.equal(prepared.template.templateId, "acme");
assert.throws(() => pipeline.validateMedia(prepared.plan, {}), "the logo is required media");

const plain = pipeline.create({ session, review, template: model.builtIn("minimal"), now: NOW });
const plainHeader = plain.plan.components.find(component => component.kind === "header");
assert.ok(!plainHeader?.appearance?.branding?.templateId, "a built-in template keeps its own look");
assert.ok(!pipeline.requiredMediaAssetIds(plain.plan).includes(model.LOGO_ASSET_ID));

const logo = model.logoMedia(edited);
const output = await globalThis.T9Export.word.renderPlan({ plan: prepared.plan,
  mediaAssets: { [model.LOGO_ASSET_ID]: { bytes: logo.bytes, mimeType: logo.mimeType } } });
const zip = await JSZip.loadAsync(await output.blob.arrayBuffer());
const files = Object.keys(zip.files);
const headerXml = await zip.file(files.find(name => /^word\/header\d*\.xml$/u.test(name))).async("string");
const footerXml = await zip.file(files.find(name => /^word\/footer\d*\.xml$/u.test(name))).async("string");
const documentXml = await zip.file("word/document.xml").async("string");
assert.ok(headerXml.includes("Acme AB"), "the header names the company");
assert.ok(headerXml.includes("<w:drawing"), "the header shows the logo");
assert.ok(headerXml.includes("Create purchase order"), "the header names the document");
assert.ok(footerXml.includes("PAGE"), "the footer has the page number");
assert.ok(footerXml.includes("Create purchase order · "), "the footer has the template's text");
assert.ok(!footerXml.includes("{page}"));
assert.ok(documentXml.includes("Acme AB"), "the cover names the company");
assert.ok(documentXml.includes("<w:drawing"), "the cover shows the logo");
assert.ok(documentXml.includes("Georgia"), "the template's font is used");
assert.ok(files.some(name => name.startsWith("word/media/")), "the logo is embedded");

const view = workspace.render(prepared.plan);
assert.equal(view.pageHeader.company, "Acme AB");
assert.equal(view.pageHeader.logoAssetId, model.LOGO_ASSET_ID);
assert.match(view.pageFooter.text, /· 1$/u, "the preview shows page 1");
const brand = view.sections.flatMap(section => section.items).find(item => item.kind === "brand");
assert.deepEqual(brand.content, { logoAssetId: model.LOGO_ASSET_ID, text: "Acme AB" },
  "the preview's cover shows the logo and the company, as Word does");
const coverSection = view.sections.find(section => section.items.includes(brand));
assert.ok(coverSection.items.indexOf(brand) < coverSection.items.findIndex(item => item.kind === "heading"),
  "the logo and company come before the title");
// A copy looks like the template it was made from until it is changed: a copy of BC Process
// Studio keeps the header band and the name on the cover.
const studioCopy = model.create(model.builtIn("thinknine"), { templateId: "studio-copy",
  name: "Studio copy", now: NOW });
const studioBase = pipeline.create({ session, review, template: model.builtIn("thinknine"), now: NOW });
const studioPlan = pipeline.create({ session, review, template: studioCopy, now: NOW });
const planHeader = plan => plan.components.find(component => component.kind === "header");
const planCover = plan => plan.sections.find(section => section.kind === "cover")
  .components.find(component => component.kind === "cover");
assert.equal(planHeader(studioPlan.plan).appearance.fillColor,
  planHeader(studioBase.plan).appearance.fillColor, "an unchanged copy keeps the band colour");
assert.equal(planHeader(studioPlan.plan).appearance.brand, "BC Process Studio");
const planFooter = plan => plan.components.find(component => component.kind === "footer");
assert.equal(planFooter(studioPlan.plan).content.text, planFooter(studioBase.plan).content.text,
  "an empty footer looks as in the template that was copied");
assert.equal(planCover(studioPlan.plan).appearance.brandText, "BC Process Studio",
  "without a company of its own the cover keeps the base template's name");
const studioWord = await globalThis.T9Export.word.renderPlan({ plan: studioPlan.plan, mediaAssets: {} });
const studioZip = await JSZip.loadAsync(await studioWord.blob.arrayBuffer());
const studioHeaderXml = await studioZip.file(Object.keys(studioZip.files)
  .find(name => /^word\/header\d*\.xml$/u.test(name))).async("string");
assert.ok(studioHeaderXml.includes("BC Process Studio  |  Business Central  |  Create purchase order"));
assert.ok(studioHeaderXml.includes(`w:fill="${planHeader(studioBase.plan).appearance.fillColor
  .slice(1).toUpperCase()}"`), "the Word header keeps the band");
const studioView = workspace.render(studioPlan.plan);
assert.equal(studioView.pageHeader.band.fillColor, planHeader(studioBase.plan).appearance.fillColor);
assert.equal(studioView.pageHeader.band.text, "BC Process Studio  |  Business Central  |  Create purchase order");
// Changed: the company replaces the name, and the band takes a dark shade of the new colour
// that white text stays readable on.
const studioChanged = model.update(studioCopy, { company: "Acme AB", color: "#a4262c" }, NOW);
const changedHeader = planHeader(pipeline.create({ session, review, template: studioChanged,
  now: NOW }).plan).appearance;
assert.equal(changedHeader.brand, "Acme AB");
assert.notEqual(changedHeader.fillColor, planHeader(studioBase.plan).appearance.fillColor);
assert.ok(model.contrastOnWhite(changedHeader.fillColor) >= 7, "white text is readable on the band");
// A template made from one without a band keeps the plain header line.
assert.equal(header.appearance.fillColor, "");
assert.equal(view.pageHeader.band, undefined);

const plainView = workspace.render(plain.plan);
assert.equal(plainView.pageHeader, null);
assert.equal(plainView.pageFooter, null);
const noFooter = workspace.render(pipeline.create({ session, review,
  template: model.update(edited, { footer: "" }, NOW), now: NOW }).plan);
assert.match(noFooter.pageFooter.text, /^Create purchase order \| .+ 1$/u,
  "an empty footer shows the document's name and the page number");

// Phase 2: the template's sections and default texts.
assert.deepEqual(model.builtIn("minimal").sections, model.DEFAULT_SECTIONS);
assert.deepEqual(model.normalize({ templateId: "older" }).sections, model.DEFAULT_SECTIONS,
  "a template saved before sections existed shows every section, as before");
const sectioned = model.update(edited, { sections: { toc: true, prerequisites: false,
  revisionHistory: false, workflow: false, unknown: true }, purposeText: "Vårt syfte.",
  expectedResultText: "x".repeat(5000) }, NOW);
assert.equal(sectioned.sections.toc, true);
assert.equal(sectioned.sections.cover, true, "a change to one section keeps the others");
assert.ok(!("workflow" in sectioned.sections) && !("unknown" in sectioned.sections),
  "the workflow is always shown and unknown sections are not stored");
assert.equal(sectioned.expectedResultText.length, model.MAX_TEXT);

const tasks = [{ taskId: "t1", instruction: "Välj leverantör." }, { taskId: "t2", instruction: "Bokför." }];
const fullReview = { sessionId: session.id, sessionName: session.name, tasks };
const kinds = prepared => prepared.plan.sections.map(section => section.kind);
const builtInDocument = pipeline.create({ session, review: fullReview, template: model.builtIn("thinknine"), now: NOW });
const noTemplate = pipeline.create({ session, review: fullReview, now: NOW });
assert.deepEqual(kinds(builtInDocument), kinds(noTemplate), "a built-in template shows the document as before");
assert.deepEqual(kinds(builtInDocument),
  ["cover", "purpose", "prerequisites", "workflow", "expectedResult", "revisionHistory"]);

const arranged = pipeline.create({ session, review: fullReview, template: sectioned, now: NOW,
  purpose: sectioned.purposeText, expectedResult: "Ordern är bokförd.", documentLanguage: "de-DE" });
assert.deepEqual(kinds(arranged), ["cover", "toc", "purpose", "workflow", "expectedResult"]);
assert.equal(arranged.semanticDocument.sections.length, 6,
  "the document keeps every section; the template only leaves them out of the plan");
assert.equal(arranged.semanticDocument.metadata.purpose, "Vårt syfte.",
  "the template's purpose text is used and not translated");
const texts = JSON.stringify(arranged.plan);
assert.ok(texts.includes("Ordern är bokförd."), "the template's expected result is used");
assert.ok(!arranged.qualityDiagnostics.findings?.some(finding =>
  /purpose|revision/iu.test(finding.ruleId || "")), "a section the template leaves out is not reported as missing");
const tocComponent = arranged.plan.sections[1].components[0].components[0];
assert.equal(tocComponent.kind, "toc");
assert.equal(tocComponent.appearance.title, "Inhalt", "the table of contents is titled in the document language");

const ownText = pipeline.create({ session, template: sectioned, now: NOW, purpose: sectioned.purposeText,
  expectedResult: "Mallens text.",
  review: { ...fullReview, documentFields: { expectedResult: "Dokumentets egen text." } } });
assert.ok(JSON.stringify(ownText.plan).includes("Dokumentets egen text."), "a document's own text comes first");
assert.ok(!JSON.stringify(ownText.plan).includes("Mallens text."));
const recordedPurpose = pipeline.create({ session: { ...session, purpose: "Inspelningens syfte." },
  review: fullReview, template: sectioned, purpose: sectioned.purposeText, now: NOW });
assert.equal(recordedPurpose.semanticDocument.metadata.purpose, "Inspelningens syfte.",
  "a purpose given with the recording comes before the template's text");

const noCover = pipeline.create({ session, review: fullReview, now: NOW,
  template: model.update(sectioned, { sections: { cover: false } }, NOW) });
assert.equal(kinds(noCover)[0], "toc", "without a cover the table of contents comes first");

const tocWord = await globalThis.T9Export.word.renderPlan({ plan: arranged.plan,
  mediaAssets: { [model.LOGO_ASSET_ID]: { bytes: logo.bytes, mimeType: logo.mimeType } } });
const tocZip = await JSZip.loadAsync(await tocWord.blob.arrayBuffer());
const tocDocumentXml = await tocZip.file("word/document.xml").async("string");
const tocSettingsXml = await tocZip.file("word/settings.xml").async("string");
assert.ok(/TOC \\/u.test(tocDocumentXml), "Word gets a table of contents field");
assert.ok(tocSettingsXml.includes("updateFields"), "Word fills in the table of contents when it opens the file");
assert.ok(!tocDocumentXml.includes("Änderungsverlauf"), "a section left out is not in the Word file");
const plainSettingsXml = await zip.file("word/settings.xml").async("string");
assert.ok(!plainSettingsXml.includes("updateFields"), "a document without a table of contents opens without a question");

const tocView = workspace.render(arranged.plan);
const tocItem = tocView.sections[1].items[0];
assert.equal(tocItem.kind, "toc");
assert.equal(tocItem.content.title, "Inhalt");
assert.deepEqual(tocItem.content.entries.filter(entry => entry.level === 1).map(entry => entry.text),
  ["Zweck", "Ablauf", "Erwartetes Ergebnis"], "the preview lists the sections shown");
assert.equal(tocItem.content.entries.filter(entry => entry.level === 2).length, 2, "and the steps");

console.log("Document template model, storage, Word and preview tests passed.");
