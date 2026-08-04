const assert = require("assert");
const review = require("../src/review/review-studio");

const session = { id: "s1", name: "Test" };
const tasks = [
  { taskId: "a", instruction: "Steg A" },
  { taskId: "b", instruction: "Steg B" }
];

const model = review.createReview(session, tasks);
assert.strictEqual(model.tasks.length, 2);
assert.strictEqual(review.progress(model), 0);

review.approveTask(model, 0, true);
assert.strictEqual(review.progress(model), 50);

review.move(model, 1, -1);
assert.strictEqual(model.tasks[0].taskId, "b");

review.add(model, 0);
assert.strictEqual(model.tasks.length, 3);

review.remove(model, 1);
assert.strictEqual(model.tasks.length, 2);

review.complete(model);
assert.strictEqual(model.status, "completed");
assert.strictEqual(review.progress(model), 100);

console.log("Review Studio tests passed.");
