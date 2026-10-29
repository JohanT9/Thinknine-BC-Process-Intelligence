// Replays raw recorder events through the same chain as the extension: canonical recording,
// UI identification, normalization, step grouping and session interpretation.
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "../..");
const canonical = require("../../src/engine/canonical-recording");
const identify = require("../../src/engine/bc-ui-identification");
const normalization = require("../../src/engine/event-normalization");
const grouping = require("../../src/engine/event-step-grouping");
const pipeline = require("../../src/engine/session-interpretation-pipeline");

// Fields the export adds next to each raw event; replay derives them again.
const DERIVED_FIELDS = ["identification", "normalizedInteraction", "stepGroup",
  "canonicalSourceEventId", "canonicalScreenshotAssetId", "eventNo", "signature"];

function rawEvent(event) {
  const copy = { ...event };
  DERIVED_FIELDS.forEach(field => delete copy[field]);
  return copy;
}

function enabledKnowledgePacks() {
  const read = file => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
  return read("src/knowledge-packs/index.json").packs.filter(pack => pack.enabled)
    .map(pack => read(`src/${pack.file}`));
}

function replay(events, { id = "capture-quality", documentLanguage = "en-US",
  knowledgePacks = enabledKnowledgePacks() } = {}) {
  let recording = canonical.create({ id, name: id });
  const sourceEvents = [];
  events.map(rawEvent).forEach((raw, index) => {
    recording = canonical.addEvent(recording, raw,
      identify.identify(raw, { eventId: `${id}:event:${index}` }));
    sourceEvents.push({ ...raw, eventNo: index + 1,
      canonicalSourceEventId: recording.events.at(-1).id });
  });
  const normalized = normalization.normalizeRecording(recording);
  const grouped = grouping.group(normalized);
  const interpreted = pipeline.interpret({ session: { id, name: id,
    settings: { documentLanguage } }, events: sourceEvents,
  normalizedEvents: normalized.events, stepGroups: grouped.groups,
  supportingEvents: grouped.supportingEvents, groupingDiagnostics: grouped.diagnostics,
  imagePaths: {}, knowledgePacks });
  return { normalized, grouped, tasks: interpreted.businessTasks, interpretation: interpreted,
    sourceEvents };
}

module.exports = { DERIVED_FIELDS, enabledKnowledgePacks, rawEvent, replay };
