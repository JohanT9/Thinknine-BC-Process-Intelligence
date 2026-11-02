// The part of a screenshot a document shows can be chosen per screenshot under Edit image:
// automatic (around the marks), the whole screenshot, or a region the consultant draws. The
// choice is stored with the screenshot's annotations, can be undone, is the consultant's work
// for regeneration, and the compositor crops by it.
const assert = require("assert");
const annotations = require("../src/review/review-annotations");
const studio = require("../src/review/review-studio");
const regeneration = require("../src/review/review-regeneration");
const compositor = require("../src/review/review-annotation-compositor");
const editor = require("../src/review/review-annotation-editor");

const shot = "screenshots/000039.png";
const task = { taskId: "customer", instruction: "Välj **905** i **Kundnr**.", screenshot: shot,
  screenshots: [shot], screenshotHighlight: { screenshotRef: shot, sourceEventNo: 39,
    x: 0.494, y: 0.938, width: 0.028, height: 0.05 } };
const review = studio.createReview({ id: "focus", name: "Focus", settings: {} }, [task]);
const items = () => annotations.findScreenshotSet(review.annotations, shot).items;
const set = () => annotations.findScreenshotSet(review.annotations, shot);
const near = (actual, expected) => {
  assert.deepStrictEqual(Object.keys(actual).sort(), Object.keys(expected).sort());
  for (const [key, value] of Object.entries(expected)) {
    if (typeof value === "number") assert.ok(Math.abs(actual[key] - value) < 1e-9, `${key}: ${actual[key]}`);
    else assert.strictEqual(actual[key], value);
  }
};
const noChange = { mappings: [], addedStepIds: [], removedStepIds: [] };
assert.ok(!regeneration.consultantState(review, noChange).includes("annotations"));

// A drawn region is stored normalized, also when it was dragged from right to left.
const region = studio.setScreenshotFocus(review, shot,
  { mode: "region", x: 0.7, y: 0.6, width: -0.4, height: 0.3 }, { now: "2099-01-01T00:00:00.000Z" });
near(region, { mode: "region", x: 0.3, y: 0.6, width: 0.4, height: 0.3 });
assert.deepStrictEqual(set().focus, region);
assert.strictEqual(items().length, 1, "the outline is kept");
assert.strictEqual(review.commandHistory.at(-1).type, "annotation-focus");
assert.ok(regeneration.consultantState(review, noChange).includes("annotations"),
  "a chosen focus is the consultant's work");
assert.strictEqual(studio.setScreenshotFocus(review, shot, { ...region }), null, "the same choice is no change");

// Undo returns to the automatic focus; redo restores the region.
studio.undo(review);
assert.strictEqual(set().focus, undefined);
studio.redo(review);
assert.deepStrictEqual(set().focus, region);

// "whole" and automatic; a region too small to read or an unknown mode is refused.
studio.setScreenshotFocus(review, shot, { mode: "whole" });
assert.deepStrictEqual(set().focus, { mode: "whole" });
studio.setScreenshotFocus(review, shot, null);
assert.strictEqual(set().focus, undefined);
assert.throws(() => studio.setScreenshotFocus(review, shot,
  { mode: "region", x: 0.1, y: 0.1, width: 0.02, height: 0.3 }), RangeError);
assert.throws(() => studio.setScreenshotFocus(review, shot, { mode: "zoom" }), TypeError);
// A screenshot without annotations gets a set for its focus.
const plain = { annotations: annotations.emptyStore() };
annotations.setFocus(plain, "screenshots/plain.png", { mode: "whole" }, { idFactory: () => "plain-set", now: "n" });
assert.deepStrictEqual(plain.annotations.screenshotSets.map(entry => [entry.screenshotRef, entry.items.length,
  entry.focus]), [["screenshots/plain.png", 0, { mode: "whole" }]]);

// The compositor: the screenshot's choice wins over the automatic focus.
const box = [{ geometry: { x: 0.5, y: 0.5, width: 0.02, height: 0.02 } }];
assert.deepStrictEqual(compositor.screenshotRegion(null, box, 1600, 900, true),
  compositor.focusRegion(box, 1600, 900));
assert.strictEqual(compositor.screenshotRegion(null, box, 1600, 900, false), null);
assert.strictEqual(compositor.screenshotRegion({ mode: "whole" }, box, 1600, 900, true), null);
assert.deepStrictEqual(compositor.screenshotRegion({ mode: "region", x: 0.25, y: 0.5, width: 0.5, height: 0.5 },
  [], 1600, 900, false), { x: 400, y: 450, width: 800, height: 450 });

// The editor draws a focus region with its own tool, which never adds a mark.
let state = editor.selectTool(editor.create({ taskId: "customer", screenshotRef: shot }), "focus");
assert.strictEqual(state.tool, "focus");
state = editor.move(editor.begin(state, { x: 0.2, y: 0.2 }), { x: 0.6, y: 0.5 });
const drawn = editor.finish(state);
assert.strictEqual(state.draft.type, "focus");
near(drawn.geometry, { x: 0.2, y: 0.2, width: 0.4, height: 0.3 });
const centered = editor.centeredFocus(1600 / 900);
near(annotations.normalizedFocus(centered), centered);
assert.ok(Math.abs(centered.height - 0.4) < 1e-9, "two fifths of the width at 16:9");

// The editor's zoom texts exist in every interface language: English differs from Swedish, and
// every other language has its own text rather than the English one.
const registry = require("../src/engine/language-registry");
globalThis.T9LanguageRegistry = registry;
globalThis.T9LocaleCatalogs = require("../src/engine/locale-catalogs");
require("../src/ui/i18n");
const i18n = globalThis.T9UiI18n;
for (const text of ["Zoom i dokumentet", "Hela bilden", "Eget utsnitt", "Dokumentet visar hela bilden.",
  "Dokumentet visar den inramade delen av bilden.", "Dokumentet visar den streckade delen runt markeringarna.",
  "Automatisk zoom är avstängd i inställningarna. Dokumentet visar hela bilden.",
  "Dokumentet visar hela bilden eftersom markeringar saknas eller täcker nästan hela bilden.",
  "Dra på bilden för att välja den del som visas i dokumentet. Med tangentbordet väljer Enter ett utsnitt och piltangenterna flyttar det.",
  "Automatisk zoom används.", "Eget utsnitt valt.", "Utsnittet uppdaterades.", "Utsnittet flyttades.",
  "Utsnittet är för litet. Dra ett större område.", "Utsnittet kunde inte sparas: {error}",
  "Rektangel tillagd.", "Markeringen togs bort.", "Skärmbild som redigeras"]) {
  const english = i18n.translate(text, "en-US");
  assert.notStrictEqual(english, text, text);
  for (const { locale } of registry.supported("ui").filter(item => !["sv-SE", "en-US"].includes(item.locale))) {
    const translated = i18n.translate(text, locale);
    assert.ok(translated !== english && translated.includes("{error}") === text.includes("{error}"),
      `${locale}: ${text}`);
  }
}

(async () => {
  // composeReview crops a screenshot without marks by its own region, and leaves "whole" untouched.
  class FakeImage {
    set src(value) { this.naturalWidth = 1600; this.naturalHeight = 900; queueMicrotask(() => this.onload()); }
  }
  const canvases = [];
  const createCanvas = () => {
    const calls = [];
    const canvas = { width: 0, height: 0, calls, getContext: () => ({ drawImage: (...args) => calls.push(args) }),
      toBlob: callback => callback(new Blob([new Uint8Array([1])])) };
    canvases.push(canvas);
    return canvas;
  };
  const store = { annotations: annotations.emptyStore() };
  annotations.setFocus(store, "a.png", { mode: "region", x: 0.25, y: 0.5, width: 0.5, height: 0.5 });
  annotations.setFocus(store, "b.png", { mode: "whole" });
  const originals = [];
  const composed = await compositor.composeReview({ review: store, paths: ["a.png", "b.png"],
    screenshotSources: { "a.png": "data:a", "b.png": "data:b" }, focus: true,
    convertOriginal: source => { originals.push(source); return source; },
    ImageConstructor: FakeImage, createCanvas });
  assert.deepStrictEqual([composed["a.png"].width, composed["a.png"].height], [800, 450]);
  assert.deepStrictEqual(canvases[1].calls[0].slice(1), [400, 450, 800, 450, 0, 0, 800, 450]);
  assert.deepStrictEqual(originals, ["data:b"]);
  console.log("Screenshot focus tests passed.");
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
