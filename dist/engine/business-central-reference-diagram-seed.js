(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9BusinessCentralReferenceDiagramSeed = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const SOURCE_ID = "source:thinknine:taxonomy-v1";
  const source = { id: SOURCE_ID, sourceType: "InternalReference",
    title: "BC Process Studio Business Central Process Taxonomy",
    description: "Manually curated semantic reference based on the product taxonomy and lifecycle models.",
    publisher: "Thinknine", product: "Microsoft Dynamics 365 Business Central",
    productVersion: "", retrievedAt: null, verifiedAt: "2026-09-02T00:00:00.000Z",
    verifiedBy: "Thinknine", licenseNotes: "Semantic internal reference; no external source asset included.",
    notes: "Representative patterns, not mandatory customer behaviour." };
  const documents = [
    ["document:sales-order", "Sales Order", { sv: "Försäljningsorder" }, 36, 42],
    ["document:warehouse-shipment", "Warehouse Shipment", { sv: "Dist.lagerutleverans" }],
    ["document:warehouse-pick", "Warehouse Pick", { sv: "Dist.lagerplockning" }],
    ["document:posted-sales-shipment", "Posted Sales Shipment", { sv: "Bokförd försäljningsleverans" }],
    ["document:purchase-order", "Purchase Order", { sv: "Inköpsorder" }],
    ["document:warehouse-receipt", "Warehouse Receipt", { sv: "Dist.lagerinleverans" }],
    ["document:warehouse-put-away", "Warehouse Put-away", { sv: "Dist.lagerinförsel" }],
    ["document:transfer-order", "Transfer Order", { sv: "Överföringsorder" }],
    ["document:production-order", "Production Order", { sv: "Produktionsorder" }],
    ["document:production-journal", "Production Journal", { sv: "Produktionsjournal" }],
    ["document:assembly-order", "Assembly Order", { sv: "Monteringsorder" }],
    ["document:planning-worksheet", "Planning Worksheet", { sv: "Planeringsförslag" }]
  ].map(([id, canonicalName, localizedCaptions, tableId, pageId]) => ({ id, canonicalName,
    localizedCaptions, namespace: "Microsoft.BusinessCentral", tableId: tableId ?? null,
    pageId: pageId ?? null, entityType: "Document", aliases: [] }));
  const concepts = [
    ["concept:create-sales-order", "Create Sales Order", ["New Sales Order"]],
    ["concept:release", "Release", ["Release Order"]],
    ["concept:create-warehouse-shipment", "Create Warehouse Shipment", ["Create Shipment"]],
    ["concept:create-warehouse-pick", "Create Warehouse Pick", ["Create Pick", "Generate Pick"]],
    ["concept:register-pick", "Register Pick", ["Register Warehouse Pick"]],
    ["concept:post-shipment", "Post Shipment", ["Ship", "Post Warehouse Shipment"]],
    ["concept:create-purchase-order", "Create Purchase Order", ["New Purchase Order"]],
    ["concept:receive", "Receive", ["Post Receipt"]],
    ["concept:put-away", "Register Put-away", ["Register Put Away"]],
    ["concept:transfer", "Transfer", ["Ship and Receive Transfer"]],
    ["concept:production", "Create Production Order", ["Create Prod. Order"]],
    ["concept:consume", "Post Consumption", ["Consumption"]],
    ["concept:output", "Post Output", ["Output"]],
    ["concept:assemble", "Post Assembly", ["Assemble"]],
    ["concept:plan", "Calculate Plan", ["Calculate Regenerative Plan"]]
  ].map(([id, canonicalName, aliases]) => ({ id, canonicalName, aliases,
    namespace: "Microsoft.BusinessCentral", domain: "Business Central", entityType: "ProcessStep" }));
  function graph(diagramId, steps, edges = null) {
    const nodes = [{ nodeId: `${diagramId}:start`, nodeType: "start", title: "Start", sequence: 0 },
      ...steps.map((step, index) => ({ nodeId: `${diagramId}:node:${index + 1}`,
        nodeType: step.type || "processStep", title: step.title, sequence: index + 1,
        taxonomyEntityIds: step.refs || [], metadata: { optional: step.optional === true,
          namespace: step.namespace || "Microsoft.BusinessCentral" } })),
      { nodeId: `${diagramId}:end`, nodeType: "end", title: "End", sequence: steps.length + 1 }];
    const relationships = edges || nodes.slice(1).map((node, index) => ({
      relationshipId: `${diagramId}:edge:${index + 1}`, fromNodeId: nodes[index].nodeId,
      toNodeId: node.nodeId, relationshipType: index === 0 || index === nodes.length - 2
        ? "sequence" : (steps[index - 1]?.edge || "sequence") }));
    return { graphId: `${diagramId}:graph`, level: "businessCentralProcess", title: diagramId,
      nodes, relationships, groups: [], startNodeIds: [nodes[0].nodeId], endNodeIds: [nodes.at(-1).nodeId] };
  }
  function reference(id, name, domain, process, variant, steps, options = {}) {
    const diagramId = `reference-diagram:bc:${id}`; const processGraph = graph(diagramId, steps);
    return { id: diagramId, name, description: options.description || name, sourceId: SOURCE_ID,
      domain, businessProcess: process, bcProcess: options.bcProcess || name, processVariant: variant || null,
      abstractionLevel: "BC_PROCESS", product: "Microsoft Dynamics 365 Business Central",
      productVersion: "", language: "en", namespace: "Microsoft.BusinessCentral",
      verificationStatus: "Verified", datasetPartition: options.partition || "GeneralReference",
      confidence: 1, confidenceDetails: { classification: 1, nodes: 1, entityMappings: 1,
        relationships: 1, variant: variant ? 1 : null }, createdAt: "2026-09-02T00:00:00.000Z",
      updatedAt: "2026-09-02T00:00:00.000Z", processGraph, sourceLabels: {}, canonicalMappings: {},
      variants: options.variants || [], proposals: [], manualDecisions: [],
      verificationHistory: [{ verificationId: `${diagramId}:verification:1`, status: "Verified",
        decidedAt: "2026-09-02T00:00:00.000Z", decidedBy: "Thinknine",
        notes: "Verified against the existing internal taxonomy and lifecycle seed.", source: "manual" }],
      facts: processGraph.relationships.map(edge => ({ subjectId: edge.fromNodeId,
        predicate: edge.relationshipType, objectId: edge.toNodeId, sourceId: SOURCE_ID,
        extraction: "manual", confidence: 1, verifiedBy: "Thinknine",
        verifiedAt: "2026-09-02T00:00:00.000Z" })), metadata: {
        representativeNotMandatory: true, sourceAssetRequired: false } };
  }
  const diagrams = [
    reference("simple-sales-order", "Simple Sales Order", "domain:order-to-cash",
      "Sales Order Processing", "No Warehouse Handling", [
        { title: "Sales Order", type: "document", refs: ["document:sales-order"] },
        { title: "Create Sales Order", refs: ["concept:create-sales-order"] },
        { title: "Release", refs: ["concept:release"], edge: "releases" },
        { title: "Post Shipment", type: "posting", refs: ["concept:post-shipment"], edge: "posts" }]),
    reference("sales-with-warehouse-shipment", "Sales Order with Warehouse Shipment",
      "domain:order-to-cash", "Warehouse Outbound", "Basic Warehouse", [
        { title: "Sales Order", type: "document", refs: ["document:sales-order"] },
        { title: "Release", refs: ["concept:release"], edge: "releases" },
        { title: "Warehouse Shipment", type: "document", refs: ["document:warehouse-shipment"], edge: "creates" },
        { title: "Post Shipment", type: "posting", refs: ["concept:post-shipment"], edge: "posts" }]),
    reference("advanced-warehouse-outbound", "Advanced Warehouse Outbound",
      "domain:order-to-cash", "Warehouse Outbound", "Advanced Warehouse", [
        { title: "Sales Order", type: "document", refs: ["document:sales-order"] },
        { title: "Release", refs: ["concept:release"], edge: "releases" },
        { title: "Warehouse Shipment", type: "document", refs: ["document:warehouse-shipment"], edge: "creates" },
        { title: "Create Warehouse Pick", refs: ["concept:create-warehouse-pick"] },
        { title: "Warehouse Pick", type: "document", refs: ["document:warehouse-pick"], edge: "creates" },
        { title: "Register Pick", refs: ["concept:register-pick"] },
        { title: "Post Shipment", type: "posting", refs: ["concept:post-shipment"], edge: "posts" },
        { title: "Posted Sales Shipment", type: "postedDocument",
          refs: ["document:posted-sales-shipment"], edge: "posts" }], { partition: "Evaluation" }),
    reference("simple-purchase-order", "Simple Purchase Order", "domain:source-to-pay",
      "Purchase Order Processing", "No Warehouse Handling", [
        { title: "Purchase Order", type: "document", refs: ["document:purchase-order"] },
        { title: "Create Purchase Order", refs: ["concept:create-purchase-order"] },
        { title: "Release", refs: ["concept:release"], edge: "releases" },
        { title: "Receive", type: "posting", refs: ["concept:receive"], edge: "posts" }]),
    reference("warehouse-inbound", "Warehouse Inbound", "domain:source-to-pay",
      "Warehouse Inbound", "Advanced Warehouse", [
        { title: "Purchase Order", type: "document", refs: ["document:purchase-order"] },
        { title: "Warehouse Receipt", type: "document", refs: ["document:warehouse-receipt"], edge: "creates" },
        { title: "Receive", type: "posting", refs: ["concept:receive"], edge: "posts" },
        { title: "Warehouse Put-away", type: "document", refs: ["document:warehouse-put-away"], edge: "creates" },
        { title: "Register Put-away", refs: ["concept:put-away"] }]),
    reference("transfer-order", "Transfer Order", "domain:transfers", "Inventory Transfer",
      "Standard", [{ title: "Transfer Order", type: "document", refs: ["document:transfer-order"] },
        { title: "Post Transfer Shipment", type: "posting", refs: ["concept:transfer"], edge: "transfersTo" },
        { title: "Post Transfer Receipt", type: "posting", refs: ["concept:transfer"], edge: "transfersTo" }]),
    reference("production-order", "Production Order", "domain:plan-to-produce",
      "Production", "Standard", [{ title: "Production Order", type: "document",
        refs: ["document:production-order"] }, { title: "Create Production Order",
        refs: ["concept:production"] }, { title: "Release", refs: ["concept:release"], edge: "releases" }]),
    reference("production-consumption-output", "Production Consumption and Output",
      "domain:plan-to-produce", "Production Execution", "Standard", [
        { title: "Production Order", type: "document", refs: ["document:production-order"] },
        { title: "Production Journal", type: "document", refs: ["document:production-journal"], edge: "references" },
        { title: "Post Consumption", type: "posting", refs: ["concept:consume"], edge: "consumes" },
        { title: "Post Output", type: "posting", refs: ["concept:output"], edge: "produces" }]),
    reference("assembly-order", "Assembly Order", "domain:assembly", "Assembly",
      "Assembly to Stock", [{ title: "Assembly Order", type: "document", refs: ["document:assembly-order"] },
        { title: "Post Assembly", type: "posting", refs: ["concept:assemble"], edge: "produces" }]),
    reference("planning-worksheet", "Planning Worksheet", "domain:forecast-to-plan", "Planning",
      "Regenerative Plan", [{ title: "Planning Worksheet", type: "document",
        refs: ["document:planning-worksheet"] }, { title: "Calculate Plan", refs: ["concept:plan"] },
        { title: "Review Action Messages", type: "manualAction" },
        { title: "Carry Out Action Message", type: "systemAction", edge: "creates" }])
  ];
  const dataset = Object.freeze({ schemaVersion: 1, datasetId: "bc-reference-diagram-dataset",
    taxonomyVersion: "1.0.0", createdAt: "2026-09-02T00:00:00.000Z",
    updatedAt: "2026-09-02T00:00:00.000Z", sources: [source], assets: [], concepts,
    documents, diagrams, metadata: { productNamespaces: ["Microsoft.BusinessCentral"],
      semanticDataPreferredOverImages: true, externalImagesRedistributableByDefault: false } });
  return { dataset };
});
