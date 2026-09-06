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
assert(svg.includes('class="diagram-legend"'));
assert(svg.includes("Teckenförklaring"));
assert(svg.includes("Beslut"));
assert(svg.includes("Villkor"));
assert(svg.includes('class="top-accent"'));
assert(svg.includes("Microsoft Dynamics 365 Business Central · Processkarta"));
assert(svg.includes('id="card-shadow"'));
assert(svg.includes('class="step-badge"'));
assert(svg.includes('class="step-number"'));
assert(svg.includes("Baserad på den inspelade processen i BC Process Studio"));

const richSvg = svgExporter.svg({ recordingId: "rich", title: "Rich process",
  nodes: [{ nodeId: "document", nodeType: "document", title: "Sales Order", sequence: 0 },
    { nodeId: "post", nodeType: "posting", title: "Post Shipment", sequence: 1 },
    { nodeId: "posted", nodeType: "postedDocument", title: "Posted Shipment", sequence: 2 }],
  transitions: [{ fromNodeId: "document", toNodeId: "post", transitionType: "documentCreation" },
    { fromNodeId: "post", toNodeId: "posted", transitionType: "documentPosting" }],
  subprocesses: [{ subprocessId: "outbound", title: "Warehouse Outbound",
    nodeIds: ["document", "post", "posted"], metadata: { containerType: "phase" } }]
}, { language: "en-US", columns: 2 });
assert(richSvg.includes("Warehouse Outbound"));
assert(richSvg.includes("OWNER: Warehouse Outbound"));
assert(richSvg.includes('class="lane-panel"'));
assert(richSvg.includes("map-node-document"));
assert(richSvg.includes("map-node-posting"));
assert(richSvg.includes("map-node-posted-document"));
assert(richSvg.includes('class="document-shape"'));
assert(richSvg.includes('class="node-kind"'));
assert(richSvg.includes(">DOCUMENT<"));
assert(richSvg.includes(">POSTING<"));
assert(richSvg.includes("edge-posts"));
assert(richSvg.includes("edge-creates"));
assert(richSvg.includes('data-process-layout="serpentine"'));
assert(richSvg.includes('class="route-label" text-anchor="middle">Creates</text>'));
assert(richSvg.includes('class="route-label" text-anchor="middle">Posts as</text>'));
assert(/<path d="[^"]* V [^"]*"/u.test(richSvg),
  "multi-row export must use orthogonal connectors");
const verticalSvg = svgExporter.svg({ recordingId: "vertical", nodes: [
  { nodeId: "one", nodeType: "activity", title: "One", sequence: 0 },
  { nodeId: "two", nodeType: "activity", title: "Two", sequence: 1 }
], transitions: [{ fromNodeId: "one", toNodeId: "two", transitionType: "sequence" }]
}, { language: "en-US", columns: 1 });
assert(/<path d="[^"]* V [^"]*"/u.test(verticalSvg));
const splitLaneSvg = svgExporter.svg({ recordingId: "split-lanes", nodes: [
  { nodeId: "purchase", nodeType: "activity", title: "document:purchase-order", sequence: 0,
    metadata: { processRole: "purchasing", originalNodeType: "document" } },
  { nodeId: "create", nodeType: "activity", title: "Create", sequence: 1,
    metadata: { originalNodeType: "processStep" } },
  { nodeId: "release", nodeType: "activity", title: "Release", sequence: 2,
    metadata: { originalNodeType: "processStep" } }
], transitions: [
  { fromNodeId: "purchase", toNodeId: "create", transitionType: "sequence" },
  { fromNodeId: "create", toNodeId: "release", transitionType: "sequence" }
], subprocesses: [] }, { language: "sv-SE", columns: 4 });
assert(splitLaneSvg.includes("Inköpsorder"));
assert(splitLaneSvg.includes("Skapa"));
assert(splitLaneSvg.includes("Frisläpp"));
assert(splitLaneSvg.includes(">DOKUMENT<"));
assert(splitLaneSvg.includes(">PROCESSSTEG<"));
assert(splitLaneSvg.includes('class="lane lane-purchasing"'));
assert(splitLaneSvg.includes('style="fill:#eef5ff;stroke:#2563a6"'));
assert(!splitLaneSvg.includes('x="850"'),
  "short reversed rows must stay inside the calculated export canvas");
assert(!splitLaneSvg.includes("document:purchase-orde"));
assert(splitLaneSvg.includes('d="M 326 430 H 254"'),
  "reverse rows must connect directly from the left edge to the preceding card");
assert(splitLaneSvg.includes('viewBox="0 0 580 '),
  "the export canvas must fit the visible rows instead of reserving empty columns");
assert(!splitLaneSvg.includes("V 325.6"),
  "reverse-row connectors must not detour through the responsibility header");
const handoffSvg = svgExporter.svg({ recordingId: "handoff", nodes: [
  { nodeId: "purchase", nodeType: "document", title: "Purchase Order", sequence: 0 },
  { nodeId: "receipt", nodeType: "document", title: "Warehouse Receipt", sequence: 1 }
], transitions: [{ fromNodeId: "purchase", toNodeId: "receipt", transitionType: "sequence",
  metadata: { responsibilityHandoff: { from: { id: "purchasing" },
    to: { id: "warehouse" } } } }], subprocesses: [] }, { language: "sv-SE" });
assert(handoffSvg.includes(">Inköp → Lager</text>"));
const shapeSvg = svgExporter.svg({ recordingId: "shapes", nodes: [
  { nodeId: "manual", nodeType: "manualAction", title: "Approve", sequence: 0 },
  { nodeId: "data", nodeType: "dataEntity", title: "Item", sequence: 1 },
  { nodeId: "system", nodeType: "systemAction", title: "Calculate", sequence: 2 }
], transitions: [], subprocesses: [] }, { language: "en-US" });
assert(shapeSvg.includes('class="manual-shape"'));
assert(shapeSvg.includes('class="data-shape"'));
assert(shapeSvg.includes('class="system-shape"'));
const longTitleSvg = svgExporter.svg({ recordingId: "long-title", nodes: [{
  nodeId: "long", nodeType: "activity",
  title: "Very Long Business Central Warehouse Activity Description", sequence: 0
}], transitions: [], subprocesses: [] }, { language: "en-US" });
assert(longTitleSvg.includes('width="190" height="122"'));
assert(longTitleSvg.includes(
  "<title>Very Long Business Central Warehouse Activity Description</title>"));
assert(longTitleSvg.includes(">Activity Description</tspan>"),
  "standard export must retain additional lines instead of truncating useful text");
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
const densityModel = { recordingId: "density", nodes: Array.from({ length: 6 },
  (_, index) => ({ nodeId: `density-${index}`, nodeType: "activity",
    title: `Recorded process action ${index}`, sequence: index })), transitions: [],
subprocesses: [] };
const standardDensitySvg = svgExporter.svg(densityModel, { columns: 2 });
const compactDensitySvg = svgExporter.svg(densityModel, { columns: 2, density: "compact" });
assert(standardDensitySvg.includes('width="190" height="104"'));
assert(compactDensitySvg.includes('width="150" height="76"'));
assert.notStrictEqual(standardDensitySvg, compactDensitySvg);
const balancedSvg = svgExporter.svg({ recordingId: "balanced", nodes: Array.from({
  length: 9 }, (_, index) => ({ nodeId: `balanced-${index}`, nodeType: "activity",
    title: `Step ${index}`, sequence: index })), transitions: [], subprocesses: [] },
{ columns: 4 });
assert(balancedSvg.includes('viewBox="0 0 842 '),
  "nine nodes should use three balanced columns instead of a one-node final row");

const semanticSvg = svgExporter.svg({ recordingId: "semantic-export", nodes: [
  { nodeId: "observed", nodeType: "activity", title: "Release", sequence: 0,
    metadata: { semanticStatus: "observed" } },
  { nodeId: "suggested", nodeType: "posting", title: "Post shipment", sequence: 1,
    metadata: { semanticStatus: "suggested" } },
  { nodeId: "conditional", nodeType: "document", title: "Warehouse Pick", sequence: 2,
    metadata: { semanticStatus: "conditional" } },
  { nodeId: "custom", nodeType: "manualAction", title: "Customer approval", sequence: 3,
    metadata: { semanticStatus: "customerSpecific" } }
], transitions: [], subprocesses: [] }, { language: "sv-SE" });
assert(semanticSvg.includes('class="map-node map-node-action semantic-observed"'));
assert(semanticSvg.includes('class="map-node map-node-posting semantic-suggested"'));
assert(semanticSvg.includes('class="map-node map-node-document semantic-conditional"'));
assert(semanticSvg.includes("semantic-customerSpecific"));
assert(semanticSvg.includes('class="status-dot"'));
assert(semanticSvg.includes("<title>Observerat</title>"));
assert(semanticSvg.includes(".semantic-observed .status-dot{fill:#15803d}"));
assert(semanticSvg.includes(".map-node-document>*:first-child{fill:#eef8fd;stroke:#2878a5}"),
  "node type colors must remain visible for observed semantic nodes");
assert(semanticSvg.includes("Observerat"));
assert(semanticSvg.includes("Föreslaget"));
assert(semanticSvg.includes("Villkorligt"));
assert(semanticSvg.includes("Kundunikt"));
assert(semanticSvg.includes(".semantic-suggested .status-dot{fill:#a16207}"));
assert(semanticSvg.includes(".semantic-suggested>*:first-child{stroke-dasharray:6 4}"));

const localizedTaxonomySvg = svgExporter.svg({ recordingId: "localized-taxonomy",
  nodes: [
    { nodeId: "purchase", nodeType: "document", title: "document:purchase-order", sequence: 0 },
    { nodeId: "receive", nodeType: "action", title: "Receive", sequence: 1 },
    { nodeId: "receipt", nodeType: "document",
      title: "document:posted-purchase-receipt", sequence: 2 }
  ], transitions: [], subprocesses: [] }, { language: "sv-SE" });
assert(localizedTaxonomySvg.includes("Inköpsorder"));
assert(localizedTaxonomySvg.includes("Ta emot"));
assert(localizedTaxonomySvg.includes("Bokförd inköpsinleverans"));
assert(!localizedTaxonomySvg.includes("document:purchase-order"));

const broken = { ...model, startNodeIds: ["missing"] };
assert.throws(() => exporter.create(broken), error =>
  error.code === "INVALID_PROCESS_MODEL" && error.diagnostics.length > 0);

const dashboard = fs.readFileSync("src/ui/dashboard.js", "utf8");
const html = fs.readFileSync("src/ui/dashboard.html", "utf8");
assert(html.includes('id="exportProcessModel"'));
assert(html.includes('id="exportProcessDiagram"'));
assert(html.includes('src="exporters/process-export.js"'));
assert(dashboard.includes("T9ProcessExport.create(activeProcessModel"));
assert(dashboard.includes('processMapDirection === "vertical" ? { columns: 1 } : {}'));
assert(dashboard.includes('exportActiveProcess("diagram")'));

console.log("Process Model and diagram export tests passed.");
