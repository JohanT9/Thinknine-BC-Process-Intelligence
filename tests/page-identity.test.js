const assert = require("assert");
const pageIdentity = require("../src/engine/page-identity");
const pageEngine = require("../src/engine/page-identification-engine");
const identification = require("../src/engine/bc-ui-identification");
const canonical = require("../src/engine/canonical-recording");
pageEngine.configureKnowledgePacks([
  require("../src/knowledge-packs/core.json"),
  require("../src/knowledge-packs/sales.json"),
  require("../src/knowledge-packs/purchase.json")
]);

const numeric = { eventNo: 1, type: "click", pageId: "00042",
  pageCaption: "Sales Order",
  frameUrl: "https://businesscentral.dynamics.com/?company=CRONUS&page=42",
  futureCapture: { retained: true } };
const numericSnapshot = JSON.stringify(numeric);
const identified = identification.identify(Object.freeze(numeric));
assert.strictEqual(JSON.stringify(numeric), numericSnapshot);
assert.strictEqual(identified.pageIdentity.pageId, "00042");
assert.strictEqual(identified.pageIdentity.pageObjectId, "42");
assert.strictEqual(identified.pageIdentity.entity, "SalesOrder");
assert.strictEqual(identified.pageIdentity.pageType, "document");
assert.strictEqual(identified.pageIdentity.tableId, null);
assert.strictEqual(identified.pageIdentity.recordType, "SalesOrder");
assert.strictEqual(identified.page.caption, "Sales Order");

const missing = identification.identify({ type: "click",
  frameUrl: "https://businesscentral.dynamics.com/", pageCaption: "" });
assert.strictEqual(missing.pageIdentity.pageId, null);
assert.strictEqual(missing.pageIdentity.pageObjectId, null);
assert.strictEqual(missing.pageIdentity.pageIdentity
  .startsWith("bc:observed:"), true);

for (const malformedPageId of ["42x", "-42", "4.2", "SalesOrder"]) {
  const malformed = identification.identify({ type: "click",
    pageId: malformedPageId, pageCaption: "Unknown",
    frameUrl: `https://businesscentral.dynamics.com/?page=${encodeURIComponent(malformedPageId)}` });
  assert.strictEqual(malformed.pageIdentity.pageId, malformedPageId);
  assert.strictEqual(malformed.pageIdentity.pageObjectId, null);
  assert.strictEqual(malformed.pageIdentity.pageIdentity
    .startsWith("bc:observed:"), true);
  assert.strictEqual(malformed.pageIdentity.entity, null);
}

const semanticLegacy = identification.identify({ type: "click",
  pageId: "SalesOrder", pageCaption: "Sales Order" });
assert.strictEqual(semanticLegacy.pageIdentity.pageId, "SalesOrder");
assert.strictEqual(semanticLegacy.pageIdentity.pageObjectId, null);
assert.strictEqual(semanticLegacy.pageIdentity.entity, "SalesOrder");
assert.strictEqual(semanticLegacy.pageIdentity.source, "caption-rule");

assert.strictEqual(pageIdentity.observedPageObjectId({ pageId: "42",
  frameUrl: "https://businesscentral.dynamics.com/?page=27" }), null,
"A route mismatch must not turn legacy pageId into pageObjectId.");
assert.strictEqual(pageIdentity.normalizeNumericId("27"), "27");
assert.strictEqual(pageIdentity.normalizeNumericId("Item"), null);

const session = { id: "legacy-page-recording", name: "Legacy",
  startedAt: "2026-08-17T08:00:00.000Z" };
const source = { ...numeric, unknownFutureEventField: { nested: true } };
const sourceSnapshot = JSON.stringify(source);
const converted = canonical.fromLegacy(session, [Object.freeze(source)]);
assert.strictEqual(JSON.stringify(source), sourceSnapshot);
assert.strictEqual(converted.schemaVersion, 1);
assert.strictEqual(converted.events[0].page.id, "00042");
assert.strictEqual(converted.events[0].page.pageObjectId, "42");
assert.strictEqual(converted.events[0].page.caption, "Sales Order");
assert.strictEqual(converted.events[0].businessCentral.pageId, "00042");
assert.strictEqual(converted.events[0].businessCentral.pageObjectId, "42");
assert.deepStrictEqual(converted.events[0].raw.unknownFutureEventField,
  { nested: true });

const serialized = JSON.parse(JSON.stringify(converted));
serialized.futureRecordingField = { retained: true };
serialized.events[0].futureCanonicalEventField = { retained: true };
const serializedSnapshot = JSON.stringify(serialized);
const normalized = canonical.normalize(Object.freeze(serialized));
assert.strictEqual(JSON.stringify(serialized), serializedSnapshot);
assert.deepStrictEqual(normalized.futureRecordingField, { retained: true });
assert.deepStrictEqual(normalized.events[0].futureCanonicalEventField,
  { retained: true });
assert.strictEqual(normalized.schemaVersion, 1,
  "Additive page identity metadata must not increase the recording schema.");

const legacy = canonical.legacyView(normalized);
assert.deepStrictEqual(legacy.events[0], source);
assert.strictEqual(legacy.events[0].pageId, "00042");
assert.strictEqual(legacy.events[0].pageObjectId, undefined,
  "Derived pageObjectId must not be written into the original legacy event.");

const semanticCanonical = canonical.addEvent(canonical.create({ id: "semantic" }), {
  type: "click", pageId: "SalesOrder", pageCaption: "Sales Order"
}, semanticLegacy);
assert.strictEqual(semanticCanonical.events[0].page.id, "SalesOrder");
assert.strictEqual(semanticCanonical.events[0].page.pageObjectId, undefined);
assert.strictEqual(semanticCanonical.events[0].page.entity, "SalesOrder");
assert.notStrictEqual(semanticCanonical.events[0].page.entity,
  semanticCanonical.events[0].page.pageObjectId);

console.log("Page identity contract tests passed.");
