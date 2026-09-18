const assert = require("assert");
const { attention } = require("../src/review/review-navigation");
const tasks = [
  { taskId: "image", approved: true },
  { taskId: "uncertain", confidenceScore: 50 },
  { taskId: "error", approved: true, resultVerification: { status: "error" } },
  { taskId: "manual", manualStepId: "m" },
  { taskId: "normal", confidenceScore: 95 }
];
const before = JSON.stringify(tasks);
const qualities = new Map([["image", { qualityLevel: "low" }]]);
const result = attention(tasks, qualities);
assert.deepStrictEqual(result.items.map(item => item.taskId), ["error", "uncertain", "image"]);
assert.strictEqual(result.remaining, 3);
assert.strictEqual(result.total, 5);
assert.strictEqual(result.items[0].step, 3);
assert.strictEqual(JSON.stringify(tasks), before);
assert.deepStrictEqual(attention(null).items, []);
assert.strictEqual(attention([{ taskId: "x", approved: true, reviewSuggested: true }]).items.length, 0);
assert.strictEqual(attention([{ taskId: "x", resultVerified: false }]).items.length, 0,
  "Absence of verification must not invent an error");
assert.strictEqual(attention([{ taskId: "x" }], new Map([["x", { qualityLevel: "manual" }]])).items.length, 0);
console.log("Review attention tests passed.");

const { outcomes } = require("../src/review/review-navigation");
assert.deepStrictEqual(outcomes([
  { taskId: "a", approved: true },
  { taskId: "b", resultVerification: { status: "verified" } },
  { taskId: "c", resultVerification: { status: "unverified" }, approved: true },
  { taskId: "d", resultVerification: { status: "error" }, approved: true },
  { taskId: "e", manualStepId: "manual" }
]), { verified: 1, error: 1, unverified: 1, unknown: 1, manual: 1 });
assert.deepStrictEqual(outcomes(null), { verified: 0, error: 0, unverified: 0, unknown: 0, manual: 0 });

const { exportCheck } = require("../src/review/review-navigation");
assert.strictEqual(exportCheck(tasks, qualities).nextTaskId, "error");
assert.strictEqual(exportCheck([{ taskId: "a", approved: false }]).nextTaskId, "a");
assert.strictEqual(exportCheck([{ taskId: "a", approved: true,
  resultVerification: { status: "unverified" } }]).nextTaskId, "a");
assert.strictEqual(exportCheck([{ taskId: "a", approved: true,
  resultVerification: { status: "verified" } }]).nextTaskId, null);
assert.deepStrictEqual(exportCheck([]), { total: 0, remaining: 0, questions: 0,
  unverified: 0, unknown: 0, nextTaskId: null });
