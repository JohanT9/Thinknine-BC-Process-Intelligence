// Copies give the same result as a JSON round trip but share strings, and a view resolves the
// visible review steps once per render.
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { clone } = require("../src/engine/json-clone");
const studio = require("../src/review/review-studio");

const json = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
const shot = "data:image/png;base64," + "QUJD".repeat(20000);
const tasks = Array.from({ length: 5 }, (_, index) => ({
  taskId: `t${index}`, instruction: `Välj "Bokför" på sidan ${index} – æøå ü`,
  approved: index % 2 === 0, screenshot: { assetId: `a${index}`, dataUrl: shot },
  events: [{ when: new Date(0), nan: NaN, infinite: -Infinity, missing: undefined, run() {} }],
  stepOverride: { fields: { title: "x" }, list: [undefined, () => 1, -0, null] }
}));
const cases = [tasks, 5, "text", null, true, [undefined], { value: undefined }, new Date(5),
  { toJSON: key => `key:${key}`, nested: { toJSON: key => key } },
  { boxed: [new String("s"), new Number(2), new Boolean(false)], empty: Object.create(null) },
  JSON.parse('{"__proto__":{"polluted":true},"plain":1}')];
const holey = [1];
holey[2] = 3;
cases.push(holey);
for (const value of cases) assert.deepStrictEqual(clone(value), json(value));
assert.strictEqual(clone(undefined), undefined);
assert.ok(Object.is(clone(-0), 0));

const prototypeKey = clone(JSON.parse('{"__proto__":{"polluted":true}}'));
assert.strictEqual(Object.getPrototypeOf(prototypeKey), Object.prototype);
assert.ok(Object.hasOwn(prototypeKey, "__proto__") && {}.polluted === undefined);

// The same failures as JSON: cycles, BigInt and a value that has no JSON form.
const cyclic = {};
cyclic.self = cyclic;
assert.throws(() => clone(cyclic), TypeError);
assert.throws(() => clone({ count: 1n }), TypeError);
assert.throws(() => clone(() => 1), SyntaxError);
const shared = { a: 1 };
assert.deepStrictEqual(clone([shared, shared]), [{ a: 1 }, { a: 1 }], "a repeated object is not a cycle");

// A copy is independent of the original.
const copied = clone(tasks);
copied[0].events[0].when = "changed";
copied[0].stepOverride.fields.title = "changed";
assert.strictEqual(tasks[0].stepOverride.fields.title, "x");
assert.notStrictEqual(copied[1].screenshot, tasks[1].screenshot);

// Modules with a defensive copy use the shared one, and every page that loads them loads it first.
const read = file => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
for (const dir of ["src/review", "src/document"]) {
  for (const file of fs.readdirSync(path.join(__dirname, "..", dir)).filter(name => name.endsWith(".js"))) {
    const source = read(`${dir}/${file}`);
    if (!source.includes('require("../engine/json-clone")')) continue;
    assert.ok(source.includes("globalThis.T9JsonClone"), `${file} loads the clone in the browser`);
  }
}
const page = read("src/ui/dashboard.html");
assert.ok(page.indexOf('src="engine/json-clone.js"') < page.indexOf('src="review/step-editor.js"') &&
  page.indexOf('src="engine/json-clone.js"') < page.indexOf("src=\"document/semantic-document.js\""));
assert.ok(read("src/recorder/background.js").startsWith('importScripts("engine/json-clone.js");'));

// Visible steps are resolved once while a view renders, and again after a change.
const review = { tasks: [
  { taskId: "a", instruction: "A" }, { taskId: "b", instruction: "B" }
] };
studio.withActiveTaskCache(() => {
  const first = studio.activeTasks(review);
  const second = studio.activeTasks(review);
  assert.deepStrictEqual(second, first);
  assert.notStrictEqual(second, first, "callers get their own array");
  second.pop();
  assert.strictEqual(studio.activeTasks(review).length, 2);
  assert.strictEqual(studio.activeTasks(review)[0], first[0], "the resolved steps are reused");
  assert.strictEqual(studio.canComplete(review), false);
  studio.approveTask(review, 0, true);
  assert.strictEqual(studio.activeTasks(review)[0].approved, true, "a recorded change resolves again");
  review.tasks = [...review.tasks, { taskId: "c", instruction: "C" }];
  assert.strictEqual(studio.activeTasks(review).length, 3, "new tasks resolve again");
});
assert.notStrictEqual(studio.activeTasks(review)[0], studio.activeTasks(review)[0],
  "outside a render every call resolves");

console.log("JSON clone tests passed.");
