const assert = require("assert");
const fs = require("fs");
const navigation = require("../src/review/review-navigation");

const tasks = [
  { taskId: "a", approved: false },
  { taskId: "b", approved: true },
  { taskId: "c", approved: false }
];

assert.deepStrictEqual(navigation.unreviewedTaskIds(tasks), ["a", "c"]);
assert.strictEqual(navigation.nextUnreviewedTaskId(tasks, null), "a");
assert.strictEqual(navigation.nextUnreviewedTaskId(tasks, "a"), "c");
assert.strictEqual(navigation.nextUnreviewedTaskId(tasks, "c"), "a",
  "navigation must wrap through the visible review order");
assert.deepStrictEqual(navigation.derive([
  { taskId: "a", approved: true }
], "a"), { count: 0, complete: true, nextTaskId: null });

const dashboard = fs.readFileSync("src/ui/dashboard.js", "utf8");
const html = fs.readFileSync("src/ui/dashboard.html", "utf8");
const i18n = fs.readFileSync("src/ui/i18n.js", "utf8");
assert(html.includes('id="nextUnreviewedStep"'));
assert(html.includes('aria-keyshortcuts="Alt+N"'));
assert(html.includes('src="review/review-navigation.js"'));
assert(dashboard.includes("function activateNextUnreviewedStep()"));
assert(dashboard.includes("activateProcessOverviewTask(\n    navigation.nextTaskId, true"),
  "next navigation must select, focus and reveal the target review card");
assert(dashboard.includes('event.key.toLowerCase() === "n"'));
assert(i18n.includes('"review.nextUnreviewed": "Next unreviewed"'));
console.log("Review navigation UX tests passed.");
