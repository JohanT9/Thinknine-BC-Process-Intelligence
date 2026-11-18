const assert = require("assert");
const view = require("../src/ui/document-library-view");
const library = require("../src/document/document-library");

const record = library.normalize({ projectId: "doc-1", title: "Order <test>",
  favourite: true, profile: { profileId: "sop", displayName: "SOP" },
  health: { overall: "Redo för granskning", suggestionLabel: "1 förslag",
    confirmations: ["Arbetsflödet är dokumenterat"] },
  summary: "En kort sammanfattning", workflowName: "Orderflöde",
  recentActivity: ["Öppnades idag"], tags: ["Order"], readingMinutes: 3 });
const container = { innerHTML: "" };
assert.strictEqual(view.renderList(container, [record], {
  selectedIds: ["doc-1"], activeId: "doc-1"
}), "doc-1");
assert(container.innerHTML.includes('role="listitem"'));
assert(container.innerHTML.includes('data-selected="true"'));
assert(container.innerHTML.includes('type="checkbox"'));
assert(container.innerHTML.includes('aria-pressed="true"'));
assert(container.innerHTML.includes("Order &lt;test&gt;"));
assert(container.innerHTML.includes('title="Order &lt;test&gt;"'));
assert(container.innerHTML.includes('class="library-card-meta"'));
assert(container.innerHTML.includes('class="library-card-footer"'));
assert(container.innerHTML.includes(">SV</span>"));
assert(!container.innerHTML.includes("Redo för granskning"));
assert(!container.innerHTML.includes("1 förslag"));
assert(!container.innerHTML.includes("Arbetsflödet är dokumenterat"));
assert.strictEqual(view.renderPreview, undefined);
assert.strictEqual(view.renderGrouped(container, library.groupByProfile([record]), {
  selectedIds: ["doc-1"], activeId: "doc-1"
}),
  "doc-1");
assert(container.innerHTML.includes("library-group-cards"));
const bugRecord = library.normalize({ projectId: "bug-1", title: "Feltest",
  profile: { profileId: "bug-report", displayName: "Bug Report" },
  metadata: { recordingPurpose: "bug-report" } });
view.renderList(container, [bugRecord], {});
assert(container.innerHTML.includes("Open bug report"), "English is the default UI language");
view.renderList(container, [bugRecord], { locale: "sv-SE" });
assert(container.innerHTML.includes("Öppna felrapport"));
assert(!container.innerHTML.includes("Öppna dokumentation"));
const englishRecord = library.normalize({ projectId: "en-1", title: "English",
  documentLanguage: "en-US" });
view.renderList(container, [englishRecord], {});
assert(container.innerHTML.includes('aria-label="English">EN</span>'));
assert.strictEqual(view.activeFilterCount({ filters: {
  profile: "sop", documentLanguage: "en-US", favourite: true,
  created: { from: "2026-01-01", to: "2026-02-01" }
} }), 4);
assert.strictEqual(view.activeFilterCount({ filters: {} }), 0);
assert.strictEqual(view.renderList(container, [], { locale: "sv-SE" }), null);
assert(container.innerHTML.includes("inga dokument i Dokumentbiblioteket"));

function fakeCard(projectId) {
  const attributes = {};
  const checkbox = { checked: false };
  return { dataset: { libraryProjectId: projectId }, tabIndex: -1, attributes,
    checkbox,
    setAttribute(name, value) { attributes[name] = value; },
    removeAttribute(name) { delete attributes[name]; },
    querySelector() { return checkbox; } };
}
const firstCard = fakeCard("doc-1");
const secondCard = fakeCard("doc-2");
const selectionContainer = {
  querySelectorAll() { return [firstCard, secondCard]; }
};
assert.strictEqual(view.applySelection(selectionContainer, {
  selectedIds: ["doc-2"], activeId: "doc-2"
}), secondCard);
assert.strictEqual(firstCard.dataset.selected, "false");
assert.strictEqual(secondCard.dataset.selected, "true");
assert.strictEqual(secondCard.checkbox.checked, true);
assert.strictEqual(secondCard.tabIndex, 0);
assert.strictEqual(secondCard.attributes["aria-current"], "true");
// A document's row names the template it follows; a bug report has no template.
const templateLabel = item => `Template: ${item.theme.displayName} <copy>`;
const templated = view.card(record, false, true, "en-US", null, null, { templateLabel });
assert(templated.includes('<span class="library-template library-col library-col-template" title="Template: BC Process Studio &lt;copy&gt;">Template: BC Process Studio &lt;copy&gt;</span>'),
  "the template is named on the row, escaped, and shown whole on hover when shortened");
assert(!view.card(record, false, true, "en-US").includes("library-template"),
  "without a template label the row is as before");
assert(!view.card(bugRecord, false, true, "en-US", null, null, { templateLabel })
  .includes("library-template"), "a bug report's row names no template");
// The details every row has come first, so the date changed lines up from row to row; the
// template follows. The test status stands beside the review status on the right, in the
// same form, outside the details.
{
  const testMarker = () => ({ state: "running", label: "Test in progress", icon: "◐",
    text: "In progress 16 Nov 2026" });
  const row = view.card(record, false, true, "en-US", null, null, { templateLabel, testMarker });
  const at = text => row.indexOf(text);
  assert(at('class="library-language"') < at('library-col-date'));
  assert(at('library-col-date') > -1 &&
    at('library-col-date') < at('library-col-template') &&
    at('library-col-template') < at('class="library-statuses"'),
    "language, kind and date come before template; the statuses follow the details");
  const statuses = row.slice(at('class="library-statuses"'));
  assert(statuses.indexOf('class="library-state"') > -1 &&
    statuses.indexOf('class="library-state"') < statuses.indexOf('class="library-test-marker"') &&
    statuses.includes('data-library-action="test-history"'),
    "the test status follows the review status and still opens the test history");
  assert(!row.slice(0, at('class="library-statuses"')).includes("library-test-marker"),
    "the test status is not among the details");
  // Every column is in every row, empty when the document has no value, so a row without a
  // company keeps the template and test marker in line with the rows that have one.
  const bare = view.card({ ...record, metadata: {} }, false, true, "en-US");
  for (const name of ["kind", "date", "company", "template"]) {
    assert(bare.includes(`library-col library-col-${name}"`) ||
      bare.includes(`library-col library-col-${name}" `), `${name} column is always there`);
  }
  assert(bare.includes('<span class="library-col library-col-company"></span>') &&
    bare.includes('<span class="library-col library-col-template"></span>'),
    "empty columns have no content, so a narrow window can hide them");
  const company = view.card({ ...record, metadata: { company: "A very long company name AB" } },
    false, true, "en-US");
  assert(company.includes('title="A very long company name AB">A very long company name AB</span>'),
    "the whole company name is shown on hover when it is shortened");
}
// The columns are as wide as their widest value in the list, and nothing is set while the
// list cannot be measured.
{
  const widths = { kind: [90, 70], date: [110, 120], company: [0, 0], template: [200, 150], test: [80, 95] };
  const properties = new Map();
  const container = {
    style: { setProperty: (key, value) => properties.set(key, value),
      removeProperty: key => properties.delete(key) },
    querySelectorAll: selector => (widths[selector.replace(".library-col-", "")] || [])
      .map(scrollWidth => ({ scrollWidth }))
  };
  properties.set("--library-col-company", "40px");
  view.alignColumns(container);
  assert.strictEqual(properties.get("--library-col-kind"), "94px");
  assert.strictEqual(properties.get("--library-col-date"), "124px");
  assert.strictEqual(properties.get("--library-col-template"), "204px");
  assert(!properties.has("--library-col-test"), "the test status is no longer a detail column");
  assert(!properties.has("--library-col-company"), "an empty column keeps no earlier width");
  view.alignColumns({ innerHTML: "" });
  // A name a fraction of a pixel wider than its rounded width, such as "Salico UAT" at
  // 56.4 pixels, still fits: it is not shortened to "Salico U…".
  {
    const set = new Map();
    view.alignColumns({ style: { setProperty: (key, value) => set.set(key, value),
      removeProperty: key => set.delete(key) },
      querySelectorAll: selector => selector === ".library-col-company"
        ? [{ scrollWidth: 56, getBoundingClientRect: () => ({ width: 56.4 }) }] : [] });
    assert(parseFloat(set.get("--library-col-company")) > 56.4,
      "the column is wider than the exact width of its widest name");
  }
}
const css = require("fs").readFileSync(require("path").join(__dirname,
  "../src/ui/design-system.css"), "utf8");
assert.match(css, /\.library-card-meta \.library-col-company,\.library-card-meta \.library-col-template\{overflow:hidden;text-overflow:ellipsis\}/u);
assert.match(css, /@media \(max-width:899px\)\{\s*\.library-card-meta \.library-col:empty\{display:none\}/u);
console.log("Document Library view and accessibility tests passed.");
