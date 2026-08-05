const assert = require("assert");
const batch = require("../src/document/document-batch-operations");
const library = require("../src/document/document-library");

const records = Array.from({ length: 6 }, (_, index) => library.normalize({
  projectId: `doc-${index + 1}`, title: `Document ${index + 1}`,
  favourite: false, tags: ["old"], author: "Before"
}));
const original = JSON.stringify(records);
let state = batch.select(batch.selection(), records.map(value => value.projectId),
  "doc-2");
assert.deepStrictEqual(state.selectedIds, ["doc-2"]);
state = batch.select(state, records.map(value => value.projectId), "doc-4",
  { shift: true });
assert.deepStrictEqual(state.selectedIds, ["doc-2", "doc-3", "doc-4"]);
state = batch.select(state, records.map(value => value.projectId), "doc-1",
  { toggle: true });
assert.deepStrictEqual(state.selectedIds, ["doc-2", "doc-3", "doc-4", "doc-1"]);
state = batch.selectAll(state, ["doc-5", "doc-6"]);
assert.strictEqual(state.selectedIds.length, 6);
assert.deepStrictEqual(batch.clear().selectedIds, []);
const focused = batch.focus(state, records.map(value => value.projectId), "Home");
assert.strictEqual(focused.activeId, "doc-1");
assert.strictEqual(focused.selectedIds.length, 6);
assert.strictEqual(batch.focus(state, ["doc-2"], "Home").selectedIds.length, 6,
  "filtering must preserve hidden selections");

const hiddenStable = batch.reconcile(state, records.map(value => value.projectId));
assert.strictEqual(hiddenStable.selectedIds.length, 6);
const reconciled = batch.reconcile(state, ["doc-1", "doc-2"]);
assert.deepStrictEqual(reconciled.selectedIds, ["doc-2", "doc-1"]);

const selected = batch.selection({ selectedIds: ["doc-1", "doc-3"] });
const favourite = batch.favourite(records, selected, true);
assert.strictEqual(favourite.affected, 2);
assert.strictEqual(favourite.records[0].favourite, true);
assert.strictEqual(favourite.records[1].favourite, false);
const metadata = batch.apply(records, selected, { type: "metadata", fields: {
  tags: { selected: true, value: ["new", "shared"] },
  author: { selected: true, value: "Consultant" },
  status: { selected: false, value: "Ignored" },
  archived: { selected: true, value: true }
} });
assert.strictEqual(metadata.affected, 2);
assert.deepStrictEqual(metadata.records[2].tags, ["new", "shared"]);
assert.strictEqual(metadata.records[2].author, "Consultant");
assert.strictEqual(metadata.records[2].status, undefined);
assert.strictEqual(metadata.records[2].archived, true);

const profiled = batch.apply(records, selected, { type: "profile", fields: {
  profile: { selected: true, value: { profileId: "sop", displayName: "SOP" } }
} });
assert.strictEqual(profiled.records[0].profile.profileId, "sop");
assert.strictEqual(profiled.records[0].health.overall, "Behöver ny bedömning");
const themed = batch.apply(records, selected, { type: "theme", fields: {
  theme: { selected: true,
    value: { themeId: "minimal", displayName: "Minimal" } }
} });
assert.strictEqual(themed.records[2].theme.themeId, "minimal");
assert.deepStrictEqual(batch.exportPlan(records, selected).projectIds,
  ["doc-1", "doc-3"]);
const removed = batch.remove(records, selected);
assert.strictEqual(removed.affected, 2);
assert.deepStrictEqual(removed.records.map(value => value.projectId),
  ["doc-2", "doc-4", "doc-5", "doc-6"]);
assert.strictEqual(JSON.stringify(records), original, "batch operations are immutable");
assert(Object.isFrozen(profiled) && Object.isFrozen(profiled.records));

const large = Array.from({ length: 10000 }, (_, index) => library.normalize({
  projectId: `large-${index}`
}));
const all = batch.selectAll(batch.clear(), large.map(value => value.projectId));
const started = performance.now();
const largeResult = batch.favourite(large, all, true);
assert.strictEqual(largeResult.affected, 10000);
assert(performance.now() - started < 2000);
assert.deepStrictEqual(batch.favourite(largeResult.records, all, true).affected, 0);
console.log("Document batch operation behavior tests passed.");
