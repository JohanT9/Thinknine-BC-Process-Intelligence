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
assert(container.innerHTML.includes("Arbetsflödet är dokumenterat"));
view.renderPreview(container, record);
assert(container.innerHTML.includes("Orderflöde"));
assert(container.innerHTML.includes("Öppnades idag"));
assert(container.innerHTML.includes("Dokumenthälsa"));
assert.strictEqual(view.renderGrouped(container, library.groupByProfile([record]), {
  selectedIds: ["doc-1"], activeId: "doc-1"
}),
  "doc-1");
assert(container.innerHTML.includes("library-group-cards"));
assert.strictEqual(view.renderList(container, [], {}), null);
assert(container.innerHTML.includes("Inga dokument"));
console.log("Document Library view and accessibility tests passed.");
