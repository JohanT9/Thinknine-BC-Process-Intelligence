import assert from "node:assert";
import { createRequire } from "node:module";
import "../src/exporters/word-exporter-docx.mjs";

const require = createRequire(import.meta.url);
const canonical = require("../src/engine/canonical-recording");
const pageEngine = require("../src/engine/page-identification-engine");
const normalization = require("../src/engine/event-normalization");
const grouping = require("../src/engine/event-step-grouping");
const interpretation = require("../src/engine/session-interpretation-pipeline");
const entityMemory = require("../src/engine/entity-memory");
const workspace = require("../src/document/document-workspace");
const wordPipeline = require("../src/exporters/word-export-pipeline");

const index = require("../src/knowledge-packs/index.json");
const productionPacks = index.packs.filter(item => item.enabled !== false)
  .map(item => require(`../src/${item.file}`));
const verifiedApteanFixture = { packId: "aptean-fb-release-fixture", priority: 350,
  pageDefinitions: [{ ruleId: "Fixture.ApteanQualityControl", pageObjectId: "70001",
    entity: "QualityCheck", pageType: "list", provider: "aptean-fb-release-fixture",
    verification: { source: "extension-metadata",
      evidence: "sanitized release-review fixture only; not a production registry ID" },
    localizedCaptions: { "en-US": ["Quality Control"] } }], rules: [] };
const packs = [...productionPacks, verifiedApteanFixture];

const validationStarted = performance.now();
const validation = pageEngine.configureKnowledgePacks(packs);
const loadMilliseconds = performance.now() - validationStarted;
const expectedDefinitionCount = packs.reduce((count, pack) =>
  count + (pack.pageDefinitions || []).length, 0);
assert.equal(validation.definitionCount, expectedDefinitionCount);
assert.ok(!validation.diagnostics.some(item => item.code.startsWith("invalid-") ||
  item.code.startsWith("unverified-")));

const flowCases = [
  ["customer-list-card", { caption: "Customer List" },
    { id: "21", caption: "Customer Card" }],
  ["customer-card-sales-order", { id: "21", caption: "Customer Card" },
    { id: "42", caption: "Sales Order" }],
  ["sales-order-warehouse-shipment", { id: "42", caption: "Sales Order" },
    { caption: "Warehouse Shipment" }],
  ["purchase-order-warehouse-receipt", { id: "50", caption: "Purchase Order" },
    { caption: "Warehouse Receipt" }],
  ["released-production-order-journal", { caption: "Released Production Order" },
    { caption: "Production Journal" }],
  ["operational-document-item-tracking", { id: "42", caption: "Sales Order" },
    { caption: "Item Tracking Lines" }],
  ["swedish", { caption: "Försäljningsorder", locale: "sv-SE" },
    { caption: "Artikelkort", locale: "sv-SE" }],
  ["english", { caption: "Sales Order", locale: "en-US" },
    { caption: "Item Card", locale: "en-US" }],
  ["danish", { caption: "Salgsordre", locale: "da-DK" },
    { caption: "Varekort", locale: "da-DK" }],
  ["known-aptean", { id: "70001", caption: "Quality Control" },
    { caption: "Quality Control" }],
  ["unknown-aptean", { id: "79999", caption: "Aptean Custom Page" },
    { caption: "Aptean Custom Detail" }],
  ["unknown-customer-extension", { id: "50123", caption: "Contoso Extension" },
    { id: "50124", caption: "Contoso Extension Detail" }],
  ["page-without-id", { caption: "Unregistered Page" },
    { caption: "Unregistered Detail" }],
  ["control-add-in", { id: "42", caption: "Sales Order" },
    { caption: "Embedded Widget", frameDepth: 1, controlAddIn: true,
      framePath: "/controladdin/widget.html" }],
  ["historical-legacy-page-id", { legacyId: "SalesOrder", caption: "Legacy Order" },
    { legacyId: "Customer", caption: "Legacy Customer" }],
  ["known-then-unknown", { id: "42", caption: "Sales Order" },
    { id: "58888", caption: "Unknown Extension" }],
  ["unknown-then-known", { id: "58888", caption: "Unknown Extension" },
    { id: "42", caption: "Sales Order" }]
];

const png = new Uint8Array(Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl8lJ0AAAAASUVORK5CYII=",
  "base64"));

function rawPage(flowName, page, eventNo) {
  const route = page.id ? `?page=${page.id}&customer=SECRET-CUSTOMER` :
    "?tenant=SECRET-TENANT";
  return { eventNo, sourceEventId: `${flowName}-${eventNo}`,
    timestamp: `2026-08-17T10:00:0${eventNo}.000Z`, type: "field-change",
    fieldName: `Review field ${eventNo}`, value: "SECRET-BUSINESS-VALUE",
    pageId: page.id || page.legacyId || "", pageCaption: page.caption || "",
    locale: page.locale, frameDepth: page.frameDepth ?? 0,
    controlAddIn: Boolean(page.controlAddIn),
    frameUrl: `https://bc.example${page.framePath || "/main.aspx"}${route}`,
    topUrl: `https://bc.example/main.aspx${route}&document=SECRET-DOCUMENT` };
}

for (const [flowName, fromPage, toPage] of flowCases) {
  const session = { id: `release-${flowName}`, name: flowName,
    startedAt: "2026-08-17T10:00:00.000Z" };
  const rawEvents = [rawPage(flowName, fromPage, 1), rawPage(flowName, toPage, 2)];
  const before = JSON.stringify(rawEvents);
  const recording = canonical.fromLegacy(session, rawEvents);
  const normalized = normalization.normalizeRecording(recording,
    { knowledgePacks: packs });
  assert.equal(JSON.stringify(rawEvents), before, `${flowName}: recorder input mutated`);
  assert.equal(JSON.stringify(recording.events.map(event => event.raw)), before,
    `${flowName}: canonical raw evidence changed`);
  assert.equal(recording.schemaVersion, 1);
  assert.equal(normalized.events.length, 2);
  assert.ok(normalized.events.every(event => event.pageIdentification?.pageIdentity));

  const grouped = grouping.group(normalized);
  assert.equal(grouped.groups.length, 2, `${flowName}: semantic boundaries changed`);
  const projectedEvents = rawEvents.map((event, eventIndex) => ({ ...event,
    canonicalSourceEventId: recording.events[eventIndex].id,
    normalizedInteraction: normalized.events[eventIndex] }));
  const imagePaths = { 1: `${flowName}-1.png`, 2: `${flowName}-2.png` };
  const model = interpretation.interpret({ session, events: projectedEvents,
    normalizedEvents: normalized.events, stepGroups: grouped.groups,
    imagePaths, knowledgePacks: packs }, { entityMemory });
  assert.equal(model.businessTasks.length, 2, `${flowName}: Review generation failed`);
  assert.deepEqual(model.businessTasks.flatMap(task => task.sourceEventIds),
    recording.events.map(event => event.id), `${flowName}: traceability changed`);
  assert.deepEqual(model.businessTasks.map(task => task.screenshot),
    Object.values(imagePaths), `${flowName}: screenshot selection changed`);

  const review = { sessionId: session.id, sessionName: session.name,
    updatedAt: "2026-08-17T10:00:03.000Z", tasks: model.businessTasks };
  const prepared = wordPipeline.create({ session, review });
  const workspaceModel = workspace.render(prepared.plan);
  assert.ok(workspaceModel.sections.some(section => section.kind === "workflow"),
    `${flowName}: Document Workspace failed`);
  const mediaAssets = Object.fromEntries(prepared.semanticDocument.assets.map(asset =>
    [asset.assetId, { bytes: png, mimeType: "image/png" }]));
  const word = await globalThis.T9Export.word.renderPlan({
    plan: prepared.plan, mediaAssets });
  assert.ok(word.blob.size > 1000, `${flowName}: Word export failed`);

  const diagnosticText = JSON.stringify(normalized.events.flatMap(event =>
    event.pageIdentification?.diagnostics || []));
  for (const secret of ["SECRET-CUSTOMER", "SECRET-TENANT",
    "SECRET-DOCUMENT", "SECRET-BUSINESS-VALUE"]) {
    assert.ok(!diagnosticText.includes(secret), `${flowName}: diagnostic leaked ${secret}`);
  }
}

const configuredStarted = performance.now();
for (let indexValue = 0; indexValue < 10000; indexValue += 1) {
  pageEngine.resolvePageIdentity({ pageObjectId: "42", pageCaption: "Sales Order" });
}
const configuredMilliseconds = performance.now() - configuredStarted;
const deterministicInput = { pageCaption: " Sales Order. ", locale: "en-US" };
assert.deepEqual(pageEngine.resolvePageIdentity(deterministicInput),
  pageEngine.resolvePageIdentity(deterministicInput));

console.log(`Page identification release review: ${flowCases.length} flows passed`);
console.log(`Knowledge Pack validation/configuration: ${loadMilliseconds.toFixed(2)} ms`);
console.log(`10,000 configured exact-ID resolutions: ${configuredMilliseconds.toFixed(2)} ms`);
