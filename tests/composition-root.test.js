const assert = require("assert");
const canonical = require("../src/engine/canonical-recording");
const identify = require("../src/engine/bc-ui-identification");
const normalization = require("../src/engine/event-normalization");
const grouping = require("../src/engine/event-step-grouping");
const pipeline = require("../src/engine/session-interpretation-pipeline");
const knowledge = require("../src/engine/knowledge-domain");

const recordingId = "composition-root";
const raw = { sourceEventId: "quantity", type: "field-change",
  timestamp: "2026-08-13T08:00:00.000Z", fieldName: "Quantity",
  value: "500", previousValue: "", inputSource: "change",
  automationId: "Quantity", pageCaption: "Sales Order" };
const identified = identify.identify(raw,
  { eventId: `${recordingId}:event:quantity` });
const recording = canonical.addEvent(canonical.create({ id: recordingId }),
  raw, identified);
const normalized = normalization.normalizeRecording(recording);
const grouped = grouping.group(normalized);
const events = [{ ...raw, eventNo: 1,
  canonicalSourceEventId: recording.events[0].id }];

const result = pipeline.interpret({ session: { id: recordingId, name: "Order" },
  events, normalizedEvents: normalized.events, stepGroups: grouped.groups,
  imagePaths: { 1: "screenshots/000001.png" }, knowledgePacks: [] });
assert.strictEqual(result.businessTasks.length, 1);
assert.deepStrictEqual(result.businessTasks[0].sourceEventIds,
  [recording.events[0].id]);
assert.deepStrictEqual(result.businessTasks[0].normalizedEventIds,
  [normalized.events[0].normalizedEventId]);
assert.deepStrictEqual(result.businessTasks[0].stepGroupIds,
  [grouped.groups[0].stepGroupId]);
assert.ok(result.businessTasks[0].semanticActionIds.length);
assert.strictEqual(result.businessTasks[0].screenshot,
  "screenshots/000001.png");

const legacyWithoutCanonicalIds = pipeline.interpret({
  session: { id: "legacy-source-less", name: "Legacy" },
  events: [], normalizedEvents: [], stepGroups: [{
    schemaVersion: 1, stepGroupId: "legacy-group", groupingVersion: "1.0.0",
    groupKind: "field-edit", normalizedEventIds: [], normalizedEvents: [],
    primaryNormalizedEvent: { kind: "value-change",
      value: { normalized: "Legacy value" } },
    controlContext: { caption: "Legacy field" }
  }], imagePaths: {}, knowledgePacks: []
});
assert.strictEqual(legacyWithoutCanonicalIds.businessTasks.length, 1);
assert.strictEqual(legacyWithoutCanonicalIds.businessTasks[0].sourceEventIds,
  undefined, "legacy evidence must not invent canonical IDs");

const menuEvents = ["row", "related", "discount"].map((name, index) => ({
  canonicalSourceEventId: `menu-event-${name}`,
  eventNo: index + 20
}));
const menuCaptions = ["Välj rad", "Relaterad information",
  "Tillämpat försäljningspris och rabatt"];
const menuResult = pipeline.interpret({
  session: { id: "menu-session", name: "Menu" },
  events: menuEvents,
  stepGroups: menuCaptions.map((caption, index) => ({
    schemaVersion: 1,
    stepGroupId: `menu-group-${index + 1}`,
    groupingVersion: "1.0.0",
    groupKind: "action",
    sourceEventIds: [menuEvents[index].canonicalSourceEventId],
    normalizedEventIds: [`normalized-menu-${index + 1}`],
    normalizedEvents: [],
    primaryNormalizedEvent: { kind: "action-invocation" },
    actionContext: { caption }
  })),
  imagePaths: {
    20: "screenshots/menu-row.png",
    21: "screenshots/menu-related.png",
    22: "screenshots/menu-discount.png"
  },
  knowledgePacks: []
});
assert.strictEqual(menuResult.businessTasks.length, 1);
assert.strictEqual(menuResult.businessTasks[0].taskType, "RunActionPath");
assert.strictEqual(menuResult.businessTasks[0].screenshot,
  "screenshots/menu-discount.png");
assert.deepStrictEqual(menuResult.businessTasks[0].sourceEventIds,
  ["menu-event-row", "menu-event-related", "menu-event-discount"]);

const manualPriceCaptions = ["Åtgärder", "Funktion", "Manuellt pris"];
const manualPriceResult = pipeline.interpret({
  session: { id: "manual-price-session", name: "Manual price" },
  events: menuEvents,
  stepGroups: manualPriceCaptions.map((caption, index) => ({
    schemaVersion: 1,
    stepGroupId: `manual-price-group-${index + 1}`,
    groupingVersion: "1.0.0",
    groupKind: "action",
    sourceEventIds: [menuEvents[index].canonicalSourceEventId],
    normalizedEventIds: [`normalized-manual-price-${index + 1}`],
    normalizedEvents: [],
    primaryNormalizedEvent: { kind: "action-invocation" },
    actionContext: { caption }
  })),
  imagePaths: {
    20: "screenshots/actions.png",
    21: "screenshots/manual-price-visible.png",
    22: "screenshots/menu-closed.png"
  },
  knowledgePacks: []
});
assert.strictEqual(manualPriceResult.businessTasks.length, 1);
assert.strictEqual(manualPriceResult.businessTasks[0].taskType, "RunActionPath");
assert.strictEqual(manualPriceResult.businessTasks[0].screenshot,
  "screenshots/manual-price-visible.png");

const compatibilityTasks = [{ taskId: "legacy-action", taskType: "RunAction",
  instruction: "Välj Släpp.", sourceEventNos: [1] }];
const unknownCompatibilityGroups = [1, 2, 3].map(index => ({
  schemaVersion: 1, stepGroupId: `unknown-${index}`,
  groupingVersion: "1.0.0", groupKind: "unknown", sourceEventIds: [],
  normalizedEventIds: [], normalizedEvents: [],
  primaryNormalizedEvent: { kind: "unknown" }, controlContext: {}
}));
const unclassifiedFallback = pipeline.interpret({ session: { id: "legacy" },
  events: [], stepGroups: unknownCompatibilityGroups
}, { compatibilityInterpret: () => ({ businessTasks: compatibilityTasks,
  confidenceResult: { tasks: compatibilityTasks, sessionConfidence: 70 },
  sessionGraph: { nodes: [], edges: [] }, contextEvents: [],
  contextCandidates: [], interpretedSteps: [], businessSteps: [] }) });
assert.strictEqual(unclassifiedFallback.compatibilityMode,
  "legacy-placeholder-dominated");
assert.deepStrictEqual(unclassifiedFallback.businessTasks, compatibilityTasks);

const packs = [{ packId: "sales", name: "Sales", version: "1", rules: [{
  ruleId: "quantity", priority: 100, confidence: 0.95,
  match: { fieldPatterns: ["Quantity"] }, taskType: "ChangeQuantity",
  semanticAction: "ChangeQuantity" }] }];
const matched = knowledge.apply([{ taskId: "a", taskType: "ChangeField",
  fieldCaption: "Quantity", instruction: "Enter 500." }], packs);
assert.strictEqual(matched.tasks[0].knowledgeRule, "quantity");
assert.strictEqual(matched.tasks[0].taskType, "ChangeQuantity");

assert.strictEqual(typeof globalThis.document, "undefined");
assert.strictEqual(typeof pipeline.interpret, "function");
console.log("Composition Root domain pipeline tests passed.");
