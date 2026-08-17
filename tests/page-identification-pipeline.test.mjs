import assert from "node:assert";
import { createRequire } from "node:module";
import "../src/exporters/word-exporter-docx.mjs";

const require = createRequire(import.meta.url);
const canonical = require("../src/engine/canonical-recording");
const pageEngine = require("../src/engine/page-identification-engine");
const normalization = require("../src/engine/event-normalization");
const grouping = require("../src/engine/event-step-grouping");
const pipeline = require("../src/engine/session-interpretation-pipeline");
const entityMemory = require("../src/engine/entity-memory");
const screenshotSelection = require("../src/engine/screenshot-selection-engine");
const wordPipeline = require("../src/exporters/word-export-pipeline");
const corePack = require("../src/knowledge-packs/core.json");
const salesPack = require("../src/knowledge-packs/sales.json");

const packs = [corePack, salesPack];
pageEngine.configureKnowledgePacks(packs);

const session = { id: "page-integration", name: "Page integration",
  startedAt: "2026-08-17T08:00:00.000Z" };
const timestamp = index => `2026-08-17T08:00:0${index}.000Z`;
const rawEvents = [
  { eventNo: 1, sourceEventId: "known", timestamp: timestamp(1), type: "field-change",
    fieldName: "Status", value: "Open", pageId: "42",
    pageCaption: "Purchase Order", documentTitle: "Sales order",
    frameUrl: "https://bc.example/main.aspx?page=42&customer=SECRET-CUSTOMER",
    topUrl: "https://bc.example/main.aspx?page=42&document=SECRET-DOCUMENT" },
  { eventNo: 2, sourceEventId: "extension", timestamp: timestamp(2), type: "field-change",
    fieldName: "Extension setting", value: "Enabled", pageId: "70000",
    pageCaption: "Tenant Extension", documentTitle: "Private extension",
    frameUrl: "https://bc.example/main.aspx?page=70000&vendor=SECRET-VENDOR",
    topUrl: "https://bc.example/main.aspx?page=70000&person=SECRET-PERSON" },
  { eventNo: 3, sourceEventId: "addin", timestamp: timestamp(3), type: "field-change",
    fieldName: "Widget setting", value: "Enabled", pageCaption: "Tenant Widget",
    documentTitle: "Control add-in", frameDepth: 1, controlAddIn: true,
    frameUrl: "https://addin.example/widget/index.html?token=SECRET-TOKEN",
    topUrl: "https://bc.example/main.aspx?company=SECRET-COMPANY" },
  { eventNo: 4, sourceEventId: "localized", timestamp: timestamp(4), type: "field-change",
    fieldName: "Posting date", value: "2026-08-17", pageCaption: "Försäljningsorder" },
  { eventNo: 5, sourceEventId: "legacy", timestamp: timestamp(5), type: "field-change",
    fieldName: "Legacy setting", value: "Enabled", pageId: "SalesOrder",
    pageCaption: "Unregistered custom caption" }
];
const rawSnapshot = JSON.stringify(rawEvents);
const recording = canonical.fromLegacy(session, rawEvents);
assert.equal(recording.schemaVersion, 1);

const normalized = normalization.normalizeRecording(recording,
  { knowledgePacks: packs });
assert.equal(JSON.stringify(rawEvents), rawSnapshot, "source input was mutated");
assert.deepEqual(recording.events.map(event => event.raw), rawEvents,
  "Canonical raw evidence changed during enrichment");

const pages = normalized.events.map(event => event.pageIdentification);
assert.equal(pages[0].pageObjectId, "42");
assert.equal(pages[0].entity, "SalesOrder",
  "exact object ID must win over a misleading caption");
assert.equal(pages[0].source, "page-object-id");
assert.equal(pages[1].pageIdentity, "bc:page:70000");
assert.equal(pages[1].source, "runtime-metadata");
assert.equal(pages[1].entity, undefined);
assert.equal(pages[1].tableId, undefined);
assert.equal(pages[1].recordType, undefined);
assert.equal(pages[1].documentType, undefined);
assert.match(pages[2].pageIdentity, /^bc:observed:/);
assert.equal(pages[2].source, "generic-fallback");
assert.equal(pages[2].frameDepth, 1);
assert.equal(pages[2].frameUrl, rawEvents[2].frameUrl);
assert.equal(pages[3].entity, "SalesOrder");
assert.equal(pages[3].source, "caption-rule");
assert.equal(pages[4].pageObjectId, undefined,
  "historical semantic pageId must remain legacy metadata");
assert.equal(pages[4].legacyPageId, "SalesOrder");

const diagnosticText = JSON.stringify(pages.map(page => page.diagnostics || []));
for (const secret of ["SECRET-CUSTOMER", "SECRET-DOCUMENT", "SECRET-VENDOR",
  "SECRET-PERSON", "SECRET-TOKEN", "SECRET-COMPANY"]) {
  assert.ok(!diagnosticText.includes(secret), `diagnostics leaked ${secret}`);
}

const grouped = grouping.group(normalized);
const projectedEvents = rawEvents.map((event, index) => ({ ...event,
  canonicalSourceEventId: recording.events[index].id,
  normalizedInteraction: normalized.events.find(candidate =>
    candidate.sourceEventIds.includes(recording.events[index].id)) }));
const interpreted = pipeline.interpret({ session, events: projectedEvents,
  normalizedEvents: normalized.events, stepGroups: grouped.groups,
  imagePaths: Object.fromEntries(rawEvents.map(event =>
    [event.eventNo, `screenshots/${String(event.eventNo).padStart(6, "0")}.png`])),
  knowledgePacks: packs }, { entityMemory });
assert.ok(interpreted.businessTasks.length > 0, "Review tasks were not generated");
assert.ok(interpreted.businessTasks.some(task => task.pageIdentity === "bc:page:70000"));
assert.ok(interpreted.businessTasks.some(task => task.pageObjectId === "42"));
const entityNodes = entityMemory.build(normalized.events);
assert.ok(entityNodes.some(node => node.entity === "SalesOrder"));
const salesEntity = entityNodes.find(node => node.entity === "SalesOrder");
assert.ok(salesEntity.lastEventNo >= 2,
  "generic unknown pages must not erase established entity continuity");

const unknownGroup = grouped.groups.find(group =>
  group.pageContext?.pageIdentity === "bc:page:70000");
const selected = screenshotSelection.select({ stepGroup: unknownGroup,
  candidates: [{ screenshotAssetId: "wrong", screenshotRef: "wrong.png",
    sourceEventId: recording.events[0].id, normalizedKind: "value-change",
    page: { pageIdentity: "bc:page:42" } },
  { screenshotAssetId: "extension", screenshotRef: "extension.png",
    sourceEventId: recording.events[1].id, normalizedKind: "value-change",
    page: { pageIdentity: "bc:page:70000" } }] });
assert.equal(selected.selectedScreenshotAssetId, "extension");
assert.ok(selected.selectionReasons.includes("same-page"));
const legacySelected = screenshotSelection.select({ stepGroup: {
  stepGroupId: "legacy-page", sourceEventIds: ["legacy"], normalizedEventIds: [],
  pageContext: { id: "SalesOrder" } }, candidates: [{
    screenshotAssetId: "legacy", screenshotRef: "legacy.png",
    sourceEventId: "legacy", page: { pageId: "SalesOrder" } }] });
assert.equal(legacySelected.selectedScreenshotAssetId, "legacy");

const review = { sessionId: session.id, sessionName: session.name,
  updatedAt: timestamp(5), tasks: interpreted.businessTasks };
const prepared = wordPipeline.create({ session, review });
const semanticSteps = prepared.sourceSemanticDocument.sections.flatMap(section =>
  section.blocks || []).filter(block => block.kind === "step");
assert.ok(semanticSteps.some(step => step.interaction?.pageIdentity === "bc:page:70000"),
  "resolved page context did not reach the Semantic Document");
const png = new Uint8Array(Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl8lJ0AAAAASUVORK5CYII=",
  "base64"));
const mediaAssets = Object.fromEntries(prepared.semanticDocument.assets.map(asset =>
  [asset.assetId, { bytes: png, mimeType: "image/png" }]));
const exported = await globalThis.T9Export.word.renderPlan({
  plan: prepared.plan, mediaAssets });
assert.ok(exported.blob.size > 1000, "Word export path did not complete");

console.log("Page identification pipeline integration tests passed.");
