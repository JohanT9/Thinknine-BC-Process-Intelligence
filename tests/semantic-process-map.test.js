const assert = require("assert");
const semanticMap = require("../src/document/semantic-process-map");

const referenceGraph = { schemaVersion: "1.0.0", graphId: "advanced", level:
  "businessCentralProcess", nodes: [
    { nodeId: "start", nodeType: "start", title: "Start" },
    { nodeId: "sales", nodeType: "document", title: "Sales Order",
      taxonomyEntityIds: ["document:sales-order"] },
    { nodeId: "release", nodeType: "processStep", title: "Release" },
    { nodeId: "pick", nodeType: "processStep", title: "Create Pick" },
    { nodeId: "post", nodeType: "posting", title: "Post Shipment" },
    { nodeId: "end", nodeType: "end", title: "End" }
  ], relationships: [], groups: [], startNodeIds: ["start"], endNodeIds: ["end"] };
const analysis = { bestMatch: { referenceDiagramId: "advanced", referenceProcess:
  "Advanced Warehouse Outbound", domain: "domain:order-to-cash", confidence: 0.9,
  matchedSteps: [{ title: "Sales Order" }, { title: "Release" }, { title: "Create Pick" }],
  missingSteps: [{ title: "Post Shipment" }], additionalSteps: [{ title: "Customer Approval" }] },
observedGraph: { nodes: [{ nodeId: "observed-release", title: "Release",
  sourceEventIds: ["event-release"] }, { nodeId: "approval", title: "Customer Approval",
  nodeType: "manualAction", sourceEventIds: ["event-approval"] }] },
bestReferenceGraph: referenceGraph, referenceGraphs: { advanced: referenceGraph } };
const reviewTasks = [{ taskId: "task-release", sourceEventIds: ["event-release"] },
  { taskId: "task-approval", sourceEventIds: ["event-approval"] }];
const procedureModel = { recordingId: "recording", nodes: [{ nodeId: "raw", nodeType: "activity",
  title: "Click Release", sourceStepIds: ["task-release"] }], transitions: [], subprocesses: [],
stateTransitions: [] };
const input = { recordingId: "recording", title: "Outbound", analysis, reviewTasks, procedureModel };
const snapshot = JSON.stringify(input);

const bc = semanticMap.project(input, "businessCentral");
assert.strictEqual(JSON.stringify(input), snapshot, "Projection must not mutate its inputs.");
assert.deepStrictEqual(bc.nodes.map(node => node.title), ["Sales Order", "Release", "Create Pick",
  "Post Shipment", "Customer Approval"]);
assert.strictEqual(bc.nodes.find(node => node.title === "Release").metadata.semanticStatus, "observed");
assert.deepStrictEqual(bc.nodes.find(node => node.title === "Release").sourceStepIds, ["task-release"]);
assert.strictEqual(bc.nodes.find(node => node.title === "Post Shipment").metadata.semanticStatus,
  "suggested");
assert.strictEqual(bc.nodes.find(node => node.title === "Customer Approval").metadata.semanticStatus,
  "customerSpecific");
assert.deepStrictEqual(bc.nodes.find(node => node.title === "Customer Approval").sourceStepIds,
  ["task-approval"]);
assert.strictEqual(bc.transitions.length, 4);

const business = semanticMap.project(input, "business");
assert.deepStrictEqual(business.nodes.map(node => node.title), ["Order To Cash",
  "Advanced Warehouse Outbound"]);
assert.strictEqual(business.nodes.at(-1).metadata.semanticStatus, "observed");
assert.strictEqual(semanticMap.project(input, "procedure"), procedureModel);
assert.strictEqual(semanticMap.project({ recordingId: "empty", analysis: {} },
  "businessCentral").nodes.length, 0);
assert.throws(() => semanticMap.project(input, "pixels"), /Unsupported semantic process-map level/);

const selectedAnalysis = { ...analysis, referenceGraphs: { alternative: { ...referenceGraph,
  graphId: "alternative", nodes: referenceGraph.nodes.map(node => node.nodeId === "pick"
    ? { ...node, title: "Warehouse Pick" } : node) } } };
const selected = semanticMap.project({ ...input, analysis: selectedAnalysis,
  decision: { confirmedReferenceId: "alternative", status: "selected" } }, "businessCentral");
assert(selected.nodes.some(node => node.title === "Warehouse Pick"));

console.log("Semantic process map tests passed.");
