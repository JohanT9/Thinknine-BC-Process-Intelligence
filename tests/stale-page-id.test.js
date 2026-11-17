"use strict";
// A New click can carry the page ID of the page the user came from, such as the Customers page,
// while Business Central shows Inköpsorder. The shown page decides what the step creates.
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const canonical = require("../src/engine/canonical-recording");
const identify = require("../src/engine/bc-ui-identification");
const normalization = require("../src/engine/event-normalization");
const grouping = require("../src/engine/event-step-grouping");
const pipeline = require("../src/engine/session-interpretation-pipeline");

const root = path.join(__dirname, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "src/knowledge-packs/index.json"), "utf8"));
const knowledgePacks = manifest.packs.filter(pack => pack.enabled)
  .map(pack => JSON.parse(fs.readFileSync(path.join(root, "src", pack.file), "utf8")));

function newStep(pageId, pageCaption, label = "Ny", documentLanguage = "sv-SE") {
  const event = { sourceFrameId: "main", frameDepth: 0, pageId, pageCaption, type: "click", category: "action",
    controlType: "button", role: "button", accessibleName: label, label, pointerTarget: true,
    interactionId: "main:new", timestamp: "2026-11-17T10:00:01.000Z", sourceEventId: "new:1",
    sourceSequence: 1, recordingId: "stale" };
  let recording = canonical.create({ id: "stale", name: "Stale page" });
  recording = canonical.addEvent(recording, event, identify.identify(event, { eventId: "stale:0" }));
  const normalized = normalization.normalizeRecording(recording);
  const grouped = grouping.group(normalized);
  return pipeline.interpret({ session: { id: "stale", name: "Stale page", settings: { documentLanguage } },
    events: [{ ...event, eventNo: 1, canonicalSourceEventId: recording.events[0].id }],
    normalizedEvents: normalized.events, stepGroups: grouped.groups, supportingEvents: grouped.supportingEvents,
    groupingDiagnostics: grouped.diagnostics, imagePaths: {}, knowledgePacks }).businessTasks[0];
}

// The Customers (22) or Customer Card (21) page ID with the purchase order list on screen.
for (const pageId of ["22", "21"]) {
  const step = newStep(pageId, "Inköpsorder");
  assert.strictEqual(step.instruction,
    "Börja skapa en ny **inköpsorder** genom att välja **Ny** på sidan **Inköpsorder**.", pageId);
  assert.strictEqual(step.entity, "PurchaseOrder");
}
assert.match(newStep("22", "Purchase Orders", "New", "en-US").instruction, /new \*\*purchase order\*\*/u);
// The purchase order list and card, and a page whose name says nothing about the record, keep
// what the page ID says.
assert.match(newStep("9307", "Inköpsorder").instruction, /ny \*\*inköpsorder\*\*/u);
assert.match(newStep("50", "Inköpsorder").instruction, /ny \*\*inköpsorder\*\*/u);
assert.match(newStep("22", "CRONUS Sverige AB").instruction, /ny \*\*kund\*\*/u,
  "the page ID still names the record when the title is the company name");

console.log("Stale page ID tests passed");
