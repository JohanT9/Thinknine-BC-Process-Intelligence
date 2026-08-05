const assert = require("assert");
const status = require("../src/review/review-status");

assert.deepStrictEqual(status.derive([], { selectedIds: [] }), {
  steps: 0,
  selected: 0,
  estimatedPages: 0,
  screenshots: 0
});

const tasks = [
  { taskId: "a", screenshots: ["one.png", "one.png", "two.png"] },
  { taskId: "b", screenshot: "one.png" },
  { taskId: "c", screenshot: "deleted.png", deleted: true },
  { taskId: "d" }
];
const derived = status.derive(tasks, {
  selectedIds: ["a", "c", "d", "missing"]
});
assert.deepStrictEqual(derived, {
  steps: 3,
  selected: 2,
  estimatedPages: 5,
  screenshots: 3
});
assert.deepStrictEqual(status.screenshotPaths(tasks[0]), ["one.png", "two.png"]);
assert.strictEqual(status.estimatePages(1, 0), 2);
assert.strictEqual(status.estimatePages(4, 4), 6);

const outputs = new Map();
const container = {
  querySelector(selector) {
    const name = selector.match(/"(.+)"/)[1];
    if (!outputs.has(name)) outputs.set(name, { textContent: "" });
    return outputs.get(name);
  }
};
status.apply(container, derived);
assert.strictEqual(outputs.get("steps").textContent, "3");
assert.strictEqual(outputs.get("selected").textContent, "2");
assert.strictEqual(outputs.get("estimatedPages").textContent, "5");
assert.strictEqual(outputs.get("screenshots").textContent, "3");

console.log("Review status behaviour tests passed.");
