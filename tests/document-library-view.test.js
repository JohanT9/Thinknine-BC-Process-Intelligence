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
assert(container.innerHTML.includes(">SV</span>"));
assert(container.innerHTML.includes("Arbetsflödet är dokumenterat"));
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
assert(container.innerHTML.includes("Öppna felrapport"));
assert(!container.innerHTML.includes("Öppna dokumentation"));
const englishRecord = library.normalize({ projectId: "en-1", title: "English",
  documentLanguage: "en-US" });
view.renderList(container, [englishRecord], {});
assert(container.innerHTML.includes('aria-label="English">EN</span>'));
assert.strictEqual(view.renderList(container, [], {}), null);
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
console.log("Document Library view and accessibility tests passed.");
