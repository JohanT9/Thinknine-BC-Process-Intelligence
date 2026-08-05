const assert = require("assert");
const library = require("../src/document/document-library");

const now = Date.parse("2026-08-05T12:00:00Z");
const records = [
  { projectId: "sop-1", title: "Bokför försäljningsorder",
    profile: { profileId: "sop", displayName: "SOP" },
    theme: { themeId: "corporate", displayName: "Corporate" },
    createdAt: "2026-06-01T10:00:00Z", modifiedAt: "2026-08-04T10:00:00Z",
    lastOpenedAt: "2026-08-05T08:00:00Z", favourite: true,
    tags: ["Ekonomi", "Order"], workflowName: "Order till faktura",
    sectionNames: ["Förutsättningar", "Arbetsgång"], author: "Anna",
    health: { overall: "Redo för granskning", suggestionLabel: "0 förslag",
      confirmations: ["Arbetsflödet är dokumenterat", "Tillgängligheten ser bra ut"] },
    metadata: { company: "Contoso" } },
  { projectId: "training-1", title: "Registrera leverans",
    profile: { profileId: "training-guide", displayName: "Training Guide" },
    theme: { themeId: "thinknine", displayName: "Thinknine" },
    createdAt: "2026-07-01T10:00:00Z", modifiedAt: "2026-07-20T10:00:00Z",
    lastOpenedAt: "2026-06-01T08:00:00Z", tags: ["Lager"],
    workflowName: "Inleverans", health: { overall: "Behöver uppmärksamhet" } },
  { projectId: "quick-1", title: "Artikeluppslag",
    profile: { profileId: "quick-reference", displayName: "Quick Reference" },
    createdAt: "2026-08-01T10:00:00Z", modifiedAt: "2026-08-01T10:00:00Z",
    health: { overall: "Inte bedömd" } }
];

const snapshot = JSON.stringify(records);
const index = library.create(records);
assert.strictEqual(JSON.stringify(records), snapshot);
assert(Object.isFrozen(index) && Object.isFrozen(index[0].record));
assert.strictEqual(library.query(index, { search: "forsaljningsorder" }).length, 1);
assert.strictEqual(library.query(index, { search: "contoso" }).length, 1);
assert.strictEqual(library.query(index, { search: "förutsättningar" }).length, 1);
assert.deepStrictEqual(library.query(index, { filters: {
  profile: "sop", theme: "corporate", health: "Redo för granskning",
  favourite: true, recent: true
}, now }).map(value => value.projectId), ["sop-1"]);
assert.deepStrictEqual(library.query(index, { filters: {
  created: { from: "2026-07-01", to: "2026-07-31" },
  modified: { from: "2026-07-15", to: "2026-07-31" }
} }).map(value => value.projectId), ["training-1"]);
assert.deepStrictEqual(library.query(index, { sort: "alphabetical" })
  .map(value => value.projectId), ["quick-1", "sop-1", "training-1"]);
assert.deepStrictEqual(library.query(index, { sort: "recent" })
  .map(value => value.projectId), ["sop-1", "training-1", "quick-1"]);
assert.deepStrictEqual(library.groupByProfile(library.query(index))
  .map(group => group.profileId), ["quick-reference", "sop", "training-guide"]);

const updated = library.update(records, "training-1", { favourite: true });
assert.strictEqual(updated[1].favourite, true);
assert.strictEqual(records[1].favourite, undefined);
assert.strictEqual(library.update(updated, "training-1", {
  metadata: { owner: "Team" }
})[1].metadata.owner, "Team");
assert.strictEqual(library.selection({}, records, "ArrowDown").selectedId, "sop-1");
assert.strictEqual(library.selection({ focusedId: "sop-1" }, records,
  "ArrowDown").selectedId, "training-1");
assert.strictEqual(library.selection({ focusedId: "training-1" }, records,
  "End").selectedId, "quick-1");

const large = Array.from({ length: 10000 }, (_, indexValue) => ({
  projectId: `project-${indexValue}`, title: `Document ${indexValue}`,
  tags: indexValue === 9999 ? ["needle"] : []
}));
const started = performance.now();
assert.strictEqual(library.query(library.create(large), { search: "needle" })[0]
  .projectId, "project-9999");
assert(performance.now() - started < 1500);

const future = library.normalize({ projectId: "future", futureField: { value: 1 } });
assert.deepStrictEqual(future.futureField, { value: 1 });
const bounded = library.normalize({ projectId: "bounded", review: { tasks: [] },
  semanticDocument: { sections: [] }, documentPlan: { sections: [] },
  rendererState: { page: 2 }, screenshots: { path: "bytes" } });
for (const field of library.FORBIDDEN_PROJECT_FIELDS) {
  assert.strictEqual(bounded[field], undefined,
    `${field} must never cross the metadata-only library boundary`);
}
assert.strictEqual(library.create([records[0], { ...records[0], title: "Ny titel" }])
  .length, 1);
console.log("Document Library behavior tests passed.");
