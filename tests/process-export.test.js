const assert = require("assert");
const fs = require("fs");
const processModel = require("../src/document/process-model");
const exporter = require("../src/exporters/process-export");

const decisionId = processModel.stableId("manual-process-node",
  ["export", "stock"]);
const approveId = processModel.stableId("process-node",
  [processModel.MODEL_VERSION, "export", "step", "approve"]);
const rejectId = processModel.stableId("process-node",
  [processModel.MODEL_VERSION, "export", "step", "reject"]);
const model = processModel.project({ recordingId: "export", title: "Order & lager",
  steps: [{ taskId: "approve", instruction: "Frisläpp <order>",
    sourceEventIds: ["event-secret-1"], stateObservation: {
      status: "changed", version: "1.0.0", changes: [{ key: "Status",
        before: { control: { caption: "Status" }, value: "Open" },
        after: { control: { caption: "Status" }, value: "Released" },
        sourceEventIds: ["event-secret-1"] }]
    } }, { taskId: "reject", instruction: "Avvisa order",
      sourceEventIds: ["event-secret-2"] }], overrides: [{
    type: "create-decision", processOverrideId: "decision-stock",
    manualNodeId: "stock", title: "Lager > 0?", processOrder: 1
  }, { type: "create-transition", fromNodeId: decisionId, toNodeId: approveId,
    transitionType: "conditional", label: "Ja & fortsätt"
  }, { type: "create-transition", fromNodeId: decisionId, toNodeId: rejectId,
    transitionType: "alternate", label: "Nej" }]
});

const first = exporter.create(model, { title: "Order: lager", language: "sv-SE" });
const second = exporter.create(model, { title: "Order: lager", language: "sv-SE" });
assert.deepStrictEqual(first, second, "exports must be deterministic");
assert.strictEqual(exporter.EXPORT_VERSION, "1.0.0");
assert.strictEqual(first.json.filename, "Order- lager - process.json");
assert.strictEqual(first.diagram.filename, "Order- lager - processdiagram.svg");
const parsed = JSON.parse(first.json.content);
assert.strictEqual(parsed.format, "thinknine-process-model");
assert.strictEqual(parsed.language, "sv-SE");
assert.strictEqual(parsed.processModel.modelVersion, processModel.MODEL_VERSION);
assert(parsed.processModel.transitions.some(item =>
  item.transitionType === "conditional" && item.label === "Ja & fortsätt"));

const svg = first.diagram.content;
assert(svg.startsWith("<?xml version="));
assert(svg.includes('role="img"'));
assert(svg.includes('data-node-type="decision"'));
assert(svg.includes("Ja &amp; fortsätt"));
assert(svg.includes("Frisläpp &lt;order&gt;"));
assert(svg.includes("Status: Open → Released"));
assert(!svg.includes("event-secret"),
  "the presentation diagram must not expose raw evidence identifiers");

const broken = { ...model, startNodeIds: ["missing"] };
assert.throws(() => exporter.create(broken), error =>
  error.code === "INVALID_PROCESS_MODEL" && error.diagnostics.length > 0);

const dashboard = fs.readFileSync("src/ui/dashboard.js", "utf8");
const html = fs.readFileSync("src/ui/dashboard.html", "utf8");
assert(html.includes('id="exportProcessModel"'));
assert(html.includes('id="exportProcessDiagram"'));
assert(html.includes('src="exporters/process-export.js"'));
assert(dashboard.includes("T9ProcessExport.create(activeProcessModel"));
assert(dashboard.includes('exportActiveProcess("diagram")'));

console.log("Process Model and diagram export tests passed.");
