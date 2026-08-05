const assert = require("assert");
const fs = require("fs");
const path = require("path");
const experience = require("../src/ui/document-workspace-experience");

const initial = experience.normalize();
assert.deepStrictEqual(initial, {
  zoom: 100,
  zoomMode: "custom",
  viewMode: "continuous",
  adaptiveReading: "auto",
  toolbarLayout: "auto",
  currentPage: 1
});
assert.ok(Object.isFrozen(initial));

assert.strictEqual(experience.zoomBy(initial, 1).zoom, 110);
assert.strictEqual(experience.zoomBy(initial, -1).zoom, 90);
assert.strictEqual(experience.setZoom(initial, 999).zoom, 200);
assert.strictEqual(experience.setZoom(initial, -1).zoom, 50);
assert.strictEqual(experience.fit(initial, "fitWidth").zoomMode, "fitWidth");
assert.strictEqual(experience.fit(initial, "fitPage").zoomMode, "fitPage");
assert.strictEqual(
  experience.effectiveZoom(experience.fit(initial, "fitWidth"), {
    availableWidth: 390,
    pageWidth: 780
  }),
  50
);
assert.strictEqual(
  experience.effectiveZoom(experience.fit(initial, "fitPage"), {
    availableWidth: 780,
    availableHeight: 450,
    pageWidth: 780,
    pageHeight: 900
  }),
  50
);

const pageMode = experience.setViewMode(initial, "page");
assert.strictEqual(pageMode.viewMode, "page");
assert.strictEqual(experience.navigate(pageMode, "next", 500).currentPage, 2);
assert.strictEqual(experience.navigate(pageMode, "end", 500).currentPage, 500);
assert.strictEqual(
  experience.navigate(experience.update(pageMode, { currentPage: 500 }), "next", 500)
    .currentPage,
  500
);
assert.strictEqual(experience.navigate(pageMode, "home", 500).currentPage, 1);

assert.strictEqual(experience.adaptiveEnabled(initial, { workspaceWidth: 700 }), false);
assert.strictEqual(experience.adaptiveEnabled(initial, { workspaceWidth: 1000 }), true);
assert.strictEqual(experience.adaptiveEnabled(initial, {
  workspaceWidth: 1000,
  documentWidth: 900
}), false);
assert.strictEqual(experience.adaptiveEnabled(pageMode, { workspaceWidth: 500 }), true);
assert.strictEqual(
  experience.adaptiveEnabled(experience.update(initial, { adaptiveReading: "off" }), {
    workspaceWidth: 1200
  }),
  false
);
assert.strictEqual(
  experience.adaptiveEnabled(experience.update(initial, { adaptiveReading: "on" }), {
    workspaceWidth: 400
  }),
  true
);
assert.strictEqual(experience.compactToolbar(initial, 600), true);
assert.strictEqual(experience.compactToolbar(initial, 900), false);

const values = new Map();
const storage = {
  getItem: key => values.get(key) || null,
  setItem: (key, value) => values.set(key, value)
};
const preferences = experience.update(initial, {
  zoom: 130,
  viewMode: "page",
  adaptiveReading: "off",
  toolbarLayout: "compact",
  currentPage: 42
});
assert.strictEqual(experience.save(storage, preferences), true);
const persisted = JSON.parse(values.get(experience.STORAGE_KEY));
assert.strictEqual(persisted.currentPage, undefined);
assert.deepStrictEqual(experience.load(storage), {
  zoom: 130,
  zoomMode: "custom",
  viewMode: "page",
  adaptiveReading: "off",
  toolbarLayout: "compact",
  currentPage: 1
});
assert.strictEqual(experience.load({ getItem: () => "not json" }).zoom, 100);
assert.strictEqual(experience.save({ setItem: () => { throw new Error("quota"); } }, initial), false);

const source = fs.readFileSync(
  path.join(__dirname, "../src/ui/document-workspace-experience.js"),
  "utf8"
);
for (const forbidden of [
  "review.tasks",
  "document-plan",
  "word-export",
  "T9_SAVE_REVIEW"
]) {
  assert.ok(!source.includes(forbidden), `View experience must not depend on ${forbidden}.`);
}
assert.deepStrictEqual(experience.normalize(preferences), experience.normalize(preferences));
assert.strictEqual(preferences.currentPage, 42, "View commands must not mutate input state.");

console.log("Adaptive Document Experience behaviour tests passed.");
