import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import JSZip from "jszip";
import languages from "../src/engine/language-registry.js";
import catalogs from "../src/engine/locale-catalogs.js";
import documentLanguage from "../src/document/document-language.js";
import pipeline from "../src/exporters/word-export-pipeline.js";
import generator from "../src/bug-report/bug-report-generator.js";
import reportModel from "../src/bug-report/bug-report-model.js";
import markdown from "../src/bug-report/issue-package-markdown.js";
import { create as createPdf, project as projectPdf } from "../src/bug-report/report-pdf.mjs";
import "../src/exporters/word-exporter-docx.mjs";

const read = file => fs.readFileSync(new URL("../" + file, import.meta.url), "utf8");
const context = { CustomEvent: class {} };
vm.runInNewContext(read("src/engine/locale-catalogs.js"), context);
vm.runInNewContext(read("src/engine/language-registry.js"), context);
vm.runInNewContext(read("src/ui/i18n.js").replace("  const staticLookup = new Map();",
  "  globalThis.sourceVocabulary = { messages, STATIC_TEXT };\n  const staticLookup = new Map();"), context);
const placeholders = text => [...text.matchAll(/\{\w+\}|\$\d+/g)].map(match => match[0]).sort();
const locales = Object.keys(catalogs);
const expected = {
  "da-DK": { save: "Gem", workflow: "Arbejdsgang", step: "Trin", choose: "Vælg", page: "Side", expected: "Forventet resultat" },
  "fi-FI": { save: "Tallenna", workflow: "Työnkulku", step: "Vaihe", choose: "Valitse", page: "Sivu", expected: "Odotettu tulos" },
  "nb-NO": { save: "Lagre", workflow: "Arbeidsflyt", step: "Trinn", choose: "Velg", page: "Side", expected: "Forventet resultat" },
  "fr-FR": { save: "Enregistrer", workflow: "Déroulement", step: "Étape", choose: "Sélectionnez", page: "Page", expected: "Résultat attendu" },
  "de-DE": { save: "Speichern", workflow: "Ablauf", step: "Schritt", choose: "Wählen Sie", page: "Seite", expected: "Erwartetes Ergebnis" },
  "es-ES": { save: "Guardar", workflow: "Flujo de trabajo", step: "Paso", choose: "Seleccione", page: "Página", expected: "Resultado esperado" }
};
for (const locale of locales) {
  const catalog = catalogs[locale];
  assert.deepEqual(Object.keys(catalog).sort(), Object.keys(catalogs["fr-FR"]).sort(), locale + " complete shared vocabulary");
  for (const [source, value] of Object.entries(catalog)) {
    assert.ok(value.trim(), locale + ": empty " + source);
    assert.deepEqual(placeholders(value), placeholders(source), locale + ": placeholders " + source);
  }
  for (const source of [...Object.values(context.sourceVocabulary.messages["en-US"]),
    ...context.sourceVocabulary.STATIC_TEXT.map(pair => pair[1])]) {
    assert.ok(catalog[source], `${locale}: missing ${source}`);
    assert.deepEqual(placeholders(catalog[source]), placeholders(source), `${locale}: placeholders in ${source}`);
  }
  assert.equal(context.T9UiI18n.translateStaticText("Spara", locale), expected[locale].save);
  assert.equal(context.T9UiI18n.format("review.imageNumber", { number: 17 }, locale).includes("17"), true);
  assert.equal(languages.normalize(locale.split("-")[0]), locale);
  assert.equal(languages.normalize(locale.split("-")[0] + "-CA"), locale);
  assert.equal(documentLanguage.translateInstruction("Välj Förs.order.", locale), `${expected[locale].choose} Förs.order.`);
  const source = { schemaVersion: 1, documentId: "localized", metadata: { title: "Customer title" }, assets: [],
    sections: [{ sectionId: "workflow", kind: "workflow", title: "Arbetsgång", blocks: [
      { blockId: "manual", kind: "paragraph", text: "Välj min egen text.", preserveUserText: true, provenance: "manual" },
      { blockId: "generated", kind: "paragraph", text: "Välj Förs.order." }
    ] }] };
  const before = JSON.stringify(source);
  const translated = documentLanguage.process(source, locale);
  assert.equal(JSON.stringify(source), before);
  assert.equal(translated.metadata.title, "Customer title");
  assert.equal(translated.sections[0].title, expected[locale].workflow);
  assert.equal(translated.sections[0].blocks[0].text, "Välj min egen text.");
  const session = { id: "new-language", name: "Customer title", startedAt: "2026-09-20T10:00:00Z",
    settings: { documentLanguage: locale } };
  const review = { sessionId: session.id, tasks: [{ taskId: "step-1", title: "Välj Förs.order.",
    instruction: "Välj Förs.order.", actionType: "click", screenshotIds: [] }] };
  const prepared = pipeline.create({ session, review });
  assert.equal(prepared.semanticDocument.metadata.documentLanguage, locale);
  assert.equal(prepared.plan.components.find(item => item.kind === "footer").content.pageLabel, expected[locale].page);
  const { blob } = await globalThis.T9Export.word.renderPlan({ plan: prepared.plan, mediaAssets: {} });
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  const xml = await zip.file("word/document.xml").async("string");
  assert.ok(xml.includes(expected[locale].workflow), locale + " Word workflow heading");
  assert.ok(xml.includes(expected[locale].step), locale + " Word step label");
  const report = reportModel.normalize({ bugReportId: "report", recordingId: "recording", documentLanguage: locale,
    summary: { title: "Original title" }, reproduction: { steps: [] } });
  const projection = generator.project(report);
  assert.equal(projection.sections.find(section => section.id === "expected-result").title, expected[locale].expected);
  const pkg = { title: "Original title", documentLanguage: locale, expectedResult: "Customer text",
    reproduction: [{ instruction: "Välj Förs.order." }], errorEvidence: { primary: { rawMessage: "Original error" } },
    notes: [], environment: {}, inclusion: { technicalDetails: false }, callStack: [], diagnostics: { rows: [] } };
  assert.ok(markdown.markdown(pkg).includes(expected[locale].expected));
  const pdfModel = projectPdf(pkg);
  assert.equal(pdfModel.sections.find(section => section.id === "expected").title, expected[locale].expected);
  assert.equal(pdfModel.steps[0].instruction, "Välj Förs.order.");
  const pdf = await createPdf(pkg);
  assert.ok(pdf.bytes.byteLength > 1000);
}
// Browser pages must load translations before the registry, including cold starts.
for (const file of ["dashboard", "popup", "debug", "technical-report", "license-status"]) {
  const html = read(`src/ui/${file}.html`);
  assert.ok(html.indexOf('src="engine/locale-catalogs.js"') < html.indexOf('src="engine/language-registry.js"'));
}
console.log("All additional languages: complete UI vocabulary, placeholders, preserved content, Word, reports and PDF passed.");
