const assert = require("assert");
const fs = require("fs");
const path = require("path");

// Interface text, generated document text and exports follow the selected languages.
const read = file => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
const registry = require("../src/engine/language-registry");
const catalogs = require("../src/engine/locale-catalogs");
globalThis.T9LanguageRegistry = registry;
globalThis.T9LocaleCatalogs = catalogs;
require("../src/ui/i18n");
const i18n = globalThis.T9UiI18n;
const uiLocales = registry.supported("ui").map(item => item.locale);
const documentLocales = registry.supported("document").map(item => item.locale);
const otherLocales = uiLocales.filter(locale => !["sv-SE", "en-US"].includes(locale));
const swedish = /[åäöÅÄÖ]|\b(och|inte|kunde|steg|Välj|Visa|för|med|finns)\b/u;

// Every Swedish/English static pair has a translation in each other interface language.
const i18nSource = read("src/ui/i18n.js");
const staticStart = i18nSource.indexOf("const STATIC_TEXT");
const staticEnd = i18nSource.indexOf("\n  ]);\n\n  const staticLookup", staticStart);
const pairs = [...i18nSource.slice(staticStart, staticEnd)
  .matchAll(/\["((?:[^"\\]|\\.)*)",\s*"((?:[^"\\]|\\.)*)"\]/gu)]
  .map(match => [JSON.parse(`"${match[1]}"`), JSON.parse(`"${match[2]}"`)]);
assert.ok(pairs.length > 500, "static pairs are parsed");
for (const [sv, en] of pairs) {
  if (sv === en) continue;
  for (const locale of otherLocales) {
    assert.ok(catalogs[locale][en] !== undefined, `${locale} translates "${en}"`);
  }
}

// translate() resolves interface text keyed by its Swedish wording, with placeholders.
assert.strictEqual(i18n.translate("Ej granskat", "de-DE"), "Ungeprüft");
assert.strictEqual(i18n.format("Steg {step}", { step: 3 }, "fr-FR"), "Étape 3");
assert.strictEqual(i18n.translate("Granskningen kunde inte sparas.", "nb-NO"),
  "Gjennomgangen kunne ikke lagres.");
assert.strictEqual(i18n.translate("Text that is not interface vocabulary", "de-DE"),
  "Text that is not interface vocabulary", "unknown text is shown as received");

// Literal interface text in the extension scripts is translatable in every language.
for (const file of fs.readdirSync(path.join(__dirname, "../src/ui")).filter(name => name.endsWith(".js"))) {
  const source = read(`src/ui/${file}`);
  for (const match of source.matchAll(/\buiTf?\(\s*"((?:[^"\\]|\\.)+)"/gu)) {
    const key = JSON.parse(`"${match[1]}"`);
    if (key.endsWith(".") && /^[a-z]+\.[a-zA-Z]+\.$/u.test(key)) continue;
    if (!swedish.test(key)) continue;
    assert.notStrictEqual(i18n.translate(key, "en-US"), key, `${file}: "${key}" has an English translation`);
  }
}

// Static tooltips and accessible names in the pages have translations.
for (const page of ["dashboard.html", "popup.html", "technical-report.html", "license-status.html"]) {
  const html = read(`src/ui/${page}`);
  const attributes = [...html.matchAll(/<[a-z][^>]*>/gu)].flatMap(tag =>
    [...tag[0].matchAll(/\s(title|aria-label)="([^"]+)"/gu)]
      .filter(match => !tag[0].includes(`data-i18n-${match[1]}=`)));
  for (const match of attributes) {
    if (!swedish.test(match[2])) continue;
    assert.notStrictEqual(i18n.translateStaticText(match[2], "en-US"), match[2],
      `${page}: ${match[1]}="${match[2]}" has an English translation`);
  }
}

// Swedish error messages raised by the service worker and licensing module are translatable
// where the interface displays them.
for (const file of ["src/recorder/background.js", "src/engine/consultant-license.js"]) {
  const source = read(file);
  for (const match of source.matchAll(/new Error\(\s*((?:"(?:[^"\\]|\\.)*"\s*\+?\s*)+)\)/gu)) {
    const message = [...match[1].matchAll(/"((?:[^"\\]|\\.)*)"/gu)]
      .map(part => JSON.parse(`"${part[1]}"`)).join("");
    if (!swedish.test(message)) continue;
    for (const locale of uiLocales.filter(locale => locale !== "sv-SE")) {
      assert.notStrictEqual(i18n.translate(message, locale), message,
        `${file}: "${message}" is translated for ${locale}`);
    }
  }
}

// Messages carrying values are translated through templates; page text is matched exactly only.
assert.strictEqual(i18n.translate("Användaren kunde inte registreras (HTTP 503).", "de-DE"),
  "Der Benutzer konnte nicht registriert werden (HTTP 503).");
assert.strictEqual(i18n.translate("Konsultregistreringen kunde inte skapas (HTTP 400: tenant $&).", "en-US"),
  "The consultant registration could not be created (HTTP 400: tenant $&).");
assert.strictEqual(i18n.translateStaticText("Steg för steg", "en-US"), "Steg för steg",
  "a template never rewrites ordinary page text");
for (const source of [read("src/engine/consultant-license.js"), read("src/recorder/background.js")]) {
  for (const match of source.matchAll(/new Error\(`([^`]*\$\{[^`]*)`\)/gu)) {
    if (!swedish.test(match[1])) continue;
    const sample = match[1].replace(/\$\{[^}]*\}/gu, "404");
    assert.notStrictEqual(i18n.translate(sample, "en-US"), sample, `"${match[1]}" is translatable`);
  }
}

// Generated create instructions follow the recording's document language.
const canonical = require("../src/engine/canonical-recording");
const normalization = require("../src/engine/event-normalization");
const grouping = require("../src/engine/event-step-grouping");
const pipeline = require("../src/engine/session-interpretation-pipeline");
const packIndex = JSON.parse(read("src/knowledge-packs/index.json"));
const packs = packIndex.packs.map(item => JSON.parse(read(`src/${item.file}`)));
const createInstruction = documentLanguage => {
  const session = { id: "language-pass", startedAt: "2026-10-27T09:00:00Z",
    settings: { documentLanguage } };
  const recording = canonical.fromLegacyProjection({ id: session.id, schemaVersion: 1 }, session, [{
    id: "e1", eventNo: 1, type: "click", category: "action", label: "New", accessibleName: "New",
    role: "menuitem", controlType: "button", pageId: "9305", pageCaption: "Sales Orders",
    timestamp: "2026-10-27T09:00:01Z" }]);
  const normalized = normalization.normalizeRecording(recording);
  const grouped = grouping.group(normalized);
  const legacy = canonical.legacyView(recording);
  return pipeline.interpret({ session: legacy.session, events: legacy.events,
    normalizedEvents: normalized.events, stepGroups: grouped.groups,
    supportingEvents: grouped.supportingEvents, groupingDiagnostics: grouped.diagnostics,
    imagePaths: {}, knowledgePacks: packs }).businessTasks[0].instruction;
};
assert.match(createInstruction("sv-SE"), /^Börja skapa en ny \*\*försäljningsorder\*\*/u);
assert.match(createInstruction("de-DE"), /^Beginnen Sie mit der Erstellung/u);

// Masked capture values keep their stored marker and read naturally in each document language.
const documentText = require("../src/document/document-language");
const maskedMarkers = new Set(documentLocales.map(locale =>
  documentText.translateInstruction("Ange __[maskerat]__ i **Lösenord**.", locale)
    .match(/__(\[[^\]]+\])__/u)[1]));
assert.strictEqual(maskedMarkers.size, documentLocales.length);
assert.ok(documentText.translateInstruction("Ange __[maskerat]__ i **Lösenord**.", "sv-SE")
  .includes("[maskerat]"));

// Document metadata shows a date and the documentation profile name, not stored identifiers.
const semantic = require("../src/document/semantic-document");
const planner = require("../src/document/document-planner");
const themes = require("../src/document/document-theme-registry");
const workspace = require("../src/document/document-workspace");
const metadataRows = (documentLanguage, documentationProfile) => {
  const document = semantic.normalize({ documentId: "metadata-1",
    metadata: { title: "Order", documentLanguage, documentationProfile, documentVersion: "1.0",
      updatedAt: "2026-10-27T09:25:10.688Z" },
    sections: [{ sectionId: "cover", kind: "cover",
      blocks: [{ blockId: "title", kind: "heading", level: 1, text: "Order" }] }] });
  const plan = planner.plan(document, themes.resolve(themes.BUILT_IN_REGISTRY, "thinknine"));
  return workspace.render(plan).sections.flatMap(section => section.items)
    .find(item => item.kind === "metadata").content.rows;
};
const profileNames = new Set();
for (const locale of documentLocales) {
  const rows = metadataRows(locale, "customer");
  const profile = rows.find(row => row.key === "documentationProfile").value;
  assert.notStrictEqual(profile, "customer", `${locale} names the documentation profile`);
  profileNames.add(profile);
  assert.match(rows.find(row => row.key === "date").value, /^2026-10-2[67]$/u,
    `${locale} shows a date instead of a timestamp`);
}
assert.strictEqual(profileNames.size, documentLocales.length,
  "the documentation profile name is translated into every document language");

// Issue descriptions format instruction markers as Markdown and escape their content.
const issueMarkdown = require("../src/bug-report/issue-package-markdown");
const issueText = issueMarkdown.markdown({ title: "T", documentLanguage: "en-US",
  summary: { summary: "" }, reproduction: [{ instruction: "Enter __A*1__ in **No.**." }],
  expectedResult: "", actualResult: {}, errorEvidence: {}, notes: [], callStack: [],
  diagnostics: { rows: [] }, environment: {}, attachments: [], inclusion: {} });
assert.ok(issueText.includes("1. Enter **A\\*1** in *No.*."), issueText);

// The Document Library tells an empty library apart from a search without matches.
const libraryView = require("../src/ui/document-library-view");
const container = { innerHTML: "" };
libraryView.renderList(container, [], { locale: "de-DE", storedCount: 0 });
assert.ok(container.innerHTML.includes("Noch keine Dokumente") &&
  !container.innerHTML.includes("clear-search-filters"));
libraryView.renderList(container, [], { locale: "de-DE", storedCount: 4 });
assert.ok(container.innerHTML.includes("entsprechen der Suche") &&
  container.innerHTML.includes('data-library-action="clear-search-filters"'));

// Built-in profile and theme names are stored in English but shown in the interface language.
const bugReportCard = { projectId: "p", title: "Report", tags: [], modifiedAt: "2026-10-27T00:00:00Z",
  profile: { profileId: "bug-report", displayName: "Bug Report" },
  theme: { themeId: "technical-report", displayName: "Technical Report" },
  metadata: { recordingPurpose: "bug-report" }, documentLanguage: "sv-SE" };
const cardLabels = new Set(uiLocales.map(locale => {
  libraryView.renderGrouped(container, [{ profileId: "bug-report", displayName: "Bug Report",
    documents: [bugReportCard] }], { locale });
  return container.innerHTML.match(/<h3 id="library-group-bug-report">([^<]+)</u)[1];
}));
assert.strictEqual(cardLabels.size, uiLocales.length,
  "built-in library names are translated into every interface language");

// Text formatting controls: colour names and bold/italic letters follow the interface language.
const textFormat = require("../src/engine/text-format");
for (const color of textFormat.COLORS) {
  for (const locale of uiLocales.filter(locale => !["sv-SE", "en-US"].includes(locale))) {
    const english = i18n.translate(color.name, "en-US");
    assert.ok(english !== color.name || english === "Orange", `${color.name} has an English name`);
    assert.ok(catalogs[locale][english], `${locale} names the colour ${english}`);
  }
}
const dashboardSource = read("src/ui/dashboard.js");
assert.ok(dashboardSource.includes("${escapeHtml(uiT(color.name))}</option>"));
assert.ok(!dashboardSource.includes("<strong>F</strong>") && !dashboardSource.includes("<em>K</em>"));
assert.match(dashboardSource, /"en-US": \["B", "I"\]/u);

console.log(`UX language pass tests passed across ${uiLocales.length} interface languages.`);
