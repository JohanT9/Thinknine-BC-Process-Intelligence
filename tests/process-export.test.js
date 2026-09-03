const assert = require("assert");
const fs = require("fs");
const processModel = require("../src/document/process-model");
const exporter = require("../src/exporters/process-export");
const svgExporter = require("../src/exporters/process-svg-export");

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
assert(svg.includes("map-node-decision"));
assert(svg.includes("edge-conditional"));

const richSvg = svgExporter.svg({ recordingId: "rich", title: "Rich process",
  nodes: [{ nodeId: "document", nodeType: "document", title: "Sales Order", sequence: 0 },
    { nodeId: "post", nodeType: "posting", title: "Post Shipment", sequence: 1 },
    { nodeId: "posted", nodeType: "postedDocument", title: "Posted Shipment", sequence: 2 }],
  transitions: [{ fromNodeId: "document", toNodeId: "post", transitionType: "sequence" },
    { fromNodeId: "post", toNodeId: "posted", transitionType: "documentPosting" }],
  subprocesses: [{ subprocessId: "outbound", title: "Warehouse Outbound",
    nodeIds: ["document", "post", "posted"], metadata: { containerType: "phase" } }]
}, { language: "en-US", columns: 2 });
assert(richSvg.includes("Warehouse Outbound"));
assert(richSvg.includes("map-node-document"));
assert(richSvg.includes("map-node-posting"));
assert(richSvg.includes("map-node-posted-document"));
assert(richSvg.includes("edge-posts"));
assert(/<path d="[^"]* V [^"]*"/u.test(richSvg),
  "multi-row export must use orthogonal connectors");
const verticalSvg = svgExporter.svg({ recordingId: "vertical", nodes: [
  { nodeId: "one", nodeType: "activity", title: "One", sequence: 0 },
  { nodeId: "two", nodeType: "activity", title: "Two", sequence: 1 }
], transitions: [{ fromNodeId: "one", toNodeId: "two", transitionType: "sequence" }]
}, { language: "en-US", columns: 1 });
assert(/<path d="[^"]* V [^"]*"/u.test(verticalSvg));
const monochromeSvg = svgExporter.svg(model, { theme: "monochrome" });
assert(monochromeSvg.includes('data-process-theme="monochrome"'));
assert(monochromeSvg.includes("stroke:#333333"));
assert(!monochromeSvg.includes("#2878a5"));
const activityOnlyModel = { recordingId: "activities", nodes: [{ nodeId: "one",
  nodeType: "activity", title: "Create order", sequence: 0 }], transitions: [],
subprocesses: [] };
const businessCentralActivitySvg = svgExporter.svg(activityOnlyModel,
  { theme: "business-central" });
const neutralActivitySvg = svgExporter.svg(activityOnlyModel, { theme: "neutral" });
const monochromeActivitySvg = svgExporter.svg(activityOnlyModel, { theme: "monochrome" });
assert(businessCentralActivitySvg.includes("fill:#ffffff;stroke:#49657a"));
assert(neutralActivitySvg.includes("fill:#eef1f3;stroke:#64717d"));
assert(monochromeActivitySvg.includes("fill:#e2e2e2;stroke:#111111"));
assert.notStrictEqual(businessCentralActivitySvg, neutralActivitySvg);
assert.notStrictEqual(neutralActivitySvg, monochromeActivitySvg);

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
