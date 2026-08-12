const assert = require("assert");
const canonical = require("../src/engine/canonical-recording");
const persistence = require("../src/engine/raw-event-persistence");
const fs = require("fs");
const path = require("path");

function memoryAdapter(initial = null) {
  let value = initial;
  let failNext = false;
  let saves = 0;
  return {
    async load() { return value == null ? null : JSON.parse(JSON.stringify(value)); },
    async save(next) {
      if (failNext) { failNext = false; throw new Error("storage unavailable"); }
      await Promise.resolve();
      value = JSON.parse(JSON.stringify(next));
      saves += 1;
    },
    fail() { failNext = true; },
    inspect() { return JSON.parse(JSON.stringify(value)); },
    saves() { return saves; }
  };
}

function raw(id, overrides = {}) {
  return {
    sourceEventId: id,
    source: "business-central-content-script",
    sourceFrameId: overrides.sourceFrameId || "top-frame",
    sourceSequence: overrides.sourceSequence || 1,
    timestamp: "2026-08-10T10:00:00.000Z",
    type: "click",
    label: "Sales Orders",
    unknownFutureCapture: { version: 27 },
    ...overrides
  };
}

function rawMemoryAdapter(initial = null) {
  let value = initial;
  let failNext = false;
  return {
    async load() { return value; },
    async save(next) {
      if (failNext) { failNext = false; throw new Error("raw storage unavailable"); }
      value = next;
    },
    fail() { failNext = true; },
    inspect() { return JSON.parse(JSON.stringify(value)); }
  };
}

(async () => {
  const adapter = memoryAdapter();
  const store = persistence.createStore(adapter);
  const recording = canonical.create({ id: "raw-1", title: "Sales order" });
  await store.create(recording);
  assert.strictEqual(store.diagnostics().pendingWrites, 0);

  // Same timestamps and semantically identical interactions remain distinct.
  await Promise.all([
    store.append("raw-1", raw("source-a", {
      sourceSequence: 1, pageId: "42", pageCaption: "Sales Orders",
      automationId: "NewOrder", controlType: "button", role: "button",
      clientX: 320, clientY: 180, frameUrl: "https://businesscentral.dynamics.com/?page=42",
      topUrl: "https://businesscentral.dynamics.com/?page=42", frameDepth: 0
    })),
    store.append("raw-1", raw("source-b", { sourceFrameId: "iframe-1", sourceSequence: 1 }))
  ]);
  let saved = adapter.inspect();
  assert.deepStrictEqual(saved.events.map(event => event.sequence), [1, 2]);
  assert.deepStrictEqual(saved.events.map(event => event.source.eventId), ["source-a", "source-b"]);
  assert.strictEqual(saved.events[1].source.frameId, "iframe-1");
  assert.deepStrictEqual(saved.events[0].raw.unknownFutureCapture, { version: 27 });
  assert.strictEqual(saved.events[0].id, "raw-1:event:source-a");
  assert.deepStrictEqual(saved.events[0].coordinates, { x: 320, y: 180 });
  assert.strictEqual(saved.events[0].businessCentral.pageId, "42");
  assert.strictEqual(saved.events[0].accessibleTarget.role, "button");
  assert.strictEqual(saved.events[0].target.automationId, "NewOrder");

  const saveCount = adapter.saves();
  await store.append("raw-1", raw("source-a"));
  assert.strictEqual(adapter.inspect().events.length, 2);
  assert.strictEqual(adapter.saves(), saveCount, "Duplicate source delivery is not rewritten");

  // A delayed screenshot is serialized behind the event and linked by event ID.
  await Promise.all([
    store.append("raw-1", raw("source-c", { sourceSequence: 2 })),
    store.associateScreenshot("raw-1", "raw-1:event:source-c", "data:image/png;base64,abc")
  ]);
  saved = adapter.inspect();
  assert.ok(saved.events[2].screenshotAssetId);
  assert.strictEqual(saved.assets.length, 1);
  assert.ok(!Object.hasOwn(saved.events[2], "screenshotBytes"));

  // A failed screenshot is simply absent; the raw event remains valid.
  assert.strictEqual(saved.events[1].screenshotAssetId, undefined);

  await assert.rejects(store.append("raw-1", null), /raw event/i);
  assert.strictEqual(adapter.inspect().events.length, 3);

  // Failure does not poison the queue and an already stored recording survives.
  adapter.fail();
  await assert.rejects(store.append("raw-1", raw("source-failed")), /storage unavailable/);
  await Promise.resolve();
  assert(store.diagnostics().failures.some(item =>
    item.code === "canonical-write-failure" && item.operationType === "append-event"));
  assert.strictEqual(adapter.inspect().events.length, 3);
  await store.append("raw-1", raw("source-recovered"));
  assert.strictEqual(adapter.inspect().events.length, 4);
  await assert.rejects(store.finalize("raw-1", "2026-08-10T11:00:00.000Z"),
    /failed writes/);

  // A clean queue serializes every accepted event before successful completion.
  const finalAdapter = memoryAdapter();
  const finalStore = persistence.createStore(finalAdapter);
  await finalStore.create(canonical.create({ id: "final-1" }));
  const finishedAt = "2026-08-10T11:00:00.000Z";
  await Promise.all([
    finalStore.append("final-1", raw("source-pending")),
    finalStore.finalize("final-1", finishedAt)
  ]);
  await finalStore.flush();
  assert.strictEqual(finalStore.diagnostics().pendingWrites, 0);
  saved = finalAdapter.inspect();
  assert.strictEqual(saved.events.at(-1).source.eventId, "source-pending");
  assert.strictEqual(saved.metadata.finishedAt, finishedAt);
  await assert.rejects(finalStore.append("final-1", raw("source-too-late")), /immutable/);
  await assert.rejects(
    finalStore.associateScreenshot("final-1", saved.events[0].id,
      "data:image/png;base64,late"),
    /immutable/
  );

  // A new store simulates service-worker recovery from durable state.
  const recovered = persistence.createStore(finalAdapter);
  await assert.rejects(recovered.append("final-1", raw("after-restart")), /immutable/);

  const legacySession = { id: "legacy", name: "Legacy", startedAt: finishedAt };
  const legacyEvent = { eventNo: 7, type: "click", timestamp: finishedAt, custom: true };
  const legacy = canonical.fromLegacy(legacySession, [legacyEvent], {});
  assert.strictEqual(legacy.events[0].id, "legacy:event:7");
  assert.deepStrictEqual(legacy.events[0].raw, legacyEvent);

  const largeAdapter = memoryAdapter();
  const largeStore = persistence.createStore(largeAdapter);
  await largeStore.create(canonical.create({ id: "large" }));
  const started = Date.now();
  for (let index = 0; index < 1000; index += 1) {
    await largeStore.append("large", raw(`large-${index}`, { sourceSequence: index + 1 }));
  }
  assert.strictEqual(largeAdapter.inspect().events.length, 1000);
  assert.ok(Date.now() - started < 15000, "1,000 event persistence regression");

  // Raw Event Persistence is authoritative before Canonical interpretation.
  const rawAdapter = rawMemoryAdapter();
  let intake = persistence.createRawStore(rawAdapter);
  await intake.create("intake-1", "2026-08-10T09:00:00.000Z");
  const identical = { type: "click", label: "Post", value: "10000",
    timestamp: "2026-08-10T10:00:00.000Z" };
  await intake.appendRawEvent("intake-1", raw("frame-a:1", {
    ...identical, sourceFrameId: "top", sourceSequence: 1,
    futureMetadata: { retained: true } }));
  await intake.appendRawEvent("intake-1", raw("frame-a:2", {
    ...identical, sourceFrameId: "top", sourceSequence: 2 }));
  await intake.appendRawEvent("intake-1", raw("frame-b:1", {
    ...identical, sourceFrameId: "nested", sourceSequence: 1 }));
  assert.deepStrictEqual(rawAdapter.inspect().events.map(item =>
    item.acceptedSequence), [1, 2, 3]);
  assert.deepStrictEqual(rawAdapter.inspect().events.map(item =>
    item.sourceEventId), ["frame-a:1", "frame-a:2", "frame-b:1"]);
  assert.deepStrictEqual(rawAdapter.inspect().events[0].futureMetadata,
    { retained: true });

  // Restart loads durable identity and suppresses only the same delivery.
  intake = persistence.createRawStore(rawAdapter);
  const duplicate = await intake.appendRawEvent("intake-1",
    raw("frame-a:2", identical));
  assert.strictEqual(duplicate.status, "duplicate");
  assert.strictEqual(rawAdapter.inspect().events.length, 3);
  await intake.appendRawEvent("intake-1", raw("frame-a:3", identical));
  assert.strictEqual(rawAdapter.inspect().events[3].acceptedSequence, 4);

  rawAdapter.fail();
  await assert.rejects(intake.appendRawEvent("intake-1",
    raw("failed:1")), /raw storage unavailable/);
  assert(intake.diagnostics().failures.some(item =>
    item.code === "raw-event-write-failure"));
  assert.strictEqual(rawAdapter.inspect().events.length, 4);

  const limitedAdapter = rawMemoryAdapter();
  const limited = persistence.createRawStore(limitedAdapter);
  await limited.create("limited");
  await limited.appendRawEvent("limited", raw("limit:1"), { maxEvents: 1 });
  const truncated = await limited.appendRawEvent("limited", raw("limit:2"),
    { maxEvents: 1 });
  assert.strictEqual(truncated.status, "truncated");
  assert.strictEqual(limitedAdapter.inspect().events.length, 1);
  assert.strictEqual(limitedAdapter.inspect().truncated, true);
  assert(limitedAdapter.inspect().diagnostics.some(item =>
    item.code === "raw-event-limit-reached"));

  const scaleAdapter = rawMemoryAdapter();
  const scale = persistence.createRawStore(scaleAdapter);
  await scale.create("scale");
  const scaleStarted = Date.now();
  let tenThousandElapsed = 0;
  for (let index = 0; index < 20000; index += 1) {
    await scale.appendRawEvent("scale", raw(`scale:${index}`, {
      sourceSequence: index + 1 }));
    if (index === 9999) tenThousandElapsed = Date.now() - scaleStarted;
  }
  assert.strictEqual(scaleAdapter.inspect().events[9999].acceptedSequence, 10000);
  assert.ok(tenThousandElapsed < 15000,
    "10,000 raw event intake regression");
  assert.strictEqual(scaleAdapter.inspect().events.length, 20000);
  assert.ok(Date.now() - scaleStarted < 15000,
    "20,000 raw event intake regression");

  const background = fs.readFileSync(path.join(__dirname,
    "../src/recorder/background.js"), "utf8");
  const content = fs.readFileSync(path.join(__dirname,
    "../src/recorder/content.js"), "utf8");
  assert(background.indexOf("rawEventStore.appendRawEvent(") <
    background.indexOf("T9BCUIIdentification.identify(event"),
  "Raw evidence must be durable before Canonical interpretation.");
  assert(background.indexOf("canonicalStore.append(") <
    background.indexOf("saveEvents(recordingId, events)"),
  "Canonical projection must precede legacy compatibility projection.");
  assert(content.includes("`${sessionId}:${sourceFrameId}:${localSequence}`"));
  assert(!background.includes("previous?.signature"));

  console.log("Raw event persistence tests passed.");
})().catch(error => { console.error(error); process.exitCode = 1; });
