const assert = require("assert");
const fs = require("fs");
const canonical = require("../src/engine/canonical-recording");
const persistence = require("../src/engine/raw-event-persistence");
const identification = require("../src/engine/bc-ui-identification");
const normalization = require("../src/engine/event-normalization");
const grouping = require("../src/engine/event-step-grouping");
const screenshotPolicy = require("../src/engine/screenshot-capture-policy");
const focusSession = require("../src/recorder/capture-focus-session");
const surfaceMode = require("../src/recorder/capture-surface-mode");

const content = fs.readFileSync("src/recorder/content.js", "utf8");
const background = fs.readFileSync("src/recorder/background.js", "utf8");
const popup = fs.readFileSync("src/ui/popup.js", "utf8");
const manifest = JSON.parse(fs.readFileSync("src/ui/manifest.json", "utf8"));

assert(content.includes("function getCompanyName()"));
assert(content.includes("observedContext: context()"));
assert(background.includes("const environmentChanged ="));
assert(background.includes('environmentChanged ? ""'));

// Listener and lifecycle contract: delegated capture-phase observation survives
// React stopPropagation and storage synchronization reaches existing frames.
for (const type of ["pointerdown", "click", "input", "change", "focusin", "focusout",
  "keydown"]) {
  assert(content.includes(`window.addEventListener("${type}"`));
}
assert((content.match(/\}, true\);/gu) || []).length >= 6);
assert(content.includes("event.composedPath?.()"));
assert(content.includes('element.closest("label")'));
assert(content.includes('"wrapping-label"'));
assert(content.includes("isObservableReactTarget"));
assert(content.includes("reactTargetScore"));
assert(content.includes("reactInteractiveTarget"));
assert.strictEqual(surfaceMode.detect({ frameDepth: 0 }).mode, "standard-bc");
assert.strictEqual(surfaceMode.detect({ frameDepth: 1 }).mode, "standard-bc",
  "a nested frame alone must not alter standard capture behavior");
assert.strictEqual(surfaceMode.detect({ frameDepth: 1,
  automationMetadata: true }).mode, "control-addin");
assert.strictEqual(surfaceMode.detect({ frameDepth: 1,
  controlAddInPath: true }).mode, "control-addin");
assert.strictEqual(surfaceMode.detect({ materialUi: true }).mode, "control-addin");
assert.strictEqual(surfaceMode.detect({ reactRoot: true }).mode, "control-addin");
for (const role of ["switch", "treeitem", "slider", "combobox"]) {
  const detected = surfaceMode.detect({ enhancedRole: role });
  assert.strictEqual(detected.mode, "control-addin",
    `observable ARIA ${role} controls should activate control-addin mode`);
  assert.ok(detected.signals.includes("enhanced-aria-role"));
}
assert.strictEqual(surfaceMode.detect({ enhancedRole: "presentation" }).mode,
  "control-addin", "a presentation wrapper may expose the add-in surface");
assert.strictEqual(surfaceMode.detect({ enhancedRole: "button" }).mode,
  "standard-bc", "native controls remain on the standard BC path");
assert.strictEqual(surfaceMode.supportsEnhancedRole("switch"), true);
assert.strictEqual(surfaceMode.supportsEnhancedRole("button"), false,
  "native roles remain owned by standard target resolution");
assert.strictEqual(surfaceMode.eventFamily("click"), "delegated-capture");
assert.deepStrictEqual(surfaceMode.detect({ controlAddIn: true }),
  surfaceMode.detect({ controlAddIn: true }), "mode detection must be deterministic");
const surfaceInput = Object.freeze({ frameDepth: 2, automationMetadata: true });
const surfaceResult = surfaceMode.detect(surfaceInput);
assert.strictEqual(surfaceInput.frameDepth, 2, "mode detection must not mutate input");
assert.ok(Object.isFrozen(surfaceResult));
assert.ok(Object.isFrozen(surfaceResult.signals));
assert.deepStrictEqual(surfaceResult.signals,
  ["nested-frame", "automation-metadata"]);
assert.strictEqual(surfaceMode.detect({ frameDepth: "invalid" }).mode,
  "standard-bc", "malformed optional evidence must fall back safely");
assert(content.includes("surfaceSignals"));
assert(content.includes("enhancedRole: pathRole"));
assert(content.includes("captureSurface,"));
assert(content.includes("right.score - left.score"));
assert(content.includes("catch { return -1; }"));
assert(content.includes("pointerTarget: true"));
assert(content.includes("concisePointerLabel"));
assert(content.includes('accessibleNameSource: "pointer-path-text"'));
assert(content.includes('type: "T9_CAPTURE_BEFORE_ACTION"'));
assert(content.includes("preActionCaptureId"));
assert(content.includes("interactionId,"));
assert(content.includes("interactionForElement"));
assert(content.includes("dialogInteractions"));
assert(content.includes("interactiveTarget(observedTarget, event) ||"));
assert(content.includes('getComputedStyle(element).cursor === "pointer"'));
for (const reactClass of ["CardActionArea", "ListItemButton", "TableRow"]) {
  assert(content.includes(reactClass));
}
assert(content.includes("chrome.storage.onChanged.addListener"));
assert(content.includes("globalThis.T9CaptureFocusSession ||"));
assert(content.indexOf("const focusSessions = focusSessionApi.create()") <
  content.indexOf("window.__T9_RECORDER_V2__ = true"),
"The installation guard must not be set before compatibility dependencies load.");
const fallback = focusSession.create();
const muiDate = {};
fallback.start(muiDate, "2026-08-06");
assert.deepStrictEqual(fallback.finish(muiDate, "2026-08-07"), {
  emit: true, reason: "changed-value-on-focusout-fallback",
  previousValue: "2026-08-06", value: "2026-08-07"
});
const unchanged = {};
fallback.start(unchanged, "2026-08-07");
assert.strictEqual(fallback.finish(unchanged, "2026-08-07").reason,
  "unchanged-focus-session");
const nativeCommit = {};
fallback.start(nativeCommit, "");
fallback.commit(nativeCommit, "500");
assert.strictEqual(fallback.finish(nativeCommit, "500").reason,
  "equivalent-native-commit");
assert(content.includes("EDITABLE_SELECTOR"));
assert(content.includes("[role=\\\"checkbox\\\"]") ||
  content.includes("'[role=\"checkbox\"]'"));

// Static and dynamic injection cover BC frames and inherited about:blank
// documents, without broadening access to arbitrary external origins.
assert.strictEqual(manifest.content_scripts[0].all_frames, true);
assert.strictEqual(manifest.content_scripts[0].match_about_blank, true);
assert.deepStrictEqual(manifest.content_scripts[0].js,
  ["capture-focus-session.js", "capture-surface-mode.js",
    "bc-error-detector.js", "content.js"]);
assert(!manifest.host_permissions.includes("<all_urls>"));
assert(manifest.permissions.includes("webNavigation"));
assert(background.includes("allFrames: true"));
assert(background.includes("matchOriginAsFallback: true"));
assert(background.includes("updateFrameDiagnostic(sender, message.frameUrl,"));
assert(background.includes("captureDiagnosticsEnabled"));
assert(background.includes("recorderActive: Boolean(state.recording)"));
assert(background.includes("chrome.webNavigation.getAllFrames"));
assert(background.includes('case "T9_CAPTURE_BEFORE_ACTION"'));
assert(background.includes("consumePreActionCapture"));
assert(background.includes("activeContent.sessionId !== id"));
assert(popup.includes(
  'files: ["capture-focus-session.js", "capture-surface-mode.js",'));
assert((background.match(/await registerRecorderContentScript\(\);/gu) || [])
  .length >= 2, "Install and browser startup must refresh persistent registration.");

function memoryAdapter() {
  let stored = null;
  return { async load() { return stored; },
    async save(value) { stored = JSON.parse(JSON.stringify(value)); },
    inspect() { return JSON.parse(JSON.stringify(stored)); } };
}

(async () => {
  const recordingId = "react-control-addin";
  const sourceEvent = {
    sourceEventId: `${recordingId}:addin-frame:1`, recordingId,
    source: "business-central-content-script", sourceFrameId: "addin-frame",
    sourceSequence: 1, timestamp: "2026-08-17T10:00:00.000Z",
    type: "field-change", category: "field", inputSource: "focusout",
    interactionId: "addin-frame:interaction-1",
    fieldName: "Date", value: "2026-08-07", previousValue: "2026-08-06",
    controlType: "input", inputType: "text", placeholder: "YYYY-MM-DD",
    role: "input", controlAddIn: true, frameDepth: 2,
    browserFrameId: 7, parentFrameId: 3, documentId: "document-react-2",
    frameUrl: "https://businesscentral.dynamics.com/controladdin/frame",
    topUrl: "https://businesscentral.dynamics.com/?page=42",
    captureSurface: surfaceMode.detect({ frameDepth: 2,
      automationMetadata: true }), futureCaptureField: { retained: true }
  };

  const rawAdapter = memoryAdapter();
  const rawStore = persistence.createRawStore(rawAdapter);
  await rawStore.create(recordingId, sourceEvent.timestamp);
  const rawResult = await rawStore.appendRawEvent(recordingId, sourceEvent);
  assert.strictEqual(rawResult.status, "appended");
  assert.strictEqual(rawAdapter.inspect().events[0].acceptedSequence, 1);
  assert.deepStrictEqual(rawAdapter.inspect().events[0].futureCaptureField,
    { retained: true });
  assert.strictEqual(rawAdapter.inspect().events[0].captureSurface.mode,
    "control-addin");

  const identified = identification.identify(rawResult.event, {
    eventId: `${recordingId}:event:${sourceEvent.sourceEventId}`
  });
  const canonicalRecording = canonical.addEvent(canonical.create({ id: recordingId }),
    rawResult.event, identified);
  assert.strictEqual(canonicalRecording.events[0].source.eventId,
    sourceEvent.sourceEventId);
  assert.strictEqual(canonicalRecording.events[0].raw.documentId,
    "document-react-2");
  assert.strictEqual(canonicalRecording.events[0].raw.captureSurface.mode,
    "control-addin", "canonical evidence must preserve the observed capture mode");
  assert.strictEqual(canonicalRecording.events[0].interaction.id,
    "addin-frame:interaction-1");

  const normalized = normalization.normalizeRecording(canonicalRecording);
  assert.strictEqual(normalized.events.length, 1);
  assert.strictEqual(normalized.events[0].kind, "value-change");
  assert.strictEqual(normalized.events[0].evidence[0].value,
    "changed-value-on-focusout-fallback");
  assert.strictEqual(normalized.events[0].frameContext.browserFrameId, 7);
  assert.strictEqual(normalized.events[0].interactionId,
    "addin-frame:interaction-1");

  const grouped = grouping.group(normalized);
  assert.strictEqual(grouped.groups.length, 1);
  assert.strictEqual(grouped.groups[0].groupKind, "field-edit");
  assert.strictEqual(grouped.groups[0].capturePacket.interactionId,
    "addin-frame:interaction-1");
  assert.deepStrictEqual(grouped.groups[0].sourceEventIds,
    [canonicalRecording.events[0].id]);
  assert.strictEqual(screenshotPolicy.shouldCapture({ captureScreenshots: true,
    screenshotMode: "important" }, sourceEvent), true);

  let activations = canonical.create({ id: "react-activations" });
  for (const event of [{ sourceEventId: "react-button", type: "click",
    category: "action", role: "button", controlType: "button", label: "Confirm" },
  { sourceEventId: "react-checkbox", type: "field-change", category: "field",
    role: "checkbox", controlType: "input", inputType: "checkbox",
    value: true, checked: true, inputSource: "change" },
  { sourceEventId: "react-option", type: "click", category: "selection",
    role: "option", controlType: "li", selectedValue: "Open",
    selectedCaption: "Open" }]) {
    const rawEvent = { recordingId: "react-activations",
      source: "business-central-content-script", sourceFrameId: "addin-frame",
      sourceSequence: activations.events.length + 1,
      timestamp: `2026-08-17T10:00:0${activations.events.length}.000Z`,
      ...event };
    activations = canonical.addEvent(activations, rawEvent,
      identification.identify(rawEvent, {
        eventId: `react-activations:event:${event.sourceEventId}`
      }));
  }
  assert.deepStrictEqual(normalization.normalizeRecording(activations).events
    .map(event => event.kind), ["activation", "toggle-change", "activation"]);

  const checkboxRecording = canonical.addEvent(canonical.create({
    id: "react-checkbox-label"
  }), {
    sourceEventId: "react-checkbox-label:addin-frame:1",
    recordingId: "react-checkbox-label",
    source: "business-central-content-script",
    sourceFrameId: "addin-frame", sourceSequence: 1,
    timestamp: "2026-08-17T10:01:00.000Z",
    type: "field-change", category: "field", inputSource: "change",
    fieldName: "Skriv ut etikett", accessibleName: "Skriv ut etikett",
    accessibleNameSource: "wrapping-label", controlType: "input",
    inputType: "checkbox", value: false, checked: false,
    controlAddIn: true
  });
  const checkboxNormalized = normalization.normalizeRecording(
    checkboxRecording);
  assert.strictEqual(checkboxNormalized.events[0].kind, "toggle-change");
  const checkboxGroups = grouping.group(checkboxNormalized).groups;
  assert.strictEqual(checkboxGroups[0].groupKind, "toggle-interaction");
  const checkboxActions = require("../src/document/semantic-interaction-engine")
    .processStepGroups(checkboxGroups);
  assert.strictEqual(checkboxActions[0].actionType, "DisableCheckbox");
  assert.strictEqual(checkboxActions[0].targetField, "Skriv ut etikett");
  assert.strictEqual(checkboxActions[0].displayText,
    "Inaktivera **Skriv ut etikett**.");

  const reactRow = {
    recordingId: "react-row", sourceEventId: "react-row:addin-frame:1",
    source: "business-central-content-script", sourceFrameId: "addin-frame",
    sourceSequence: 1, timestamp: "2026-08-17T10:02:00.000Z",
    type: "click", category: "interaction", controlType: "div",
    label: "R101312", accessibleName: "R101312", reactInteractive: true,
    controlAddIn: true
  };
  const reactRowIdentification = identification.identify(reactRow);
  assert.strictEqual(reactRowIdentification.control.type,
    "interactiveSurface");
  assert.strictEqual(reactRowIdentification.action.caption, "R101312");
  const reactRowRecording = canonical.addEvent(canonical.create({
    id: "react-row"
  }), reactRow, reactRowIdentification);
  const reactRowGroups = grouping.group(normalization.normalizeRecording(
    reactRowRecording)).groups;
  assert.strictEqual(reactRowGroups[0].groupKind, "action");
  assert.strictEqual(reactRowGroups[0].actionContext.caption, "R101312");
  const reactRowActions = require("../src/document/semantic-interaction-engine")
    .processStepGroups(reactRowGroups);
  assert.strictEqual(reactRowActions[0].actionType, "RunAction");
  assert.strictEqual(reactRowActions[0].displayText, "Välj **R101312**.");
  assert.deepStrictEqual(reactRowActions[0].sourceEventIds,
    [reactRowRecording.events[0].id]);

  const unknownNamedClick = identification.identify({ type: "click",
    category: "interaction", controlType: "div", pointerTarget: true,
    accessibleName: "Produktion", label: "Produktion" });
  assert.strictEqual(unknownNamedClick.control.type, "interactiveSurface");
  assert.strictEqual(unknownNamedClick.action.caption, "Produktion");

  console.log("React/control add-in capture reliability tests passed.");
})().catch(error => { console.error(error); process.exitCode = 1; });
