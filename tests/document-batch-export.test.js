const assert = require("assert");
const batch = require("../src/document/document-batch-operations");

(async () => {
  const plan = { operation: "export", projectIds: ["a", "b", "c"] };
  const order = [];
  const progress = [];
  const result = await batch.execute(plan, async projectId => {
    order.push(projectId);
    return `exported:${projectId}`;
  }, { onProgress: value => progress.push(value) });
  assert.deepStrictEqual(order, ["a", "b", "c"]);
  assert.deepStrictEqual(result.results,
    ["exported:a", "exported:b", "exported:c"]);
  assert.strictEqual(result.completed, 3);
  assert.deepStrictEqual(progress.filter(value => value.phase === "completed")
    .map(value => value.completed), [1, 2, 3]);
  assert(Object.isFrozen(result));

  const partialOrder = [];
  await assert.rejects(batch.execute(plan, async projectId => {
    partialOrder.push(projectId);
    if (projectId === "b") throw new Error("download failed");
    return projectId;
  }), error => error.message === "download failed" && error.completed === 1 &&
    error.projectId === "b");
  assert.deepStrictEqual(partialOrder, ["a", "b"],
    "the queue must stop after the first failed export");
  console.log("Document batch export behavior tests passed.");
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
