const assert = require("assert");
const noise = require("../src/engine/noise-filter");
const memory = require("../src/engine/entity-memory");
const pageIdentification = require("../src/engine/page-identification-engine");
const graph = require("../src/engine/session-graph");
const confidence = require("../src/engine/confidence-engine");
pageIdentification.configureKnowledgePacks([
  require("../src/knowledge-packs/sales.json")
]);

const events = [
  { eventNo: 1, type: "page-state", pageCaption: "Salico POC" },
  { eventNo: 2, type: "click", label: "Öppna posten 101002", pageCaption: "Förs.order" },
  { eventNo: 3, type: "navigation", pageCaption: "Förs.order" },
  { eventNo: 4, type: "field-change", fieldName: "Kundens namn", value: "" }
];

const filtered = noise.filter(events);
assert.strictEqual(filtered.length, 2, "Noise filter should remove page-state and empty customer name.");

const entities = memory.build(filtered);
assert.ok(entities.some(node => node.entity === "SalesOrder"), "SalesOrder entity should be detected.");
const resolvedEntities = memory.build([{ eventNo: 1, pageCaption: "Unrelated",
  identification: { pageIdentity: { entity: "Customer" } } }]);
assert.strictEqual(resolvedEntities[0].entity, "Customer",
  "Entity Memory must consume resolved page identity before caption fallback.");

const tasks = [{
  taskId: "OpenSalesOrder-001",
  taskType: "OpenSalesOrder",
  entity: "SalesOrder",
  instruction: "Öppna den försäljningsorder som ska hanteras.",
  confidence: 0.97,
  knowledgeMatched: true,
  sourceEventNos: [2, 3]
}];

const sessionGraph = graph.build({ id: "s1", name: "Test" }, tasks, entities);
assert.ok(sessionGraph.nodes.some(node => node.operations.length === 1), "Task should appear in graph.");

const report = confidence.evaluate(tasks, sessionGraph);
assert.ok(report.sessionConfidence >= 80, "Known task should have high session confidence.");

console.log("All engine tests passed.");
