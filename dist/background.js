importScripts("engine/json-clone.js");
importScripts("engine/locale-catalogs.js");
importScripts("engine/language-registry.js");
importScripts("engine/storage-keys.js");
importScripts("engine/storage-queries.js");
importScripts("engine/review-storage-format.js");
importScripts("engine/review-progress-store.js");
importScripts("engine/business-central-url-context.js");
importScripts("engine/tenant-license.js");
importScripts("engine/recording-license-guard.js");
importScripts("engine/tenant-license-config.js");
importScripts("engine/consultant-license.js");
importScripts("engine/document-usage.js");
importScripts("engine/page-identity.js");
importScripts("engine/page-identification-engine.js");
importScripts("engine/process-taxonomy-schema.js");
importScripts("engine/canonical-semantic-model.js");
importScripts("engine/canonical-recording.js");
importScripts("engine/canonical-process-schema.js");
importScripts("engine/canonical-process-adapter.js");
importScripts("engine/business-central-process-taxonomy-seed.js");
importScripts("engine/business-central-document-lifecycle-seed.js");
importScripts("engine/document-lifecycle.js");
importScripts("engine/bc-process-recognition-engine.js");
importScripts("engine/business-central-reference-process-seed.js");
importScripts("engine/reference-process-library.js");
importScripts("document/process-graph.js");
importScripts("engine/business-central-reference-diagram-seed.js");
importScripts("engine/reference-diagram-dataset.js");
importScripts("document/multi-level-process-graph.js");
importScripts("engine/raw-event-persistence.js");
importScripts("engine/event-log-storage.js");
importScripts("engine/bc-ui-identification.js");
importScripts("engine/bc-client-captions.js");
importScripts("engine/step-text.js");
// The document's sentences, for the steps the recording panel shows while recording.
importScripts("document/semantic-document.js");
importScripts("document/presentation-grammar.js");
importScripts("engine/event-normalization.js");
importScripts("engine/capture-packet-integrity.js");
importScripts("engine/observed-state.js");
importScripts("engine/event-step-grouping.js");
importScripts("engine/source-reference.js");
importScripts("document/semantic-interaction-engine.js");
importScripts("engine/task-consolidation.js");
importScripts("engine/knowledge-captions.js");
importScripts("engine/knowledge-domain.js");
importScripts("engine/knowledge-repository.js");
importScripts("engine/process-decision-code-registry.js");
importScripts("review/task-visibility.js");
importScripts("engine/process-quality-guard.js");
importScripts("engine/process-contradiction-engine.js");
importScripts("engine/process-analysis-model.js");
importScripts("document/bc-caption-translation.js");
importScripts("engine/session-interpretation-pipeline.js");
importScripts("engine/privacy-mask.js");
importScripts("engine/recording-derived-cache.js");
importScripts("engine/screenshot-capture-policy.js");
importScripts("engine/screenshot-queue-policy.js");
importScripts("engine/screenshot-asset-paths.js");
importScripts("engine/screenshot-asset-store.js");
importScripts("engine/screenshot-target-registration.js");
importScripts("engine/recording-live-status.js");
importScripts("engine/capture-sequence.js");
importScripts("engine/recovering-queue.js");
importScripts("bug-report/bc-diagnostic-evidence.js");
importScripts("engine/bc-error-evidence-store.js");
importScripts("bug-report/al-call-stack-parser.js");
importScripts("bug-report/technical-diagnostics.js");
importScripts("bug-report/error-evidence-model.js");
importScripts("bug-report/error-analysis-rules.js");
importScripts("bug-report/error-code-registry.js");
importScripts("bug-report/error-diagnosis-engine.js");
importScripts("bug-report/error-incident-correlator.js");
importScripts("bug-report/error-privacy-classifier.js");
importScripts("bug-report/error-analysis-engine.js");
importScripts("bug-report/bug-report-model.js");
importScripts("bug-report/bug-report-completeness.js");
importScripts("bug-report/bug-report-service.js");
importScripts("bug-report/bug-report-store.js");
importScripts("bug-report/error-labels.js");
importScripts("bug-report/error-cause.js");
importScripts("bug-report/bug-report-generator.js");
importScripts("bug-report/issue-package.js");
importScripts("bug-report/issue-package-markdown.js");
importScripts("document/document-library.js");
importScripts("document/document-folders.js");
importScripts("document/test-recording-match.js");
importScripts("document/test-script.js");
importScripts("document/test-history.js");
importScripts("document/test-suite.js");
importScripts("document/page-script-export.js");
importScripts("review/process-improvement-dataset.js");
importScripts("review/process-improvement-service.js");

const VERSION = chrome.runtime.getManifest().version;
const recordingDerivedCache = globalThis.T9RecordingDerivedCache.create({
  maxEntries: 3, maxEvents: 5000, ttlMs: 5 * 60 * 1000
});
const consultantLicense = globalThis.T9ConsultantLicense.create({
  storage: chrome.storage.local, fetcher: (...args) => fetch(...args),
  identity: chrome.identity, config: globalThis.T9TenantLicenseConfig,
  version: VERSION
});
const tenantLicense = globalThis.T9TenantLicense.create({
  storage: chrome.storage.local, fetcher: (...args) => fetch(...args),
  authenticatedTrial: request => consultantLicense.requestTenantTrial(
    request.tenantId, request.installationId),
  config: globalThis.T9TenantLicenseConfig, version: VERSION
});
const recordingLicenseGuard = globalThis.T9RecordingLicenseGuard.create({
  validate: requireRecordingLicense
});

const documentUsage = globalThis.T9DocumentUsage.create({
  storage: chrome.storage.local,
  account: async () => (await consultantLicense.state()).profile,
  send: (event, owner) => consultantLicense.recordUsage(event, owner),
  digest: async value => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",
    new TextEncoder().encode(value))), byte => byte.toString(16).padStart(2, "0")).join("")
});
async function recordDocumentUsage(kind, id, created) {
  try {
    if (created) await documentUsage.enqueue(kind, id);
    void documentUsage.flush().catch(() => {});
  } catch (error) { console.warn("Usage statistics pending", error.message); }
}
void documentUsage.flush().catch(() => {});
// Persistent retries also wake the service worker after an offline save.
chrome.alarms?.create("document-usage-sync", { periodInMinutes: 5 });
chrome.alarms?.onAlarm.addListener(alarm => {
  if (alarm.name === "document-usage-sync") void documentUsage.flush().catch(() => {});
});

async function requireRecordingLicense(url) {
  const account = await consultantLicense.state();
  if (!account.refreshToken) {
    throw new Error("license.signInRequired");
  }
  try { return { source: "tenant", ...(await tenantLicense.requireLicense(url)) }; }
  catch (tenantError) {
    if (!consultantLicense.configured()) throw tenantError;
    const tenantId = globalThis.T9TenantLicense.tenantFromUrl(url);
    const result = await consultantLicense.check(tenantId,
      await tenantLicense.installationId());
    if (!result.allowed) throw tenantError;
    return { source: "consultant", ...result };
  }
}
// The knowledge packs, with Business Central's captions of each rule and those of the apps the user
// added under Settings; loaded again when those apps change.
const loadPageKnowledgePacks = async () => globalThis.BCKnowledgeRepository.load({
  indexUrl: chrome.runtime.getURL("knowledge-packs/index.json"),
  resolveUrl: file => chrome.runtime.getURL(file),
  apps: await globalThis.T9KnowledgeCaptions.loadUserApps()
}).then(result => {
  if (!result.ok) throw new Error(result.diagnostics.map(item => item.code).join(", "));
  const repository = globalThis.BCKnowledgeRepository.createRepository(result.snapshot);
  const snapshot = repository.getRelease();
  const validation = globalThis.T9PageIdentificationEngine.configureKnowledgePacks(
    snapshot.packs
  );
  return { packs: snapshot.packs, snapshot, repository, validation };
}).catch(error => {
  console.warn("Knowledge repository could not be loaded.", error);
  return { packs: [], snapshot: null, validation: { diagnostics: [{
    code: "knowledge-release-load-failed"
  }] } };
});
let pageKnowledgePacksReady = loadPageKnowledgePacks();
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes[globalThis.T9KnowledgeCaptions.appsStorageKey()]) {
    pageKnowledgePacksReady = loadPageKnowledgePacks();
  }
});
const DEFAULT_SETTINGS = {
  uiLocale: "sv-SE",
  documentLanguage: "sv-SE",
  exportFileNamePattern: "{process} - {environment} - {date}",
  documentationProfile: "generic",
  defaultExpectedResult:
    "Stegen beskriver det observerade arbetsflödet. Kontrollera dokumentets " +
    "status och bekräfta om processen kräver bokföring i Business Central.",
  captureScreenshots: true,
  showClickHighlights: true,
  highlightClickTargets: true,
  focusScreenshots: true,
  screenshotMode: "important",
  maskValues: true,
  maxEvents: 20000,
  environmentName: "",
  companyName: "",
  supportEmail: "",
  bugReportEmailMode: "eml",
  advancedOverridesEnabled: false,
  maskSalesOrderNo: true,
  maskPurchaseOrderNo: true,
  maskInvoiceNo: true,
  maskReceiptNo: true,
  maskShipmentNo: true,
  maskProductionOrderNo: true,
  maskPostedDocumentNo: true,
  maskCompanyName: true,
  maskTenantAndUrl: true,
  maskCustomerNo: false,
  maskVendorNo: false,
  maskItemNo: false,
  maskLocationCode: false,
  maskLotBatchNo: false
};

const INITIAL_SETTINGS = { ...DEFAULT_SETTINGS, uiLocale: "en-US", documentLanguage: "en-US" };
function resolveSettings(stored) {
  // Existing installations without language fields keep their historical Swedish defaults.
  return stored ? { ...DEFAULT_SETTINGS, ...stored } : { ...INITIAL_SETTINGS };
}

const STATE_KEY = "t9_state";
const SETTINGS_KEY = "t9_settings";
const {
  BC_ERROR_EVIDENCE_PREFIX,
  BUG_REPORT_PREFIX,
  TEST_RUN_PREFIX,
  TEST_SUITE_PREFIX,
  TEST_SCREENSHOT_PREFIX,
  EVENT_PREFIX,
  RAW_RECORDING_PREFIX,
  RECORDING_PREFIX,
  REVIEW_PREFIX,
  REVIEW_PROGRESS_PREFIX,
  SCREENSHOT_ASSET_PREFIX,
  SCREENSHOT_BLOB_PREFIX,
  SCREENSHOT_MANIFEST_PREFIX,
  SCREENSHOT_PREFIX,
  SESSION_PREFIX
} = globalThis.T9StorageKeys;
const screenshotAssetStore = globalThis.T9ScreenshotAssetStore.create({
  storage: chrome.storage.local,
  legacyLoad: async id => {
    const key = SCREENSHOT_PREFIX + id;
    const data = await chrome.storage.local.get(key);
    return data[key] || {};
  },
  assetPrefix: SCREENSHOT_ASSET_PREFIX,
  blobPrefix: SCREENSHOT_BLOB_PREFIX,
  manifestPrefix: SCREENSHOT_MANIFEST_PREFIX,
  legacyPrefix: SCREENSHOT_PREFIX
});
const bcErrorEvidenceStore = globalThis.T9BcErrorEvidenceStore.create({
  storage: chrome.storage.local,
  prefix: BC_ERROR_EVIDENCE_PREFIX,
  indexPrefix: `${BC_ERROR_EVIDENCE_PREFIX}index_`
});
const rawEventLogStorage = globalThis.T9EventLogStorage.create({
  storage: chrome.storage.local,
  prefix: RAW_RECORDING_PREFIX
});
const canonicalEventLogStorage = globalThis.T9EventLogStorage.create({
  storage: chrome.storage.local,
  prefix: RECORDING_PREFIX
});
const reviewProgressStore = globalThis.T9ReviewProgressStore.create({
  storage: chrome.storage.local, reviewPrefix: REVIEW_PREFIX,
  progressPrefix: REVIEW_PROGRESS_PREFIX,
  isVisible: (task, review) => globalThis.T9ReviewTaskVisibility.isVisible(task, review)
});
const processImprovement = globalThis.T9ProcessImprovementService.create({
  storage: chrome.storage.local, reviewPrefix: REVIEW_PREFIX
});
const DEBUG_KEY = "t9_debug";

let writeQueue = Promise.resolve();
let stoppingSessionId = null;
let errorEvidenceWrites = Promise.resolve();
const tenantLicenseFailureNotifications = new Map();

// Chrome and Edge allow two captureVisibleTab calls per second; 600 ms stays inside that.
const SCREENSHOT_MIN_INTERVAL_MS = 600;
const SCREENSHOT_MAX_QUEUE_ITEMS = 40;
const CANONICAL_SETTLE_TIMEOUT_MS = 60000;
let screenshotQueue = [];
let screenshotWorkerRunning = false;
let screenshotWorkerPromise = Promise.resolve();
let lastScreenshotAt = 0;
// When a screenshot was last asked of Edge, by any part of the recording: Edge allows about
// two a second and refuses more.
let lastCaptureCallAt = 0;
// Screenshots of played steps waiting to be taken; other screenshots wait for them.
let playbackPending = 0;
let lastScreenshotError = null;
const preActionCaptures = new Map();

const screenshotStats = {
  requested: 0,
  captured: 0,
  reused: 0,
  dropped: 0,
  stale: 0,
  errors: 0
};

async function settleBounded(promise, operation) {
  let timer;
  try {
    return await Promise.race([promise, new Promise((_, reject) => {
      timer = setTimeout(() => reject(Object.assign(new Error(
        `Timed out while waiting for ${operation}.`
      ), { code: "canonical-pending-write-timeout", operation })),
      CANONICAL_SETTLE_TIMEOUT_MS);
    })]);
  } finally {
    clearTimeout(timer);
  }
}

function safe(value) {
  return String(value || "BC-process")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    .replace(/\s+/g, "-")
    .slice(0, 100);
}

function sessionId(name) {
  return `${safe(name)}-${new Date().toISOString().replace(/[:.]/g, "-")}`;
}

async function getSettings() {
  const data = await chrome.storage.local.get(SETTINGS_KEY);
  return resolveSettings(data[SETTINGS_KEY]);
}

async function getState() {
  const data = await chrome.storage.local.get(STATE_KEY);
  return data[STATE_KEY] || {
    recording: false,
    sessionId: null,
    tabId: null,
    startedAt: null,
    recordingPurpose: null
  };
}

async function setState(state) {
  await chrome.storage.local.set({ [STATE_KEY]: state });
  await chrome.action.setBadgeText({ text: state.recording ? "REC" : "" });
  await chrome.action.setBadgeBackgroundColor({ color: "#b00020" });
}

// Debug state is read, changed and written back in one queue. Concurrent writers, such as the
// screenshot worker during event capture, otherwise wrote back an older copy and lost counts,
// which made the live status report events as missing. A patch may be a function of the
// current state, for counters that must build on the latest value.
let debugWrites = Promise.resolve();
function setDebug(patch) {
  const operation = debugWrites.then(async () => {
    const data = await chrome.storage.local.get(DEBUG_KEY);
    const current = data[DEBUG_KEY] || {};
    const changes = typeof patch === "function" ? patch(current) : patch;
    await chrome.storage.local.set({ [DEBUG_KEY]: {
      ...current,
      version: VERSION,
      updatedAt: new Date().toISOString(),
      ...changes
    } });
  });
  debugWrites = operation.catch(() => {});
  return operation;
}

function diagnosticUrl(value) {
  try {
    const url = new URL(String(value || ""));
    return `${url.origin}${url.pathname}`.slice(0, 300);
  } catch {
    return "";
  }
}

async function appendCaptureDiagnostic(value = {}, sender = {}) {
  const entry = {
    timestamp: value.timestamp || new Date().toISOString(),
    stage: String(value.stage || "unknown").slice(0, 50),
    eventType: String(value.eventType || "").slice(0, 30),
    targetTag: String(value.targetTag || "").slice(0, 30),
    role: String(value.role || "").slice(0, 50),
    inputType: String(value.inputType || "").slice(0, 30),
    hasValue: Boolean(value.hasValue),
    accepted: value.accepted,
    rejectionReason: String(value.rejectionReason || "").slice(0, 100),
    sourceEventId: String(value.sourceEventId || "").slice(0, 180),
    tabId: sender.tab?.id ?? sender.tabId,
    frameId: sender.frameId,
    parentFrameId: sender.parentFrameId,
    documentId: sender.documentId || ""
  };
  await setDebug(current => {
    const captureStageCounts = { ...(current.captureStageCounts || {}) };
    captureStageCounts[entry.stage] = (captureStageCounts[entry.stage] || 0) + 1;
    return { captureDiagnostics: [...(current.captureDiagnostics || []), entry].slice(-100),
      captureStageCounts, lastCaptureDiagnostic: entry };
  });
}

async function updateFrameDiagnostic(sender = {}, frameUrl = "", frameDepth,
  state = {}, reported = {}) {
  const key = `${sender.tab?.id ?? "?"}:${sender.frameId ?? "?"}:` +
    `${sender.documentId || "unknown"}`;
  const frame = {
    tabId: sender.tab?.id,
    frameId: sender.frameId,
    parentFrameId: sender.parentFrameId,
    documentId: sender.documentId || "",
    url: diagnosticUrl(frameUrl || sender.url),
    origin: (() => { try { return new URL(frameUrl || sender.url).origin; }
      catch { return ""; } })(),
    depth: Number.isInteger(frameDepth) ? frameDepth : undefined,
    injected: true,
    recordable: true,
    recorderActive: Boolean(state.recording),
    contentRecorderActive: Boolean(reported.recorderActive),
    contentDiagnosticsEnabled: Boolean(reported.diagnosticsEnabled),
    lastPingAt: new Date().toISOString()
  };
  await setDebug(current => ({ frameDiagnostics: Object.fromEntries(Object.entries({
    ...(current.frameDiagnostics || {}), [key]: frame }).slice(-100)),
    framePermissionScope: ["https://businesscentral.dynamics.com/*",
      "https://*.businesscentral.dynamics.com/*"],
    externalFramesRequireExplicitHostPermission: true,
    connected: true,
    lastPingAt: new Date().toISOString(),
    lastFrameUrl: diagnosticUrl(frameUrl || sender.url),
    lastError: null }));
}

async function getSession(id) {
  const key = SESSION_PREFIX + id;
  const data = await chrome.storage.local.get(key);
  return data[key] || null;
}

async function saveSession(session) {
  await chrome.storage.local.set({
    [SESSION_PREFIX + session.id]: session
  });
}

async function getEvents(id) {
  const key = EVENT_PREFIX + id;
  const data = await chrome.storage.local.get(key);
  return data[key] || [];
}

async function saveEvents(id, events) {
  await chrome.storage.local.set({
    [EVENT_PREFIX + id]: events
  });
}

async function getScreenshots(id) {
  const result = await screenshotAssetStore.load(id);
  return result.assets;
}

async function saveScreenshot(id, key, image) {
  return screenshotAssetStore.save(id, key, image);
}

async function getScreenshotDataForPaths(id, requestedPaths) {
  const keys = [...new Set((Array.isArray(requestedPaths)
    ? requestedPaths : []).map(globalThis.T9ScreenshotAssetPaths.keyForPath)
    .filter(Boolean))];
  const result = await screenshotAssetStore.load(id, keys);
  return Object.fromEntries(Object.entries(result.assets).map(([key, value]) =>
    [globalThis.T9ScreenshotAssetPaths.pathForKey(key), value]));
}

async function getCanonicalRecording(id) {
  const key = RECORDING_PREFIX + id;
  const data = await chrome.storage.local.get(key);
  if (data[key]?.eventStorageFormat === "chunked-v1") {
    return globalThis.T9CanonicalRecording.normalize(
      await canonicalEventLogStorage.load(id));
  }
  if (data[key]) return globalThis.T9CanonicalRecording.normalize(data[key]);
  const session = await getSession(id);
  if (!session) return null;
  const events = await getEvents(id);
  // Older recordings keep screenshots in one large storage value. Migrate that
  // value once, but build the canonical event/asset index from keys only so the
  // review-open path never materializes every image as a data URL.
  const screenshotManifest = await screenshotAssetStore.manifest(id);
  const screenshotMetadata = Object.fromEntries(screenshotManifest.keys
    .filter(assetKey => /^\d+$/u.test(assetKey))
    .map(assetKey => [assetKey, "data:image/png;base64,"]));
  const recording = globalThis.T9CanonicalRecording.fromLegacy(
    session, events, screenshotMetadata);
  await saveCanonicalRecording(recording);
  return recording;
}

async function saveCanonicalRecording(recording) {
  await canonicalEventLogStorage.save(recording);
}

async function getRawRecording(id) {
  return rawEventLogStorage.load(id);
}

async function saveRawRecording(recording) {
  await rawEventLogStorage.save(recording);
}

const rawEventStore = globalThis.T9RawEventPersistence.createRawStore({
  load: getRawRecording,
  save: saveRawRecording
});

const canonicalStore = globalThis.T9RawEventPersistence.createStore({
  load: getCanonicalRecording,
  save: saveCanonicalRecording
});

const bugReportStore = globalThis.T9BugReportStore.createStore({
  async get(key) {
    const data = await chrome.storage.local.get(key);
    return data[key] || null;
  },
  async set(key, value) {
    const existing = (await chrome.storage.local.get(key))[key];
    await chrome.storage.local.set({ [key]: value });
    await recordDocumentUsage("bug-report", value.bugReportId, !existing);
  },
  async remove(key) { await chrome.storage.local.remove(key); },
  async all() {
    return globalThis.T9StorageQueries.getByPrefixes(
      chrome.storage.local, [BUG_REPORT_PREFIX]
    );
  }
}, BUG_REPORT_PREFIX);

async function technicalDiagnosticsPolicyEnabled() {
  try {
    const policy = await chrome.storage.managed.get("technicalDiagnosticsEnabled");
    return policy?.technicalDiagnosticsEnabled === true;
  } catch {
    return false;
  }
}

// Value regions measured for recent bug report screenshots, by image, until the image is
// stored with its event.
const captureValueRegions = new Map();
// When screenshots were asked for in the last second: Edge allows two a second.
const captureCalls = [];
const CAPTURE_CALLS_PER_SECOND = 2;
function captureSlotWait(now = Date.now()) {
  while (captureCalls.length && now - captureCalls[0] >= 1000) captureCalls.shift();
  return captureCalls.length < CAPTURE_CALLS_PER_SECOND ? 0 : captureCalls[0] + 1000 + 50 - now;
}
function valueRegionsFor(image) {
  const details = captureValueRegions.get(image);
  captureValueRegions.delete(image);
  return details ? { valueRegions: details.regions, valueRegionsComplete: details.complete } : {};
}

// Why the latest capture failed, so that a caller can say what the user can do about it.
let lastCaptureError = "";
async function capture(tabId, options = {}) {
  const captureId = crypto.randomUUID();
  lastCaptureError = "";
  let captureFrames = [0];
  try {
    const tab = await chrome.tabs.get(tabId);
    if (!tab.active) return null;

    try {
      const frames = await chrome.webNavigation.getAllFrames({ tabId });
      captureFrames = [...new Set([0, ...(frames || []).map(frame => frame.frameId)])];
    } catch {}
    const hidden = await Promise.allSettled(captureFrames.map(frameId => chrome.tabs.sendMessage(tabId, {
      type: "T9_SET_INDICATOR_CAPTURE_VISIBILITY", captureId, hidden: true,
      collectValueRegions: Boolean(options.valueRegions),
      collectPlaybackTarget: Boolean(options.playbackTarget)
    }, { frameId })));

    lastCaptureCallAt = Date.now();
    captureCalls.push(lastCaptureCallAt);
    const image = await chrome.tabs.captureVisibleTab(tab.windowId, {
      format: "png"
    });
    if (image && options.valueRegions) {
      // A frame that did not answer may show values that were not measured.
      captureValueRegions.set(image, {
        regions: hidden.flatMap(result => result.value?.valueRegions || []).slice(0, 1000),
        complete: hidden.every(result => Array.isArray(result.value?.valueRegions)) });
      while (captureValueRegions.size > 8) {
        captureValueRegions.delete(captureValueRegions.keys().next().value);
      }
    }
    // Where the control of a played step was as the screenshot was taken, if it still shows.
    if (image && options.playbackTarget) {
      options.playbackTarget.bounds = hidden.map(result => result.value?.playbackBounds)
        .find(Boolean) || null;
    }
    return image;
  } catch (error) {
    lastCaptureError = String(error?.message || error);
    screenshotStats.errors += 1;
    await setDebug({
      lastScreenshotError: String(error),
      screenshotStats: { ...screenshotStats }
    });
    return null;
  } finally {
    await Promise.allSettled(captureFrames.map(frameId => chrome.tabs.sendMessage(tabId, {
      type: "T9_SET_INDICATOR_CAPTURE_VISIBILITY", captureId, hidden: false
    }, { frameId })));
  }
}

async function captureStepRepairScreenshot(recordingId, stepId, returnTabId) {
  const session = await getSession(recordingId);
  if (!session) throw new Error("Inspelningen kunde inte hittas.");
  const target = await businessCentralTabFor(recordingId);
  if (!target) throw new Error("Ingen öppen Business Central-flik hittades.");
  await chrome.tabs.update(target.id, { active: true });
  await chrome.windows.update(target.windowId, { focused: true });
  await new Promise(resolve => setTimeout(resolve, 250));
  const image = await capture(target.id);
  if (returnTabId) {
    try {
      const returnTab = await chrome.tabs.get(returnTabId);
      await chrome.tabs.update(returnTabId, { active: true });
      await chrome.windows.update(returnTab.windowId, { focused: true });
    } catch {}
  }
  if (!image) throw new Error("Den kompletterande skärmbilden kunde inte tas.");
  const capturedAt = new Date().toISOString();
  const safeStepId = String(stepId || "step").replace(/[^a-z0-9_-]+/giu, "-")
    .slice(0, 48);
  const assetKey = `repair-${safeStepId}-${Date.now()}`;
  return { assetKey, assetId: `screenshots/${assetKey}.png`, image,
    capturedAt, tabId: target.id };
}

async function saveStepRepairScreenshot(recordingId, assetKey, image) {
  if (!/^repair-[a-z0-9_-]+-\d+$/iu.test(String(assetKey || "")) ||
      !String(image || "").startsWith("data:image/png;base64,")) {
    throw new Error("Den kompletterande skärmbilden är ogiltig.");
  }
  if (!await getSession(recordingId)) {
    throw new Error("Inspelningen kunde inte hittas.");
  }
  await saveScreenshot(recordingId, assetKey, image);
  return { assetId: `screenshots/${assetKey}.png` };
}

async function enqueueScreenshot({
  sessionId,
  eventNo,
  eventId,
  tabId,
  category,
  captureKey = ""
}) {
  screenshotStats.requested += 1;
  const result = globalThis.T9ScreenshotQueuePolicy.enqueue(screenshotQueue, {
    sessionId, eventNo, eventId, tabId, category, captureKey,
    queuedAt: Date.now()
  }, SCREENSHOT_MAX_QUEUE_ITEMS);
  if (result.reused) {
    screenshotStats.reused += 1;
    await setDebug({
      screenshotQueueLength: screenshotQueue.length,
      screenshotStats: { ...screenshotStats }
    });
    return;
  }
  if (result.dropped) {
    screenshotStats.dropped += result.dropped.targets?.length || 1;
  }

  await setDebug({
    screenshotQueueLength: screenshotQueue.length,
    screenshotStats: { ...screenshotStats }
  });

  if (!screenshotWorkerRunning) {
    screenshotWorkerPromise = processScreenshotQueue();
  }
}

async function processScreenshotQueue() {
  if (screenshotWorkerRunning) return;
  screenshotWorkerRunning = true;

  try {
    while (screenshotQueue.length) {
      // A played step's control can be gone a moment later: its screenshot goes first, such
      // as before that of the click that stepped the script on.
      for (const until = Date.now() + 4000; playbackPending > 0 && Date.now() < until;) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      const waitMs = Math.max(
        0,
        SCREENSHOT_MIN_INTERVAL_MS - (Date.now() - Math.max(lastScreenshotAt, lastCaptureCallAt)),
        captureSlotWait()
      );

      if (waitMs > 0) {
        await new Promise(resolve => setTimeout(resolve, waitMs));
      }

      const { item, stale } = globalThis.T9ScreenshotQueuePolicy.next(screenshotQueue, Date.now());
      if (stale.length) {
        screenshotStats.dropped += stale.reduce((sum, value) => sum + (value.targets?.length || 1), 0);
        screenshotStats.stale += stale.length;
        await setDebug({ screenshotQueueLength: screenshotQueue.length,
          screenshotStats: { ...screenshotStats } });
      }
      if (!item) continue;

      const state = await getState();
      if (!state.recording || state.sessionId !== item.sessionId) {
        screenshotStats.dropped += 1;
        await setDebug({ screenshotQueueLength: screenshotQueue.length,
          screenshotStats: { ...screenshotStats } });
        continue;
      }

      const itemSession = await getSession(item.sessionId);
      const image = await capture(item.tabId || state.tabId,
        { valueRegions: itemSession?.recordingPurpose === "bug-report" });
      lastScreenshotAt = Date.now();
      const regionDetails = image ? valueRegionsFor(image) : {};

      if (!image) {
        screenshotStats.dropped += 1;
        await setDebug({ screenshotQueueLength: screenshotQueue.length,
          screenshotStats: { ...screenshotStats } });
        continue;
      }

      // One stable capture may represent nearby events, but every event must retain
      // an addressable screenshot so the complete recording is available in Review.
      const targets = item.targets?.length ? item.targets :
        [{ eventNo: item.eventNo, eventId: item.eventId }];
      const capturedAt = new Date().toISOString();
      const registration = await globalThis.T9ScreenshotTargetRegistration.register({
        targets,
        async saveAsset(target) {
          await saveScreenshot(item.sessionId, String(target.eventNo), image);
        },
        associate(target) {
          return canonicalStore.associateScreenshot(
            item.sessionId, target.eventId, image, capturedAt, regionDetails
          );
        }
      });
      if (registration.failures.length) {
        screenshotStats.errors += registration.failures.length;
        screenshotStats.dropped += registration.failures.length;
        lastScreenshotError = String(registration.failures[0].error?.message ||
          registration.failures[0].error);
      }
      if (registration.saved) screenshotStats.captured += 1;

      await setDebug({
        screenshotQueueLength: screenshotQueue.length,
        screenshotStats: { ...screenshotStats },
        lastScreenshotAt: new Date().toISOString(),
        lastScreenshotError: registration.failures.length
          ? lastScreenshotError : null
      });
    }
  } finally {
    screenshotWorkerRunning = false;
  }
}

// Screenshots of played steps are taken one at a time, at Edge's pace for screenshots, in the
// order the steps were played. The page finds the step's control and waits briefly for the
// value the step entered; the screenshot is taken whether or not the control was found.
const PLAYBACK_TARGET_TIMEOUT_MS = 2500;
const PLAYBACK_CAPTURE_ATTEMPTS = 3;
let playbackScreenshots = Promise.resolve();
// How many steps Page Scripting has announced in this service worker. A screenshot taken after
// a later step was announced, in which the step's own control is no longer shown, most likely
// shows that later step and is left out: no screenshot is better than one of another step.
let playbackAnnounced = 0;
function schedulePlaybackScreenshot(item) {
  screenshotStats.requested += 1;
  playbackPending += 1;
  playbackScreenshots = playbackScreenshots.then(() => takePlaybackScreenshot(item)).catch(error => {
    screenshotStats.errors += 1;
    lastScreenshotError = String(error?.message || error);
  }).finally(() => { playbackPending -= 1; });
}
async function takePlaybackScreenshot({ recordingId, eventNo, eventId, tabId, frameId, step, order = 0 }) {
  const state = await getState();
  if (!state.recording || state.sessionId !== recordingId || !tabId) return;
  await Promise.race([
    chrome.tabs.sendMessage(tabId, { type: "T9_PLAYBACK_TARGET", kind: step.kind,
      caption: step.caption, value: step.value, operationText: step.operationText || "",
      label: step.label || "" }, { frameId }).catch(() => null),
    new Promise(resolve => setTimeout(() => resolve(null), PLAYBACK_TARGET_TIMEOUT_MS + 500))]);
  // The control is measured as the screenshot is taken, so the outline is where it is shown.
  // Edge refuses a screenshot asked too soon after another, such as those of the click that
  // stepped the script on; it is asked again, a few times.
  const playbackTarget = {};
  let image = null;
  for (let attempt = 0; attempt < PLAYBACK_CAPTURE_ATTEMPTS && !image; attempt += 1) {
    // Taken as soon as Edge allows, which can be right after another screenshot; once a
    // screenshot was refused, at Edge's usual pace.
    const waitMs = attempt === 0 ? captureSlotWait()
      : SCREENSHOT_MIN_INTERVAL_MS - (Date.now() - Math.max(lastScreenshotAt, lastCaptureCallAt));
    if (waitMs > 0) await new Promise(resolve => setTimeout(resolve, waitMs));
    if (!(await getState()).recording) return;
    const overtaken = order > 0 && playbackAnnounced > order;
    image = await capture(tabId, { playbackTarget });
    lastScreenshotAt = Date.now();
    if (image && overtaken && !playbackTarget.bounds) {
      screenshotStats.dropped += 1;
      return;
    }
  }
  if (!image) { screenshotStats.dropped += 1; return; }
  await saveScreenshot(recordingId, String(eventNo), image);
  await canonicalStore.associateScreenshot(recordingId, eventId, image, new Date().toISOString(),
    playbackTarget.bounds ? { highlight: playbackTarget.bounds } : {});
  screenshotStats.captured += 1;
}

async function consumePreActionCapture(event, captureContext, recordingId) {
  const id = event.preActionCaptureId;
  if (!id) return null;
  const pending = preActionCaptures.get(id);
  preActionCaptures.delete(id);
  if (!pending || pending.sessionId !== recordingId ||
      pending.tabId !== (captureContext.tabId || pending.tabId) ||
      Date.now() - pending.createdAt > 10000) return null;
  return pending.promise;
}

async function recordEvent(rawEvent, captureContext = {}) {
  const acceptedState = await getState();
  if (!acceptedState.recording || !acceptedState.sessionId ||
      stoppingSessionId === acceptedState.sessionId) return;
  try {
    await requireActiveTenantLicense(acceptedState);
  } catch (error) {
    await setDebug({ lastError: String(error), recordingHealth: {
      status: "license-error", occurredAt: new Date().toISOString(),
      operation: "tenant-license" } });
    throw error;
  }

  let rawEventPersisted = false;
  let canonicalEventPersisted = false;
  const operation = writeQueue.then(async () => {
    const recordingId = acceptedState.sessionId;
    const session = await getSession(recordingId);
    if (!session || session.status !== "recording") return;

    const settings = session.settings || await getSettings();
    const sourceEventId = rawEvent?.sourceEventId ||
      `${recordingId}:background:${crypto.randomUUID()}`;
    const sourceEvent = {
      ...rawEvent,
      recordingId,
      timestamp: rawEvent?.timestamp || new Date().toISOString(),
      sourceEventId,
      tabId: captureContext.tabId ?? rawEvent?.tabId,
      browserFrameId: captureContext.frameId ?? rawEvent?.browserFrameId,
      parentFrameId: captureContext.parentFrameId ?? rawEvent?.parentFrameId,
      documentId: captureContext.documentId || rawEvent?.documentId,
      frameOrigin: captureContext.origin || rawEvent?.frameOrigin,
      captureProvenance: {
        ...(rawEvent?.captureProvenance || {}),
        tabId: captureContext.tabId ?? rawEvent?.tabId,
        frameId: captureContext.frameId ?? rawEvent?.browserFrameId,
        documentId: captureContext.documentId || rawEvent?.documentId
      }
    };

    // A bug report keeps its values, apart from secrets, so that masking can be chosen in
    // each report; it derives a masked version of its steps when it is created.
    const privacySafeEvent = globalThis.T9PrivacyMask.keepTypedValue(sourceEvent, globalThis.T9PrivacyMask
      .maskFieldValues(sourceEvent, session.recordingPurpose === "bug-report" &&
        settings.maskValues !== false ? { ...settings, maskValues: "secrets" } : settings));

    const rawResult = await rawEventStore.appendRawEvent(
      recordingId, privacySafeEvent, { maxEvents: settings.maxEvents }
    );
    if (rawResult.status === "truncated") {
      await setDebug({ lastError: "Maximalt antal händelser har uppnåtts.",
        recordingHealth: { status: "truncated",
          diagnostic: rawResult.diagnostic } });
      return;
    }
    rawEventPersisted = true;
    const debugState = await chrome.storage.local.get(DEBUG_KEY);
    if (debugState[DEBUG_KEY]?.captureDiagnosticsEnabled) {
      await appendCaptureDiagnostic({ stage: "raw-event-persisted",
        eventType: rawResult.event.type, accepted: true, sourceEventId },
      captureContext);
    }

    // Raw persistence assigns the authoritative sequence, so a new event does
    // not need a full canonical preload before the append transaction. Read it
    // only for a duplicate raw event, where retry recovery must detect whether
    // canonical projection already completed.
    const canonicalBefore = rawResult.status === "duplicate"
      ? await getCanonicalRecording(recordingId) : null;
    const alreadyCanonical = Boolean(canonicalBefore?.events.some(item =>
      item.source?.eventId === sourceEventId
    ));
    const event = { ...rawResult.event,
      eventNo: rawResult.event.acceptedSequence };

    // Interpretation starts only after authoritative raw persistence succeeds.
    await pageKnowledgePacksReady;
    const canonicalEventId = `${recordingId}:event:${sourceEventId}`;
    const canonical = alreadyCanonical ? canonicalBefore :
      await canonicalStore.append(recordingId, event,
        globalThis.T9BCUIIdentification.identify(event, {
          eventId: canonicalEventId
        }));
    const canonicalEvent = canonical.events.find(item =>
      item.source?.eventId === event.sourceEventId
    );
    canonicalEventPersisted = Boolean(canonicalEvent);
    if (!canonicalEventPersisted) {
      throw new Error("Canonical event append completed without a matching event.");
    }
    if (debugState[DEBUG_KEY]?.captureDiagnosticsEnabled) {
      await appendCaptureDiagnostic({ stage: "canonical-event-appended",
        eventType: event.type, accepted: true, sourceEventId }, captureContext);
    }
    // The canonical event store is authoritative during capture. Keep the
    // legacy event-array snapshot for compatibility, but write it once when
    // the recording is finalized instead of rewriting the growing array for
    // every captured interaction.
    session.eventCount = canonical.events.length;
    session.updatedAt = event.timestamp;
    await saveSession(session);
    if (session.testRunId) scheduleLiveTestCheck(recordingId);

    if (alreadyCanonical) return { recordingId, canonicalEvent, event };

    // A step Page Scripting plays during a test is announced, not clicked: its screenshot is
    // taken once its field or button is found, with that control outlined.
    const playedStep = session.testRunId && event.type === "status-message" &&
      settings.captureScreenshots !== false && settings.screenshotMode !== "none"
      ? globalThis.T9TestRecordingMatch.playbackStep(event.label) : null;
    if (playedStep) playbackAnnounced += 1;
    if (playedStep && playedStep.kind !== "open") {
      schedulePlaybackScreenshot({ recordingId, eventNo: event.eventNo, eventId: canonicalEvent.id,
        order: playbackAnnounced,
        tabId: captureContext.tabId || acceptedState.tabId, frameId: captureContext.frameId ?? 0,
        step: { ...playedStep, label: String(event.label || "") } });
    } else if (globalThis.T9ScreenshotCapturePolicy.shouldCapture(settings, event)) {
      const captureCategory = globalThis.T9ScreenshotCapturePolicy.category(event);
      const preActionImage = await consumePreActionCapture(event,
        captureContext, recordingId);
      if (preActionImage) {
        let preActionSaved = false;
        try {
          await saveScreenshot(recordingId, String(event.eventNo), preActionImage);
          preActionSaved = true;
        } catch (error) {
          screenshotStats.errors += 1;
          screenshotStats.dropped += 1;
          lastScreenshotError = String(error?.message || error);
          await setDebug({ screenshotStats: { ...screenshotStats },
            lastScreenshotError });
        }
        if (preActionSaved) {
          await canonicalStore.associateScreenshot(recordingId,
            canonicalEvent.id, preActionImage, new Date().toISOString(),
            valueRegionsFor(preActionImage));
          lastScreenshotAt = Date.now();
          screenshotStats.captured += 1;
        } else {
          await enqueueScreenshot({ sessionId: recordingId,
            eventNo: event.eventNo, eventId: canonicalEvent.id,
            tabId: captureContext.tabId || acceptedState.tabId,
            category: captureCategory,
            captureKey: globalThis.T9ScreenshotCapturePolicy.captureKey(event) });
        }
      } else {
        await enqueueScreenshot({
          sessionId: recordingId,
          eventNo: event.eventNo,
          eventId: canonicalEvent.id,
          tabId: captureContext.tabId || acceptedState.tabId,
          category: captureCategory,
          captureKey: globalThis.T9ScreenshotCapturePolicy.captureKey(event)
        });
      }
    }

    // Counters build on the latest debug state inside the write. A repeated delivery of a stored
    // event does not count again, so gaps stay exact.
    await setDebug(current => ({
      ...globalThis.T9RecordingLiveStatus.incrementEventCounts(current, event),
      captureSequence: rawResult.status === "duplicate"
        ? current.captureSequence || {}
        : globalThis.T9CaptureSequence.track(current.captureSequence, sourceEvent),
      connected: true,
      activeSessionId: recordingId,
      eventCount: canonical.events.length,
      screenshotQueueLength: screenshotQueue.length,
      screenshotStats: { ...screenshotStats },
      recentSteps: rawResult.status === "duplicate" ? current.recentSteps || []
        : globalThis.T9RecordingLiveStatus.addStep(current.recentSteps, sourceEvent),
      lastEvent: {
        eventNo: event.eventNo,
        type: event.type,
        category: event.category,
        actionCaption: event.actionCaption || "",
        fieldName: event.fieldName || "",
        controlCaption: event.controlCaption || "",
        pageCaption: event.pageCaption || "",
        capturedAt: event.timestamp || "",
        hasAccessibleLabel: Boolean(
          event.label || event.fieldName || event.pageCaption
        )
      },
      lastError: null
    }));
    return { recordingId, canonicalEvent, event };
  });
  writeQueue = globalThis.T9RecoveringQueue.recover(operation, async error => {
    await setDebug({ lastError: String(error), recordingHealth:
      globalThis.T9RecordingLiveStatus.persistenceFailure({ rawEventPersisted,
        canonicalEventPersisted, occurredAt: new Date().toISOString() }) });
  });

  return operation;
}

// A marker and its opposite: what the recording panel does when a choice is changed or undone.
// The recording only grows; the latest marker for a step decides (see event-step-grouping.js).
const CAPTURE_GUIDANCE_KINDS = new Set([
  "use-image", "new-section", "ignore",
  "include", "no-section", "auto-image", "first-section-title"
]);
const SECTION_TITLE_MAX = 80;
function sectionTitleText(value) {
  return String(value ?? "").replace(/[\p{Cc}\p{Cf}]+/gu, " ").replace(/\s+/gu, " ").trim()
    .slice(0, SECTION_TITLE_MAX);
}

// A refused marker carries a code as well as its message, so a page can explain it in the
// interface language.
function guidanceError(message, code) {
  return Object.assign(new Error(message), { code });
}

async function recordCaptureGuidance(kind, sender = {}, options = {}) {
  if (!CAPTURE_GUIDANCE_KINDS.has(kind)) {
    throw guidanceError("Ok\u00e4nd inspelningsmarkering.", "unknown-kind");
  }
  const state = await getState();
  // The recording panel beside Business Central is an extension page without a tab of its
  // own; it marks a step of the active recording, wherever that recording runs.
  const fromPanel = !sender.tab && extensionPageSender(sender);
  if (!state.recording || !state.sessionId ||
      !(fromPanel || sender.tab?.id === state.tabId)) {
    throw guidanceError("Ingen aktiv inspelning hittades i den h\u00e4r fliken.", "no-recording");
  }
  // The first section's name belongs to the recording, not to a step; only the panel names it.
  // An empty name returns it to its number.
  if (kind === "first-section-title") {
    if (!fromPanel) throw guidanceError("Okänd inspelningsmarkering.", "unknown-kind");
    const sectionTitle = sectionTitleText(options.sectionTitle);
    const recorded = await recordEvent({ type: "capture-guidance", category: "guidance",
      guidanceKind: kind, sectionTitle, source: "recording-panel" },
    { tabId: state.tabId, origin: sender.origin || sender.url });
    return { sectionTitle, markerSourceEventId: recorded?.canonicalEvent?.id || "" };
  }
  await settleBounded(writeQueue, "accepted event writes before guidance");
  if (kind === "use-image") {
    await settleBounded(screenshotWorkerPromise,
      "screenshot registrations before image guidance");
  }
  const recording = await getCanonicalRecording(state.sessionId);
  const candidates = [...(recording.events || [])].reverse().filter(event =>
    event.raw?.type !== "capture-guidance");
  // The panel names the step it marks by the recorded events it was made from: an earlier step,
  // or a step made of several user actions. Only events of this recording can be marked.
  const requested = fromPanel && Array.isArray(options.targetSourceEventIds)
    ? [...new Set(options.targetSourceEventIds.filter(id => typeof id === "string" && id))]
      .slice(0, 500) : [];
  let targets;
  if (requested.length) {
    const byId = new Map(candidates.map(event => [event.id, event]));
    targets = requested.map(id => byId.get(id));
    if (targets.some(event => !event)) {
      throw guidanceError("Steget finns inte i den h\u00e4r inspelningen.", "no-step");
    }
  } else {
    // The latest step the user took, as the recording panel shows it: moving into a field is
    // not a step, so a marker made before typing applies to the previous step.
    const latest = candidates.find(event => globalThis.T9RecordingLiveStatus.isUserStep({
      interactionId: event.raw?.interactionId || event.interaction?.id,
      category: event.raw?.category })) ||
      candidates.find(event => event.raw?.interactionId || event.interaction?.id) || candidates[0];
    targets = latest ? [latest] : [];
  }
  const target = targets[0];
  if (!target) throw guidanceError("Registrera ett steg innan du markerar det.", "no-step");
  // A step the panel names is marked by its own events only. Several steps can come from one
  // user interaction, such as an empty step before a value typed in the same field, so marking
  // by the interaction would also change the step after it.
  const targetInteractionId = requested.length ? ""
    : target.raw?.interactionId || target.interaction?.id || "";
  // An image chosen in the panel must be one of the step's own; otherwise the step's latest.
  const stepImages = targets.map(event => event.screenshotAssetId).filter(Boolean);
  const chosenImage = typeof options.preferredScreenshotAssetId === "string"
    ? options.preferredScreenshotAssetId : "";
  if (kind === "use-image" && chosenImage && !stepImages.includes(chosenImage)) {
    throw guidanceError("Bilden h\u00f6r inte till steget.", "no-image");
  }
  // The floating box has always sent the step's image with every marker; the panel sends an
  // image only when the user chose one, so a later marker never replaces that choice.
  const preferredScreenshotAssetId = kind === "use-image"
    ? chosenImage || stepImages.at(-1) || "" : fromPanel ? "" : target.screenshotAssetId || "";
  if (kind === "use-image" && !preferredScreenshotAssetId) {
    throw guidanceError("Det finns \u00e4nnu ingen bild f\u00f6r det senaste steget.", "no-image");
  }
  const sectionTitle = kind === "new-section" ? sectionTitleText(options.sectionTitle) : "";
  const recorded = await recordEvent({
    type: "capture-guidance", category: "guidance", guidanceKind: kind,
    targetSourceEventId: target.id,
    ...(targets.length > 1 ? { targetSourceEventIds: targets.map(event => event.id) } : {}),
    ...(targetInteractionId ? { targetInteractionId } : {}),
    ...(preferredScreenshotAssetId ? { preferredScreenshotAssetId } : {}),
    ...(sectionTitle ? { sectionTitle } : {}),
    source: fromPanel ? "recording-panel" : "recording-indicator"
  }, fromPanel ? { tabId: state.tabId, origin: sender.origin || sender.url }
    : { tabId: sender.tab?.id, frameId: sender.frameId,
      parentFrameId: sender.parentFrameId, documentId: sender.documentId,
      origin: sender.origin || sender.url });
  const raw = target.raw || {};
  return { targetSourceEventId: target.id,
    // What the panel names in its confirmation: the caption the user acted on.
    targetLabel: String(raw.actionCaption || raw.fieldName || raw.controlCaption ||
      raw.label || "").replace(/\s+/g, " ").trim().slice(0, 100),
    targetInteractionId: targetInteractionId || undefined,
    markerSourceEventId: recorded?.canonicalEvent?.id || "",
    preferredScreenshotAssetId: preferredScreenshotAssetId || undefined };
}

async function saveBcErrorEvidence(evidence) {
  const normalized = globalThis.T9BcDiagnosticEvidence.normalize(evidence);
  return bcErrorEvidenceStore.save(normalized);
}

async function getBcErrorEvidenceForRecording(recordingId) {
  const stored = (await bcErrorEvidenceStore.list(recordingId))
    .map(value => globalThis.T9BcDiagnosticEvidence.normalize(value))
    .sort((a, b) => String(a.capturedAt).localeCompare(String(b.capturedAt)));
  if (stored.length) {
    const recording = await getCanonicalRecording(recordingId);
    const candidates = globalThis.T9BcDiagnosticEvidence.recoverFromRecording(
      recording || {});
    const candidateByMessage = new Map();
    for (const candidate of candidates) {
      if (candidate.rawMessage && candidate.supportUrl &&
          !candidateByMessage.has(candidate.rawMessage)) {
        candidateByMessage.set(candidate.rawMessage, candidate);
      }
    }
    const enriched = [];
    for (const item of stored) {
      const candidate = candidateByMessage.get(item.rawMessage);
      const next = candidate && candidate.supportUrl !== item.supportUrl
        ? globalThis.T9BcDiagnosticEvidence.normalize({ ...item,
          supportUrl: candidate.supportUrl }) : item;
      if (next !== item) await saveBcErrorEvidence(next);
      enriched.push(next);
    }
    return enriched;
  }
  const recording = await getCanonicalRecording(recordingId);
  const recovered = globalThis.T9BcDiagnosticEvidence.recoverFromRecording(recording || {});
  for (const item of recovered) await saveBcErrorEvidence(item);
  return recovered;
}

// The possible cause of a captured error message, or null. A failure only leaves it out: the error
// itself is already saved.
async function latestErrorCause(message) {
  try {
    await globalThis.T9ErrorCause?.loadKnown?.();
    const cause = globalThis.T9ErrorCause?.suggest?.([message]);
    return cause ? JSON.parse(JSON.stringify(cause)) : null;
  } catch {
    return null;
  }
}

async function captureBcErrorEvidence(input, sender) {
  const state = await getState();
  if (state.recording) await requireActiveTenantLicense(state);
  const session = state.sessionId ? await getSession(state.sessionId) : null;
  if (!state.recording || (session?.recordingPurpose !== "bug-report" && !session?.testRunId)) {
    return null;
  }
  const recording = await getCanonicalRecording(state.sessionId);
  const preceding = [...recording.events].reverse().find(item =>
    !["focus", "page-state", "dialog-open", "bc-error"].includes(item.raw?.type));
  let evidence = await saveBcErrorEvidence({ ...input,
    recordingId: state.sessionId,
    supportUrl: globalThis.T9BcDiagnosticEvidence.supportUrl(
      input.supportUrl || input.frameContext?.topUrl),
    precedingActionEventId: preceding?.id || null,
    triggerRelationship: preceding ? "preceding-interaction-candidate" : "none",
    frameContext: { ...(input.frameContext || {}), tabId: sender.tab?.id,
      frameId: sender.frameId, parentFrameId: sender.parentFrameId,
      documentId: sender.documentId,
      frameUrl: diagnosticUrl(input.frameContext?.frameUrl),
      topUrl: diagnosticUrl(input.frameContext?.topUrl),
      frameOrigin: diagnosticUrl(sender.origin || sender.url) },
    diagnosticsStatus: input.rawDiagnostics ? "diagnostics-captured" :
      input.diagnosticsAvailable ? "diagnostics-capture-failed" :
        "diagnostics-unavailable",
    screenshotStatus: "not-attempted" });
  const recorded = await recordEvent({ type: "bc-error", category: "diagnostic",
    timestamp: evidence.capturedAt, label: "Business Central error",
    errorEvidenceId: evidence.errorEvidenceId,
    precedingActionEventId: evidence.precedingActionEventId,
    diagnosticCaptureStatus: evidence.diagnosticsStatus }, {
      tabId: sender.tab?.id, frameId: sender.frameId,
      parentFrameId: sender.parentFrameId, documentId: sender.documentId,
      origin: sender.origin || sender.url
    });
  evidence = await saveBcErrorEvidence({ ...evidence,
    canonicalEventId: recorded?.canonicalEvent?.id || null,
    screenshotStatus: "screenshot-requested" });
  const image = await capture(sender.tab?.id || state.tabId, { valueRegions: true });
  if (image && recorded?.canonicalEvent) {
    const associatedRecording = await canonicalStore.associateScreenshot(
      state.sessionId, recorded.canonicalEvent.id, image, new Date().toISOString(),
      valueRegionsFor(image));
    const associated = associatedRecording.events.find(item =>
      item.id === recorded.canonicalEvent.id);
    await saveScreenshot(state.sessionId, String(recorded.event.eventNo), image);
    evidence = await saveBcErrorEvidence({ ...evidence,
      errorScreenshotAssetId: associated?.screenshotAssetId || null,
      screenshotStatus: "screenshot-captured" });
  } else {
    evidence = await saveBcErrorEvidence({ ...evidence,
      screenshotStatus: "screenshot-failed" });
  }
  await setDebug({ bcErrorCapture: {
    detected: true, messageCaptured: Boolean(evidence.rawMessage),
    detailsAvailable: Boolean(evidence.diagnosticsAvailable),
    diagnosticAcquisitionAttempted: Boolean(evidence.diagnosticsAvailable),
    diagnosticAcquisitionSucceeded: Boolean(evidence.rawDiagnostics),
    rawCallStackPresent: evidence.callStackAvailable,
    screenshotRequested: true,
    screenshotSucceeded: evidence.screenshotStatus === "screenshot-captured",
    evidencePersisted: true, bugReportLinked: false
  } });
  const updatedSession = await getSession(state.sessionId);
  if (updatedSession) { updatedSession.errorEvidenceCount = Number(
    updatedSession.errorEvidenceCount || 0) + 1;
    updatedSession.lastErrorCaptureStatus = evidence.rawDiagnostics
      ? "details-captured" : "error-captured";
    // The possible cause of the latest error, so that the recording panel can show it while the
    // user still is in Business Central. It is read from the message only, like the report's.
    updatedSession.lastErrorCause = { errorEvidenceId: evidence.errorEvidenceId,
      capturedAt: evidence.capturedAt, cause: await latestErrorCause(evidence.rawMessage) };
    updatedSession.updatedAt = new Date().toISOString();
    await saveSession(updatedSession);
  }
  return evidence;
}



const CONTENT_SCRIPT_ID = "thinknine-bc-recorder-main";
// Must match manifest.json content_scripts so dynamically injected frames get
// the same capture helpers as statically injected ones.
const CAPTURE_SCRIPT_FILES = Object.freeze([
  "engine/business-central-version-capture.js", "capture-field-privacy.js", "capture-value-regions.js",
  "capture-focus-session.js", "capture-keyboard.js", "capture-delivery.js", "capture-surface-mode.js",
  "engine/bc-client-captions.js", "bc-error-detector.js",
  "capture-indicator-i18n.js", "content.js"
]);

// The manifest runs al-identity-capture.js in the page's own world in every Business Central
// page that loads. A tab that was open before the extension was installed or updated gets it
// here, with the capture scripts. It guards against running twice, and a failure only means
// that tab's steps are recorded without the names a Page Scripting test needs.
async function injectAlIdentityCapture(tabId) {
  try {
    await chrome.scripting.executeScript({ target: { tabId, allFrames: true },
      files: ["al-identity-capture.js"], world: "MAIN" });
  } catch {}
}

async function registerRecorderContentScript() {
  try {
    const registered = await chrome.scripting.getRegisteredContentScripts({
      ids: [CONTENT_SCRIPT_ID]
    });

    if (registered.length) {
      await chrome.scripting.unregisterContentScripts({
        ids: [CONTENT_SCRIPT_ID]
      });
    }

    await chrome.scripting.registerContentScripts([{
      id: CONTENT_SCRIPT_ID,
      matches: [
        "https://businesscentral.dynamics.com/*",
        "https://*.businesscentral.dynamics.com/*"
      ],
      js: [...CAPTURE_SCRIPT_FILES],
      allFrames: true,
      matchOriginAsFallback: true,
      runAt: "document_start",
      persistAcrossSessions: true,
      world: "ISOLATED"
    }]);

    await setDebug({
      contentScriptRegistered: true,
      contentScriptRegistrationId: CONTENT_SCRIPT_ID,
      lastRegistrationAt: new Date().toISOString(),
      lastRegistrationError: null
    });

    return true;
  } catch (error) {
    await setDebug({
      contentScriptRegistered: false,
      lastRegistrationError: String(error),
      lastError: `Registrering av content script misslyckades: ${String(error)}`
    });
    return false;
  }
}

async function getRecorderRegistrationStatus() {
  try {
    const registered = await chrome.scripting.getRegisteredContentScripts({
      ids: [CONTENT_SCRIPT_ID]
    });

    return {
      registered: registered.length === 1,
      registrations: registered
    };
  } catch (error) {
    return {
      registered: false,
      registrations: [],
      error: String(error)
    };
  }
}

async function injectRecorderIntoExistingBcTabs() {
  const tabs = await chrome.tabs.query({
    url: [
      "https://businesscentral.dynamics.com/*",
      "https://*.businesscentral.dynamics.com/*"
    ]
  });

  const results = [];

  for (const tab of tabs) {
    if (!tab.id) continue;

    try {
      await chrome.scripting.executeScript({
        target: {
          tabId: tab.id,
          allFrames: true
        },
        files: [...CAPTURE_SCRIPT_FILES],
        world: "ISOLATED"
      });
      await injectAlIdentityCapture(tab.id);
      results.push({ tabId: tab.id, ok: true });
    } catch (error) {
      results.push({
        tabId: tab.id,
        ok: false,
        error: String(error)
      });
    }
  }

  await setDebug({
    existingTabInjectionResults: results,
    lastExistingTabInjectionAt: new Date().toISOString()
  });

  return results;
}

async function pingContentScript(tabId) {
  try {
    return await chrome.tabs.sendMessage(tabId, {
      type: "T9_CONTENT_PING"
    });
  } catch {
    return null;
  }
}

async function ensureContentScript(tabId) {
  if ((await pingContentScript(tabId))?.ok) {
    await setDebug({
      connected: true,
      connectedTabId: tabId,
      lastPingAt: new Date().toISOString(),
      lastError: null
    });
    return true;
  }

  try {
    await chrome.scripting.executeScript({
      target: {
        tabId,
        allFrames: true
      },
      files: [...CAPTURE_SCRIPT_FILES]
    });
    await injectAlIdentityCapture(tabId);
  } catch (error) {
    await setDebug({
      connected: false,
      connectedTabId: tabId,
      lastError: `Kunde inte injicera content script: ${String(error)}`
    });
    return false;
  }

  await new Promise(resolve => setTimeout(resolve, 500));
  const connected = Boolean((await pingContentScript(tabId))?.ok);

  await setDebug({
    connected,
    connectedTabId: tabId,
    lastPingAt: connected ? new Date().toISOString() : null,
    lastError: connected
      ? null
      : "Business Central-fliken svarade inte efter manuell injicering."
  });

  return connected;
}

async function requireActiveTenantLicense(state) {
  if (!globalThis.T9TenantLicenseConfig.enabled || !state.recording) return;
  try {
    const licenseTenantId = state.licenseTenantId ||
      (await getSession(state.sessionId))?.licenseTenantId;
    const tab = await chrome.tabs.get(state.tabId);
    await recordingLicenseGuard.check({ recordingId: state.sessionId,
      licenseTenantId, url: tab.url });
  } catch (error) {
    const sessionId = String(state.sessionId || "");
    const errorMessage = String(error);
    const previous = tenantLicenseFailureNotifications.get(sessionId);
    if (previous?.errorMessage === errorMessage) await previous.promise;
    else {
      const promise = setDebug({ lastError: errorMessage, recordingHealth: {
        status: "license-error", occurredAt: new Date().toISOString(),
        operation: "tenant-license" } }).catch(writeError => {
          if (tenantLicenseFailureNotifications.get(sessionId)?.promise === promise) {
            tenantLicenseFailureNotifications.delete(sessionId);
          }
          throw writeError;
        });
      tenantLicenseFailureNotifications.set(sessionId, { errorMessage, promise });
      await promise;
    }
    throw error;
  }
}

async function startSession(message, tabId) {
  await requireRecordingLicense((await chrome.tabs.get(tabId)).url);
  const previousState = await getState();
  if (previousState.recording || previousState.sessionId) {
    throw new Error("En inspelning är redan aktiv. Stoppa eller avbryt den innan en ny startas.");
  }
  const connected = await ensureContentScript(tabId);
  if (!connected) {
    throw new Error(
      "Inspelningsskriptet kunde inte ansluta till Business Central-fliken. " +
      "Uppdatera BC med Ctrl+F5 och försök igen."
    );
  }

  const storedSettings = await getSettings();
  const recordingTab = await chrome.tabs.get(tabId);
  const urlContext = globalThis.T9BusinessCentralUrlContext
    .parseBusinessCentralUrl(recordingTab.url);
  const contentContext = (await pingContentScript(tabId))?.observedContext || {};
  const observedContext = {
    ...urlContext,
    companyName: urlContext.companyName || contentContext.companyName || "",
    businessCentralVersions: contentContext.businessCentralVersions || {}
  };
  const environmentChanged = Boolean(observedContext.environmentName) &&
    observedContext.environmentName !==
      (storedSettings.businessCentralEnvironment || storedSettings.environmentName);
  const settings = {
    ...storedSettings,
    environmentName: observedContext.environmentName ||
      storedSettings.businessCentralEnvironment || storedSettings.environmentName,
    companyName: observedContext.companyName ||
      (environmentChanged ? "" :
        storedSettings.businessCentralCompany || storedSettings.companyName || ""),
    ...(observedContext.environmentName
      ? { businessCentralEnvironment: observedContext.environmentName } : {}),
    businessCentralCompany: observedContext.companyName ||
      (environmentChanged ? "" : storedSettings.businessCentralCompany || "")
  };
  if (settings.environmentName !== storedSettings.environmentName ||
      settings.companyName !== storedSettings.companyName) {
    await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
  }
  const id = sessionId(message.name);
  recordingLicenseGuard.clear(id);
  tenantLicenseFailureNotifications.delete(id);
  const now = new Date().toISOString();

  await settleBounded(writeQueue, "previous session event writes");
  await settleBounded(errorEvidenceWrites, "previous session error evidence writes");
  await settleBounded(screenshotWorkerPromise, "previous session screenshots");
  await settleBounded(rawEventStore.flush(), "previous raw event persistence queue");
  await settleBounded(canonicalStore.flush(), "previous canonical persistence queue");
  preActionCaptures.clear();
  writeQueue = Promise.resolve();
  errorEvidenceWrites = Promise.resolve();
  screenshotQueue = [];
  stoppingSessionId = null;
  lastScreenshotAt = 0;
  screenshotStats.requested = 0;
  screenshotStats.captured = 0;
  screenshotStats.reused = 0;
  screenshotStats.dropped = 0;
  screenshotStats.stale = 0;
  screenshotStats.errors = 0;

  const session = {
    id,
    licenseTenantId: globalThis.T9TenantLicense.tenantFromUrl(recordingTab.url),
    name: message.name || "Business Central-process",
    purpose: message.purpose || "",
    recordingPurpose: globalThis.T9CanonicalRecording
      .normalizeRecordingPurpose(message.recordingPurpose),
    // A recording made while a test is run belongs to that run, not to the library.
    ...(message.testRunId ? { testRunId: String(message.testRunId) } : {}),
    businessCentral: { environment: observedContext.environmentName || "",
      company: observedContext.companyName || "",
      ...observedContext.businessCentralVersions },
    startedAt: now,
    completedAt: null,
    updatedAt: now,
    status: "recording",
    eventCount: 0,
    version: VERSION,
    settings
  };

  if (session.recordingPurpose === "bug-report" || session.testRunId) {
    await bcErrorEvidenceStore.initialize(id);
  }
  await saveSession(session);
  await saveEvents(id, []);
  await screenshotAssetStore.initialize(id);
  await rawEventStore.create(id, now);
  await canonicalStore.create(globalThis.T9CanonicalRecording.create({
    id, startedAt: now, legacySession: session
  }));
  await setState({
    recording: true,
    sessionId: id,
    tabId,
    startedAt: now,
    licenseTenantId: session.licenseTenantId,
    recordingPurpose: session.recordingPurpose,
    ...(session.testRunId ? { testRunId: session.testRunId } : {})
  });
  await setDebug(globalThis.T9RecordingLiveStatus.freshSessionDebug(id));

  try {
    await chrome.tabs.sendMessage(tabId, {
      type: "T9_STATE_CHANGED",
      recording: true,
      sessionId: id,
      recordingPurpose: session.recordingPurpose,
      ...(session.testRunId ? { testRunId: session.testRunId } : {})
    });
  } catch (error) {
    session.status = "failed";
    session.completedAt = new Date().toISOString();
    session.updatedAt = session.completedAt;
    await saveSession(session);
    await setState({ recording: false, sessionId: null, tabId: null,
      startedAt: null, recordingPurpose: null });
    await setDebug({ lastError:
      `Inspelningsstatus kunde inte levereras: ${String(error)}` });
    throw new Error("Inspelningsskriptet tog inte emot startstatus.");
  }

  const activeContent = await pingContentScript(tabId);
  if (!activeContent?.ok || !activeContent.recording ||
      activeContent.sessionId !== id) {
    session.status = "failed";
    session.completedAt = new Date().toISOString();
    session.updatedAt = session.completedAt;
    await saveSession(session);
    await setState({ recording: false, sessionId: null, tabId: null,
      startedAt: null, recordingPurpose: null });
    await setDebug({ lastError:
      "Inspelningsskriptet bekräftade inte den aktiva sessionen." });
    throw new Error(
      "Inspelningen kunde inte verifieras i Business Central-fliken."
    );
  }

  return session;
}

async function stopSession(finalName = "", documentLanguage = "") {
  const state = await getState();
  if (!state.sessionId) return null;
  await settleBounded(errorEvidenceWrites, "BC error evidence writes");
  stoppingSessionId = state.sessionId;

  try {
    if (state.tabId) {
      await chrome.tabs.sendMessage(state.tabId, {
        type: "T9_STATE_CHANGED",
        recording: false,
        sessionId: null
      });
    }
  } catch {}

  // All accepted events and delayed screenshot associations become durable
  // before the immutable completion boundary is written.
  try {
    await settleBounded(writeQueue, "accepted event writes");
    await settleBounded(rawEventStore.flush(), "raw event persistence queue");
  } catch (error) {
    await setDebug({ lastError: String(error), canonicalIntegrityDiagnostic: {
      code: error.code || "canonical-write-failure",
      operation: error.operation || "accepted-event-write"
    } });
    throw error;
  }
  try {
    await settleBounded(screenshotWorkerPromise, "screenshot registrations");
    await settleBounded(canonicalStore.flush(), "canonical persistence queue");
  } catch (error) {
    await setDebug({ lastError: String(error), canonicalIntegrityDiagnostic: {
      code: error.code || "canonical-write-failure",
      operation: error.operation || "screenshot-registration"
    } });
    throw error;
  }

  const storeIntegrity = canonicalStore.diagnostics();
  const rawStoreIntegrity = rawEventStore.diagnostics();
  if (storeIntegrity.pendingWrites || storeIntegrity.failures.length ||
      rawStoreIntegrity.pendingWrites || rawStoreIntegrity.failures.length) {
    await setDebug({ canonicalIntegrityDiagnostic: {
      code: rawStoreIntegrity.pendingWrites ? "raw-event-pending-write" :
        rawStoreIntegrity.failures.length ? "raw-event-write-failure" :
          storeIntegrity.pendingWrites ? "canonical-pending-write" :
            "canonical-write-failure",
      pendingWrites: storeIntegrity.pendingWrites,
      rawPendingWrites: rawStoreIntegrity.pendingWrites,
      failures: [...rawStoreIntegrity.failures, ...storeIntegrity.failures].map(item => ({
        operationType: item.operationType, message: item.message
      })) } });
    throw new Error("recorder.stopIncomplete");
  }

  const session = await getSession(state.sessionId);
  const requestedName = String(finalName || "").trim();
  if (session && requestedName) session.name = requestedName;
  if (session) {
    if (documentLanguage) {
      session.settings = { ...(session.settings || {}), documentLanguage:
        globalThis.T9LanguageRegistry.normalize(documentLanguage, "document") };
    }
    const canonicalRecording = await getCanonicalRecording(state.sessionId);
    session.eventCount = canonicalRecording?.events?.length || 0;
    const legacyEvents = (canonicalRecording?.events || []).map(event => event.raw);
    await saveEvents(state.sessionId, legacyEvents);
    const rawRecording = await getRawRecording(state.sessionId);
    const integrityDiagnostics = globalThis.T9CanonicalRecording
      .integrityDiagnostics(canonicalRecording, {
        legacyEventCount: legacyEvents.length
      });
    if (rawRecording && rawRecording.events.length !== canonicalRecording.events.length) {
      integrityDiagnostics.push({ code: "raw-canonical-event-count-mismatch",
        severity: "error", rawEventCount: rawRecording.events.length,
        canonicalEventCount: canonicalRecording.events.length });
    }
    if (rawRecording?.truncated) {
      integrityDiagnostics.push({ code: "raw-recording-truncated",
        severity: "error", diagnostics: rawRecording.diagnostics || [] });
    }
    if (integrityDiagnostics.length) {
      await setDebug({ canonicalIntegrityDiagnostic: {
        code: "canonical-integrity-validation-failed",
        diagnostics: integrityDiagnostics
      } });
      throw new Error("recorder.stopIncomplete");
    }
    session.status = "completed";
    session.completedAt = new Date().toISOString();
    session.updatedAt = session.completedAt;
    if (requestedName) await canonicalStore.rename(state.sessionId, requestedName);
    if (documentLanguage) {
      await canonicalStore.setDocumentLanguage(state.sessionId,
        globalThis.T9LanguageRegistry.normalize(documentLanguage, "document"));
    }
    await canonicalStore.finalize(state.sessionId, session.completedAt);
    await saveSession(session);
  }

  screenshotStats.dropped += screenshotQueue.length;
  screenshotQueue = [];

  await setState({
    recording: false,
    sessionId: null,
    tabId: state.tabId,
    startedAt: null,
    recordingPurpose: null,
    // A Page Scripting file saved in this tab shortly after is kept with this recording.
    ...(session && !session.testRunId ? { lastSessionId: session.id,
      lastStoppedAt: session.completedAt } : {})
  });
  await setDebug({
    activeSessionId: null,
    lastError: null
  });
  rawEventStore.release(state.sessionId);
  canonicalStore.release(state.sessionId);
  rawEventLogStorage.release(state.sessionId);
  canonicalEventLogStorage.release(state.sessionId);
  stoppingSessionId = null;
  recordingLicenseGuard.clear(state.sessionId);
  tenantLicenseFailureNotifications.delete(String(state.sessionId));

  return session;
}

// ---- The document as it is recorded, for the recording panel --------------------------------
// The panel shows the steps the document will have, in the document's words, while the user
// works. They are interpreted as when the recording is saved; a step the user left out is still
// shown (struck through) so it can be taken back. Interpreting takes a moment, so it is done
// only when the recording changed and at most every LIVE_STEPS_MIN_MS.
const LIVE_STEPS_MIN_MS = 1500;
const LIVE_STEP_PREVIEW_KINDS = new Set(["ignore", "include"]);
let liveStepsCache = { sessionId: "", signature: "", result: null, computedAt: 0, pending: null,
  pendingSignature: "" };

function guidanceTargets(raw = {}) {
  return Array.isArray(raw.targetSourceEventIds) && raw.targetSourceEventIds.length
    ? raw.targetSourceEventIds : [raw.targetSourceEventId].filter(Boolean);
}

function liveStepText(task, language) {
  try {
    const presentation = globalThis.T9PresentationGrammar.presentationFor(
      task.semanticActionModel || task, String(task.instruction || ""), language);
    const runs = (presentation?.runs || []).map(run => ({ text: String(run.text || ""),
      ...(run.bold ? { bold: true } : {}), ...(run.italic ? { italic: true } : {}) }))
      .filter(run => run.text);
    if (runs.length) return runs;
  } catch {}
  return [{ text: String(task.instruction || "").replace(/\*\*|__/gu, "") }];
}

async function computeLiveSteps(sessionId, language) {
  const recording = await getCanonicalRecording(sessionId);
  if (!recording) return null;
  const events = recording.events || [];
  const raw = event => event.raw || {};
  const isGuidance = event => raw(event).type === "capture-guidance";
  // Leaving out and taking back are shown on the step rather than removing it.
  const previewRecording = { ...recording, events: events.map(event =>
    isGuidance(event) && LIVE_STEP_PREVIEW_KINDS.has(raw(event).guidanceKind)
      ? { ...event, raw: { ...raw(event), guidanceKind: "panel-preview" } } : event) };
  const manifest = await screenshotAssetStore.manifest(sessionId);
  const tasks = await deriveBugReportTasks(previewRecording, manifest);
  const leftOut = events.filter(event => isGuidance(event) &&
    LIVE_STEP_PREVIEW_KINDS.has(raw(event).guidanceKind));
  const paths = globalThis.T9ScreenshotAssetPaths.assetPathIndex(recording);
  const firstTitle = [...events].reverse().find(event => isGuidance(event) &&
    raw(event).guidanceKind === "first-section-title");
  const steps = tasks.map(task => ({ task,
    images: (task.screenshotAssetIds || []).map(assetId =>
      ({ assetId, path: paths.get(String(assetId)) || "" })).filter(image => image.path) }))
  // A step without words or a screenshot is left out of the document, so it is not shown here.
    .filter(({ task, images }) => !globalThis.T9ReviewTaskVisibility.isGeneratedPlaceholder(
      { ...task, screenshots: images.map(image => image.path) }))
    .map(({ task, images }) => {
    const sources = new Set(task.sourceEventIds || []);
    const interactions = new Set(task.interactionIds || [task.interactionId].filter(Boolean));
    let ignored = false;
    for (const marker of leftOut) {
      const markerRaw = raw(marker);
      if (guidanceTargets(markerRaw).some(id => sources.has(id)) ||
          (markerRaw.targetInteractionId && interactions.has(markerRaw.targetInteractionId))) {
        ignored = markerRaw.guidanceKind === "ignore";
      }
    }
    const chosen = task.captureGuidance?.chosenScreenshotAssetId || null;
    return {
      key: String(task.sourceEventIds?.[0] || task.taskId || ""),
      sourceEventIds: [...sources],
      runs: liveStepText(task, language),
      pageCaption: globalThis.T9BCClientCaptions.pageName(String(task.pageCaption || "")),
      images,
      chosenAssetId: images.some(image => image.assetId === chosen) ? chosen : null,
      shownPath: (chosen && images.find(image => image.assetId === chosen)?.path) ||
        task.screenshot || images.at(-1)?.path || "",
      ignored,
      sectionAfter: Boolean(task.sectionBoundaryAfter),
      sectionTitle: task.sectionBoundaryAfter ? String(task.sectionTitle || "") : ""
    };
  });
  return { sessionId, language, steps,
    firstSectionTitle: String(raw(firstTitle || {}).sectionTitle || ""),
    screenshots: events.filter(event => event.screenshotAssetId).length };
}

async function liveDocumentSteps(sessionId, requestedLanguage) {
  const recording = await getCanonicalRecording(sessionId);
  if (!recording) return null;
  const language = globalThis.T9LanguageRegistry.normalize(
    requestedLanguage || recording.metadata?.documentLanguage, "document");
  const events = recording.events || [];
  const signature = [events.length, events.at(-1)?.id || "",
    events.filter(event => event.screenshotAssetId).length, language].join("|");
  const cache = liveStepsCache.sessionId === sessionId ? liveStepsCache
    : { sessionId, signature: "", result: null, computedAt: 0, pending: null, pendingSignature: "" };
  if (cache.signature === signature && cache.result) return cache.result;
  if (cache.pending && cache.pendingSignature === signature) return cache.pending;
  // While the recording changes quickly, or another reading is still under way, the panel keeps
  // the steps it has and asks again a moment later.
  if (cache.result && (cache.pending || Date.now() - cache.computedAt < LIVE_STEPS_MIN_MS)) {
    return { ...cache.result, updating: true };
  }
  if (cache.pending) return cache.pending.then(() => liveDocumentSteps(sessionId, requestedLanguage));
  const pending = computeLiveSteps(sessionId, language).then(result => {
    liveStepsCache = { sessionId, signature, result, computedAt: Date.now(), pending: null,
      pendingSignature: "" };
    return result;
  }, error => {
    liveStepsCache = { ...liveStepsCache, pending: null, pendingSignature: "" };
    throw error;
  });
  liveStepsCache = { ...cache, pending, pendingSignature: signature };
  return pending;
}

// A test recording is compared with steps the document library interpreted with the
// knowledge repository, which can name a step's kind more precisely, so it is interpreted
// the same way (options.repository).
async function deriveBugReportTasks(recording, screenshotManifest, options = {}) {
  const normalized = globalThis.T9EventNormalization.normalizeRecording(recording);
  const grouped = globalThis.T9EventStepGrouping.group(normalized);
  const legacy = globalThis.T9CanonicalRecording.legacyView(recording);
  const screenshots = globalThis.T9ScreenshotAssetPaths.eventPathsFromKeys(
    screenshotManifest.keys);
  const projectedEvents = legacy.events.map((event, index) => ({ ...event,
    canonicalSourceEventId: recording.events[index]?.id || "",
    canonicalScreenshotAssetId: recording.events[index]?.screenshotAssetId || "" }));
  const packResult = await pageKnowledgePacksReady;
  const interpretation = globalThis.T9SessionInterpretationPipeline.interpret({
    language: globalThis.T9LanguageRegistry.normalize(
      recording.metadata?.documentLanguage, "document"),
    session: legacy.session, events: projectedEvents,
    normalizedEvents: normalized.events, stepGroups: grouped.groups,
    supportingEvents: grouped.supportingEvents,
    groupingDiagnostics: grouped.diagnostics,
    imagePaths: screenshots, knowledgePacks: packResult.packs || [],
    ...(options.repository && packResult.repository ? { knowledgeRepository: packResult.repository,
      knowledgeReleaseId: packResult.snapshot?.release?.releaseId || null } : {}) });
  const byCanonicalId = new Map(recording.events.map(event => [event.id, event]));
  return (interpretation.businessTasks || []).map(task => ({ ...task,
    screenshotAssetIds: [...new Set((task.sourceEventIds || []).map(id =>
      byCanonicalId.get(id)?.screenshotAssetId).filter(Boolean))] }));
}

function privacyMaskLabels(documentLanguage) {
  const language = globalThis.T9LanguageRegistry.normalize(documentLanguage, "document");
  const placeholder = (english, swedish) =>
    globalThis.T9LanguageRegistry.translate(english, language, swedish);
  return { secret: placeholder("[masked]", "[maskerat]"),
    email: placeholder("[email address]", "[e-postadress]"),
    customer: placeholder("[current customer]", "[aktuell kund]"),
    vendor: placeholder("[current vendor]", "[aktuell leverantör]"),
    item: placeholder("[current item]", "[aktuell artikel]"),
    amount: placeholder("[amount]", "[belopp]"), id: placeholder("[ID]", "[id]") };
}

// A recording made while a test is run. When it stops it is compared with the test's steps
// and then removed: the run keeps what the recording showed for each step, as suggestions
// the tester confirms, and the recording never becomes a document in the library. Secrets
// are masked as in a bug report; other values stay in the run, which is stored only here.
async function startTestRecording(testRunId, tabId) {
  const run = await loadTestRun(testRunId);
  if (!run) throw new Error("test.runNotFound");
  if (!run.steps.some(step => globalThis.T9TestRecordingMatch.hasSignature(step.signature))) {
    throw new Error("test.recordingNotComparable");
  }
  return startSession({ name: run.title || "Business Central", testRunId: run.testRunId }, tabId);
}

async function stopTestRecording() {
  const state = await getState();
  const active = state.sessionId ? await getSession(state.sessionId) : null;
  if (!active?.testRunId) throw new Error("test.noTestRecording");
  const run = await loadTestRun(active.testRunId);
  // Screenshots of the steps Page Scripting played last are taken before the recording ends.
  await Promise.race([playbackScreenshots, new Promise(resolve => setTimeout(resolve, 8000))]);
  const session = await stopSession("", run?.documentLanguage || "");
  return compareTestRecording(session.id);
}

// What Business Central showed when a step of a test recording failed: the message of an
// error dialog, kept as error evidence, or of the page's error banner. The message is shown
// as Business Central wrote it.
async function testRecordingErrors(recordingId, recording) {
  const evidence = new Map((await getBcErrorEvidenceForRecording(recordingId).catch(() => []))
    .map(item => [item.errorEvidenceId, item]));
  const events = new Map((recording.events || []).map(event => [event.id, event]));
  const message = id => {
    const raw = events.get(id)?.raw || {};
    const value = raw.type === "bc-error" ? evidence.get(raw.errorEvidenceId)?.displayMessage
      : raw.accessibleName || raw.label || raw.text;
    return String(value || "").replace(/\s+/gu, " ").trim();
  };
  const failure = task => {
    const verification = task.resultVerification || {};
    if (verification.status !== "error") return {};
    const outcomes = (verification.outcomes || []).filter(item => item.kind === "error-outcome");
    const text = outcomes.flatMap(item => item.sourceEventIds || []).map(message).find(Boolean) || "";
    return { failed: true, error: text };
  };
  // A step Page Scripting played back fails with the error Business Central showed after it.
  failure.played = step => step.errorEventId
    ? { ...step, failed: true, error: message(step.errorEventId) } : step;
  return failure;
}

// For each step found in a test recording, the last screenshot of the recorded step, stored
// as a test screenshot with the values measured when it was taken.
async function testRecordingScreenshots(recordingId, recording, run, check, tasks, capturedAt, played = []) {
  const assets = new Map((recording.assets || []).map(asset => [asset.id, asset]));
  // A step Page Scripting played back has its screenshot by when it was taken.
  const playedAssets = globalThis.T9TestRecordingMatch.playbackScreenshots(recording.assets, played);
  const wanted = check.steps.filter(step => Number.isInteger(step.taskIndex) ||
    (Number.isInteger(step.playedIndex) && !step.onTheWay)).map(step => {
    const assetId = Number.isInteger(step.taskIndex) ? (tasks[step.taskIndex]?.screenshotAssetIds || []).at(-1) : "";
    const asset = Number.isInteger(step.taskIndex) ? assetId && assets.get(assetId)
      : playedAssets[step.playedIndex];
    const eventNo = Number(asset?.metadata?.legacyEventNo);
    return asset && Number.isSafeInteger(eventNo) ? { stepId: step.stepId, asset, key: String(eventNo) } : null;
  }).filter(Boolean);
  if (!wanted.length) return [];
  const images = (await screenshotAssetStore.load(recordingId, wanted.map(item => item.key))).assets || {};
  const shots = [];
  for (const item of wanted) {
    const image = images[item.key];
    if (typeof image !== "string" || !image.startsWith("data:image/")) continue;
    const screenshotId = `shot-${crypto.randomUUID()}`;
    const key = testScreenshotKey(run, screenshotId);
    await chrome.storage.local.set({ [key]: { image, capturedAt: item.asset.createdAt || capturedAt,
      ...(Array.isArray(item.asset.valueRegions) ? { valueRegions: item.asset.valueRegions,
        valueRegionsComplete: item.asset.valueRegionsComplete !== false } : {}) } });
    shots.push({ stepId: item.stepId, screenshotId, key, capturedAt: item.asset.createdAt || capturedAt,
      ...(item.asset.highlight ? { highlight: item.asset.highlight } : {}) });
  }
  return shots;
}

// The recording of a test as steps, interpreted as the library interprets a recording and
// with secrets masked, compared with the test's steps.
async function checkTestRecording(recordingId, run) {
  const recording = await getCanonicalRecording(recordingId);
  const settings = await getSettings();
  const labels = privacyMaskLabels(run.documentLanguage);
  const masked = { ...recording, events: (recording.events || []).map(event =>
    globalThis.T9PrivacyMask.maskRecordedEvent(event,
      { ...settings, maskValues: "secrets", labels })) };
  const timeOf = new Map((recording.events || []).map(event => [event.id, event.timestamp]));
  const errorOf = await testRecordingErrors(recordingId, masked);
  const tasks = (await deriveBugReportTasks(masked,
    await screenshotAssetStore.manifest(recordingId), { repository: true })).map(task => ({ ...task,
    at: timeOf.get((task.sourceEventIds || [])[0]) || "", ...errorOf(task) }));
  // Page Scripting plays a test back without clicks or typing; its announced steps count.
  const played = globalThis.T9TestRecordingMatch.playbackSteps(masked.events).map(errorOf.played);
  return { recording, tasks, played, check: globalThis.T9TestRecordingMatch.check(run.steps, tasks, played) };
}

// While a test is recorded, the recording is compared with the test shortly after the
// tester acts, at most once in that time, so the panel beside Business Central follows the
// test as it is done: steps done pass and an error fails its step. Screenshots go with the
// steps when the recording stops.
const LIVE_TEST_CHECK_DELAY_MS = 1200;
const liveTestCheck = { timer: null, running: Promise.resolve() };
function scheduleLiveTestCheck(recordingId) {
  if (liveTestCheck.timer) return;
  liveTestCheck.timer = setTimeout(() => {
    liveTestCheck.timer = null;
    liveTestCheck.running = liveTestCheck.running
      .then(() => runLiveTestCheck(recordingId)).catch(() => {});
  }, LIVE_TEST_CHECK_DELAY_MS);
}
async function settleLiveTestCheck() {
  clearTimeout(liveTestCheck.timer);
  liveTestCheck.timer = null;
  await liveTestCheck.running;
}
async function runLiveTestCheck(recordingId) {
  const session = await getSession(recordingId);
  if (!session?.testRunId || session.status !== "recording") return;
  const run = await loadTestRun(session.testRunId);
  if (!run) return;
  try {
    const { check } = await checkTestRecording(recordingId, run);
    // The recording may have stopped meanwhile; then the check made when it stopped counts.
    if ((await getSession(recordingId))?.status !== "recording") return;
    await withTestRun(run.testRunId, current => globalThis.T9TestScript.applyRecordingResults(
      current, { ...check, live: true }, new Date().toISOString()));
  } catch (error) {
    console.warn("Test recording could not be compared while recording", error);
    await withTestRun(run.testRunId, current => globalThis.T9TestScript.liveCheckFailed(
      current, new Date().toISOString())).catch(() => {});
  }
}

async function compareTestRecording(recordingId) {
  await settleLiveTestCheck();
  const session = await getSession(recordingId);
  if (!session?.testRunId) throw new Error("test.noTestRecording");
  const run = await loadTestRun(session.testRunId);
  if (!run) {
    await deleteSession(recordingId);
    throw new Error("test.runNotFound");
  }
  try {
    const { recording, tasks, played, check } = await checkTestRecording(recordingId, run);
    const now = new Date().toISOString();
    // The screenshot of each step found in the recording goes with the step, in place of the
    // ones an earlier recording gave it; the tester's own screenshots are kept.
    const shots = await testRecordingScreenshots(recordingId, recording, run, check, tasks, now, played);
    const replaced = run.steps.flatMap(step => step.screenshots.filter(shot =>
      shot.source === "recording").map(shot => ({ stepId: step.stepId, screenshotId: shot.screenshotId })));
    let saved;
    try {
      saved = await withTestRun(run.testRunId, current => {
        let result = globalThis.T9TestScript.applyRecordingResults(current, check, now);
        for (const item of replaced) {
          result = globalThis.T9TestScript.removeScreenshot(result, item.stepId, item.screenshotId, now);
        }
        for (const shot of shots) {
          const step = result.steps.find(entry => entry.stepId === shot.stepId);
          if (step && step.screenshots.length < globalThis.T9TestScript.MAX_SCREENSHOTS_PER_STEP) {
            result = globalThis.T9TestScript.addScreenshot(result, shot.stepId, { screenshotId:
              shot.screenshotId, capturedAt: shot.capturedAt, source: "recording",
              ...(shot.highlight ? { highlight: shot.highlight } : {}) }, now);
          }
        }
        return result;
      });
    } catch (error) {
      await chrome.storage.local.remove(shots.map(shot => shot.key)).catch(() => {});
      throw error;
    }
    const kept = new Set(globalThis.T9TestScript.screenshotIds(saved));
    await chrome.storage.local.remove([...replaced.map(item => testScreenshotKey(run, item.screenshotId)),
      ...shots.filter(shot => !kept.has(shot.screenshotId)).map(shot => shot.key)]);
    await deleteSession(recordingId);
    return { run: saved, check };
  } catch (error) {
    await withTestRun(run.testRunId, current => globalThis.T9TestScript.recordingCheckFailed(
      current, recordingId, new Date().toISOString())).catch(() => {});
    console.warn("Test recording could not be compared", error);
    throw new Error("test.recordingCheckFailed");
  }
}

async function createAndOpenBugReport(recordingId, reportTitle = "", regenerateCurrent = null) {
  const recording = await getCanonicalRecording(recordingId);
  const screenshotManifest = await screenshotAssetStore.manifest(recordingId);
  // Steps are derived twice: with the captured values, and with them masked as a recording
  // masks them, so that each report can choose. Placeholders follow the document language;
  // the recording itself is not changed.
  const labels = privacyMaskLabels(recording.metadata?.documentLanguage);
  const settings = await getSettings();
  const maskEvent = (event, maskValues) =>
    globalThis.T9PrivacyMask.maskRecordedEvent(event, { ...settings, maskValues, labels });
  const masked = maskValues => ({ ...recording, events: (recording.events || []).map(event =>
    maskEvent(event, maskValues)) });
  const kept = masked("secrets");
  const tasks = await deriveBugReportTasks(kept, screenshotManifest);
  const maskedSteps = globalThis.T9PrivacyMask.maskedStepTexts(tasks,
    await deriveBugReportTasks(masked(true), screenshotManifest), kept.events,
    event => maskEvent(event, true));
  const errors = await getBcErrorEvidenceForRecording(recordingId);
  let report = globalThis.T9BugReportService.createBugReportFromRecording(
    recording, tasks, { extensionVersion: VERSION, productVersion: VERSION,
      errorEvidence: errors, maskedSteps,
      documentLanguage: globalThis.T9LanguageRegistry.normalize(
        recording.metadata?.documentLanguage, "document"
      ),
      title: String(reportTitle || "").trim() });
  if (regenerateCurrent) {
    if (!tasks.length) throw new Error("Inga rapportsteg kunde återskapas. Befintlig rapport har inte ändrats.");
    report = globalThis.T9BugReportService.regenerate({ ...regenerateCurrent,
      evidence: { ...regenerateCurrent.evidence, screenshots: [] } }, recording, tasks, {
      extensionVersion: VERSION, productVersion: VERSION, errorEvidence: errors, maskedSteps,
      updatedAt: new Date().toISOString() });
  }
  const saved = await bugReportStore.save(report);
  if (regenerateCurrent) return { report: saved };
  const workspaceUrl = chrome.runtime.getURL(
    `technical-report.html?bugReportId=${encodeURIComponent(saved.bugReportId)}&new=1`);
  const tab = await chrome.tabs.create({ url: workspaceUrl });
  return { report: saved, workspaceUrl, tabId: tab.id };
}

async function refreshStoredBugReport(report) {
  if (!report) return report;
  const recovered = await getBcErrorEvidenceForRecording(report.recordingId);
  if (!recovered.length) return report;
  const now = new Date().toISOString();
  let refreshed = report;
  if (!refreshed.businessCentralError?.errorEvidenceIds?.length) {
    refreshed = globalThis.T9BugReportService.attachRecoveredErrorEvidence(
      refreshed, recovered, now);
  }
  const recording = await getCanonicalRecording(refreshed.recordingId);
  refreshed = globalThis.T9BugReportService.refreshSuggestedTitle(
    refreshed, recording, recovered, now);
  return JSON.stringify(refreshed) === JSON.stringify(report)
    ? report : bugReportStore.save(refreshed);
}

// A recording made during a test is not a document of its own; see stopTestRecording.
const librarySession = ([key, value]) => key.startsWith(SESSION_PREFIX) && !value?.testRunId;

async function listSessions() {
  const all = await globalThis.T9StorageQueries.getByPrefixes(
    chrome.storage.local, [SESSION_PREFIX]
  );
  return Object.entries(all)
    .filter(librarySession)
    .map(([, value]) => value)
    .sort((a, b) => String(b.startedAt).localeCompare(String(a.startedAt)));
}

async function getDocumentLibraryBootstrap() {
  const [all, progress] = await Promise.all([
    globalThis.T9StorageQueries.getByPrefixes(
      chrome.storage.local, [SESSION_PREFIX, BUG_REPORT_PREFIX],
      [globalThis.T9StorageKeys.DOCUMENT_LIBRARY_KEY, globalThis.T9StorageKeys.DOCUMENT_FOLDERS_KEY]
    ),
    reviewProgressStore.list()
  ]);
  // Only the review progress is returned, read from the small progress entries.
  const reviewProgress = progress.map(({ sessionId, total, approved, completed }) =>
    ({ sessionId, total, approved, completed }));
  const sessions = Object.entries(all)
    .filter(librarySession)
    .map(([, value]) => value)
    .sort((a, b) => String(b.startedAt).localeCompare(String(a.startedAt)));
  const reports = Object.entries(all)
    .filter(([key]) => key.startsWith(BUG_REPORT_PREFIX))
    .map(([, value]) => globalThis.T9BugReportModel.normalize(value))
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  const records = all[globalThis.T9StorageKeys.DOCUMENT_LIBRARY_KEY];
  const folders = globalThis.T9DocumentFolders.read(all[globalThis.T9StorageKeys.DOCUMENT_FOLDERS_KEY]);
  return { sessions, reports, reviewProgress,
    records: Array.isArray(records) ? records : [],
    folders: folders.supported ? globalThis.T9DocumentFolders.serialize(folders.tree) : null,
    foldersSchemaVersion: folders.supported ? "" : folders.schemaVersion || "unknown" };
}

async function getDocumentLibrary() {
  const data = await chrome.storage.local.get(
    globalThis.T9StorageKeys.DOCUMENT_LIBRARY_KEY
  );
  return Array.isArray(data[globalThis.T9StorageKeys.DOCUMENT_LIBRARY_KEY])
    ? data[globalThis.T9StorageKeys.DOCUMENT_LIBRARY_KEY]
    : [];
}

// Saves the folder tree, and with it the library records whose folder changed, in one write.
// A stored tree from a later version is never overwritten.
async function saveDocumentFolders(tree, records) {
  const key = globalThis.T9StorageKeys.DOCUMENT_FOLDERS_KEY;
  const current = globalThis.T9DocumentFolders.read((await chrome.storage.local.get(key))[key]);
  if (!current.supported) throw new Error("The library folders were saved by a later version and cannot be changed.");
  const next = globalThis.T9DocumentFolders.read(tree);
  if (!next.supported) throw new Error("The library folders are not valid.");
  const values = { [key]: globalThis.T9DocumentFolders.serialize(next.tree) };
  if (Array.isArray(records)) {
    values[globalThis.T9StorageKeys.DOCUMENT_LIBRARY_KEY] = records.map(record =>
      globalThis.T9DocumentLibrary.normalize(record));
  }
  await chrome.storage.local.set(values);
  return values[key];
}

async function saveDocumentLibrary(records) {
  const normalized = records.map(record =>
    globalThis.T9DocumentLibrary.normalize(record)
  );
  await chrome.storage.local.set({
    [globalThis.T9StorageKeys.DOCUMENT_LIBRARY_KEY]: normalized
  });
  return normalized;
}

// Test runs of a process document. A run is stored on its own and names the recording.
// The person signed in with their Microsoft account on this computer, or null.
async function signedInPerson() {
  const account = await consultantLicense.state().catch(() => ({}));
  return account?.refreshToken ? globalThis.T9TestSuite.person(account.profile) ||
    (account.profile?.name ? { name: String(account.profile.name), email: "" } : null) : null;
}
async function loadTestRun(testRunId) {
  const key = TEST_RUN_PREFIX + String(testRunId || "");
  const value = (await chrome.storage.local.get(key))[key];
  return value ? globalThis.T9TestScript.normalize(value) : null;
}
async function saveTestRun(run) {
  const value = globalThis.T9TestScript.normalize(run);
  await chrome.storage.local.set({ [TEST_RUN_PREFIX + value.testRunId]: value });
  return value;
}
// Changes to one run are applied one at a time to what is stored, so the full page and the
// panel beside Business Central can both change a run without undoing each other.
const testRunQueues = new Map();
function withTestRun(testRunId, change) {
  const id = String(testRunId || "");
  const previous = testRunQueues.get(id) || Promise.resolve();
  const next = previous.catch(() => {}).then(async () => {
    const run = await loadTestRun(id);
    if (!run) throw new Error("test.runNotFound");
    return saveTestRun(await change(run));
  });
  testRunQueues.set(id, next);
  next.finally(() => { if (testRunQueues.get(id) === next) testRunQueues.delete(id); })
    .catch(() => {});
  return next;
}
function testScreenshotKey(run, screenshotId) {
  return `${TEST_SCREENSHOT_PREFIX}${run.sessionId}:${run.testRunId}:${screenshotId}`;
}
const BUSINESS_CENTRAL_TAB_URLS = ["https://businesscentral.dynamics.com/*",
  "https://*.businesscentral.dynamics.com/*"];
function isBusinessCentralUrl(url) {
  try {
    const host = new URL(String(url || "")).hostname;
    return host === "businesscentral.dynamics.com" || host.endsWith(".businesscentral.dynamics.com");
  } catch { return false; }
}
// The open Business Central tab to test in: one in the tested environment first, then the
// one used last.
async function businessCentralTabFor(recordingId) {
  const session = recordingId ? await getSession(recordingId) : null;
  const environment = String(session?.settings?.environmentName || "").toLowerCase();
  const tabs = await chrome.tabs.query({ url: BUSINESS_CENTRAL_TAB_URLS });
  const parse = tab => globalThis.T9BusinessCentralUrlContext.parseBusinessCentralUrl(tab.url || "");
  return tabs.filter(tab => Number.isInteger(tab.id)).sort((a, b) => {
    const aMatch = String(parse(a).environmentName || "").toLowerCase() === environment;
    const bMatch = String(parse(b).environmentName || "").toLowerCase() === environment;
    return Number(bMatch) - Number(aMatch) ||
      Number(b.lastAccessed || 0) - Number(a.lastAccessed || 0);
  })[0] || null;
}
// A screenshot of Business Central for a test step. From the panel the Business Central tab
// is the one shown; from the full page that tab is shown for the capture and the page is
// shown again afterwards. Values are measured like in a recording, so a bug report made
// from the step can cover them.
async function captureTestScreenshot({ testRunId, stepId, tabId, returnTabId }) {
  const run = await loadTestRun(testRunId);
  if (!run) throw new Error("test.runNotFound");
  const step = run.steps.find(item => item.stepId === String(stepId || ""));
  if (!step) throw new Error("test.runNotFound");
  if (step.screenshots.length >= globalThis.T9TestScript.MAX_SCREENSHOTS_PER_STEP) {
    throw new Error("test.screenshotLimit");
  }
  let target = Number.isInteger(tabId) ? await chrome.tabs.get(tabId).catch(() => null) : null;
  if (target && !isBusinessCentralUrl(target.url)) target = null;
  const switched = !target;
  if (!target) target = await businessCentralTabFor(run.sessionId);
  if (!target) throw new Error("test.noBusinessCentral");
  if (switched) {
    await chrome.tabs.update(target.id, { active: true });
    await chrome.windows.update(target.windowId, { focused: true });
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  let image = null;
  try {
    image = await capture(target.id, { valueRegions: true });
  } finally {
    if (switched && Number.isInteger(returnTabId)) {
      try {
        const returnTab = await chrome.tabs.get(returnTabId);
        await chrome.tabs.update(returnTabId, { active: true });
        await chrome.windows.update(returnTab.windowId, { focused: true });
      } catch {}
    }
  }
  // Edge lets an extension capture a tab only after the user has used the extension on that
  // tab, for example by choosing its toolbar button; the Business Central site access alone is
  // not enough.
  if (!image && /activeTab|<all_urls>/u.test(lastCaptureError)) {
    await setTestTabAccess(target.id, false).catch(() => {});
    throw new Error("test.screenshotNeedsAccess");
  }
  if (!image) throw new Error("test.screenshotFailed");
  const screenshotId = `shot-${crypto.randomUUID()}`;
  const capturedAt = new Date().toISOString();
  const key = testScreenshotKey(run, screenshotId);
  await chrome.storage.local.set({ [key]: { image, capturedAt, ...valueRegionsFor(image) } });
  try {
    const saved = await withTestRun(run.testRunId, current => globalThis.T9TestScript
      .addScreenshot(current, stepId, { screenshotId, capturedAt }, capturedAt));
    return { run: saved, screenshotId };
  } catch (error) {
    await chrome.storage.local.remove(key);
    throw error;
  }
}
async function loadTestScreenshots(run, screenshotIds) {
  const listed = new Set(globalThis.T9TestScript.screenshotIds(run));
  const wanted = [...new Set((Array.isArray(screenshotIds) ? screenshotIds : [...listed])
    .map(String))].filter(id => listed.has(id));
  const keys = wanted.map(id => testScreenshotKey(run, id));
  const values = keys.length ? await chrome.storage.local.get(keys) : {};
  return Object.fromEntries(wanted.flatMap((id, index) => {
    const value = values[keys[index]];
    return value?.image ? [[id, value]] : [];
  }));
}
async function removeTestScreenshots(prefix) {
  const stored = await globalThis.T9StorageQueries.getByPrefixes(chrome.storage.local, [prefix]);
  const keys = Object.keys(stored).filter(key => key.startsWith(prefix));
  if (keys.length) await chrome.storage.local.remove(keys);
}

// The test being worked on: the one whose page or panel was opened last.
async function activeTestRun() {
  const key = globalThis.T9StorageKeys.ACTIVE_TEST_RUN_KEY;
  const pointer = (await chrome.storage.local.get(key))[key];
  return pointer?.testRunId ? loadTestRun(pointer.testRunId).catch(() => null) : null;
}

// Edge lets the extension capture a tab only after the user has used its toolbar button there.
// The Business Central tabs where that happened in this browser session are remembered; on
// another tab where a test runs, the button gets a mark that blinks a few times and then stays
// until the button is used.
const TEST_ACCESS_TABS_KEY = globalThis.T9StorageKeys.TEST_ACCESS_TABS_KEY;
async function testAccessTabs() {
  const value = (await chrome.storage.session.get(TEST_ACCESS_TABS_KEY))[TEST_ACCESS_TABS_KEY];
  return Array.isArray(value) ? value.filter(Number.isInteger) : [];
}
async function setTestTabAccess(tabId, granted) {
  const tabs = (await testAccessTabs()).filter(id => id !== tabId);
  if (granted) tabs.push(tabId);
  await chrome.storage.session.set({ [TEST_ACCESS_TABS_KEY]: tabs.slice(-50) });
}
const testTabMarks = new Map();
async function markTestTab(tabId, title) {
  if (!Number.isInteger(tabId) || (await testAccessTabs()).includes(tabId)) return false;
  if ((await getState()).recording) return false;
  const tab = await chrome.tabs.get(tabId).catch(() => null);
  if (!tab || !isBusinessCentralUrl(tab.url)) return false;
  await chrome.action.setBadgeBackgroundColor({ tabId, color: "#c2410c" });
  await chrome.action.setBadgeTextColor?.({ tabId, color: "#ffffff" })?.catch(() => {});
  if (title) await chrome.action.setTitle({ tabId, title: String(title).slice(0, 200) });
  clearTimeout(testTabMarks.get(tabId));
  let count = 0;
  const blink = () => {
    chrome.action.setBadgeText({ tabId, text: count % 2 === 0 ? "!" : "" }).catch(() => {});
    count += 1;
    if (count < 7) testTabMarks.set(tabId, setTimeout(blink, 450));
    else testTabMarks.delete(tabId);
  };
  blink();
  return true;
}
async function clearTestTabMark(tabId) {
  clearTimeout(testTabMarks.get(tabId));
  testTabMarks.delete(tabId);
  // Without text the tab shows the button's own badge again, such as REC while recording.
  await chrome.action.setBadgeText({ tabId, text: null }).catch(() => {});
  await chrome.action.setTitle({ tabId,
    title: chrome.runtime.getManifest().action?.default_title || "" }).catch(() => {});
}
chrome.tabs.onRemoved.addListener(tabId => { void setTestTabAccess(tabId, false).catch(() => {}); });
chrome.tabs.onUpdated.addListener((tabId, change) => {
  if (change.url && !isBusinessCentralUrl(change.url)) void setTestTabAccess(tabId, false).catch(() => {});
});

async function listTestRuns(recordingId = "") {
  const all = await globalThis.T9StorageQueries.getByPrefixes(chrome.storage.local,
    [TEST_RUN_PREFIX]);
  return Object.entries(all).filter(([key, value]) => key.startsWith(TEST_RUN_PREFIX) &&
    (!recordingId || value?.sessionId === recordingId))
    .flatMap(([, value]) => { try { return [globalThis.T9TestScript.normalize(value)]; }
      catch { return []; } })
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

// Test suites: the tests of several documents run together. A suite refers to its runs and
// counts its progress from them; a run's document can be deleted, and the suite then shows
// that test as missing.
async function loadTestSuite(suiteId) {
  const key = TEST_SUITE_PREFIX + String(suiteId || "");
  const value = (await chrome.storage.local.get(key))[key];
  return value ? globalThis.T9TestSuite.normalize(value) : null;
}
async function saveTestSuite(suite) {
  const value = globalThis.T9TestSuite.normalize(suite);
  await chrome.storage.local.set({ [TEST_SUITE_PREFIX + value.suiteId]: value });
  return value;
}
async function listTestSuites() {
  const all = await globalThis.T9StorageQueries.getByPrefixes(chrome.storage.local,
    [TEST_SUITE_PREFIX]);
  return Object.entries(all).filter(([key]) => key.startsWith(TEST_SUITE_PREFIX))
    .flatMap(([, value]) => { try { return [globalThis.T9TestSuite.normalize(value)]; }
      catch { return []; } })
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}
// The suite with its progress, counted from the runs as they are stored now.
async function testSuiteProgress(suite) {
  const keys = suite.items.filter(item => item.testRunId)
    .map(item => TEST_RUN_PREFIX + item.testRunId);
  const runs = keys.length ? await chrome.storage.local.get(keys) : {};
  const summaries = {};
  for (const value of Object.values(runs)) {
    try {
      const run = globalThis.T9TestScript.normalize(value);
      summaries[run.testRunId] = { ...globalThis.T9TestScript.summary(run), tester: run.tester };
    } catch { /* A run that cannot be read counts as missing. */ }
  }
  return globalThis.T9TestSuite.progress(suite, summaries);
}
// The suite compared with its previous round, or null when it has none or that round was
// deleted. Runs of both rounds are read to name the steps that failed anew.
async function testSuiteComparison(suite, progress) {
  if (!suite.previousSuiteId) return null;
  const previousSuite = await loadTestSuite(suite.previousSuiteId);
  if (!previousSuite) return null;
  const previous = await testSuiteProgress(previousSuite);
  const first = globalThis.T9TestSuite.compareRounds(progress, previous);
  const pairs = first.items.filter(item => item.testRunId && item.previousTestRunId &&
    ["new-failure", "still-failed", "failed-untested"].includes(item.change));
  const keys = pairs.flatMap(item => [TEST_RUN_PREFIX + item.testRunId,
    TEST_RUN_PREFIX + item.previousTestRunId]);
  const stored = keys.length ? await chrome.storage.local.get(keys) : {};
  const stepChanges = {};
  for (const item of pairs) {
    try {
      const run = globalThis.T9TestScript.normalize(stored[TEST_RUN_PREFIX + item.testRunId]);
      const before = globalThis.T9TestScript.normalize(stored[TEST_RUN_PREFIX + item.previousTestRunId]);
      stepChanges[item.testRunId] = globalThis.T9TestHistory.compare(run, before);
    } catch { /* Without both runs the test is compared by its result only. */ }
  }
  return { ...globalThis.T9TestSuite.compareRounds(progress, previous, stepChanges),
    previous: { suiteId: previousSuite.suiteId, title: previousSuite.title,
      environment: previousSuite.environment, version: previousSuite.version,
      createdAt: previousSuite.createdAt } };
}
// The next round of a suite: a new run of each test still there, with the expected results
// carried over, in a new suite that names the previous one.
async function nextTestSuiteRound(suiteId) {
  const suite = await loadTestSuite(suiteId);
  if (!suite) throw new Error("suite.notFound");
  const newSuiteId = `test-suite-${crypto.randomUUID()}`;
  const runIds = {};
  for (const item of suite.items) {
    const previous = item.testRunId ? await loadTestRun(item.testRunId) : null;
    if (!previous) continue;
    // Whoever begins the test in the new round becomes its tester.
    const run = { ...globalThis.T9TestScript.rerun(previous, {
      testRunId: `test-run-${crypto.randomUUID()}`, suiteId: newSuiteId }), tester: "" };
    runIds[item.sessionId] = (await saveTestRun(globalThis.T9TestScript.carryOver(run, previous))).testRunId;
  }
  if (!Object.keys(runIds).length) throw new Error("suite.noTests");
  return saveTestSuite(globalThis.T9TestSuite.nextRound(suite, runIds, { suiteId: newSuiteId }));
}
async function openTestSuitePage(suiteId) {
  return chrome.tabs.create({ url: chrome.runtime.getURL(
    `test-suite.html?suiteId=${encodeURIComponent(suiteId)}`) });
}

// A bug report from a failed test step. Nothing was recorded for it, so it gets a recording
// of its own without events, and the steps, expected and actual result come from the test:
// the document's steps up to the failed one, its checks and the tester's description.
async function createBugReportFromTestStep(testRunId, stepId) {
  const run = await loadTestRun(testRunId);
  if (!run) throw new Error("test.runNotFound");
  const content = globalThis.T9TestScript.bugReportContent(run, stepId);
  const step = run.steps.find(item => item.stepId === String(stepId));
  if (step.status !== "failed") throw new Error("test.reportOnlyFailed");
  if (!content.actualResult) throw new Error("test.describeFailure");
  const tested = await getSession(run.sessionId);
  const now = new Date().toISOString();
  const id = sessionId(content.title || "Business Central");
  const settings = { ...(tested?.settings || await getSettings()),
    documentLanguage: content.documentLanguage };
  // The report starts in the library folder of the document that was tested.
  const testedRecord = (await getDocumentLibrary()).find(record =>
    (record.projectId || record.sessionId) === run.sessionId);
  await saveSession({ id, name: content.title || "Business Central", purpose: "",
    recordingPurpose: "bug-report",
    ...(testedRecord?.folderId ? { libraryFolderId: String(testedRecord.folderId) } : {}),
    businessCentral: JSON.parse(JSON.stringify(tested?.businessCentral || {})),
    startedAt: now, completedAt: now, updatedAt: now, status: "completed", eventCount: 0,
    version: VERSION, settings, source: content.source });
  await saveEvents(id, []);
  // The step's screenshots go with the report as its evidence, with the values measured
  // when they were taken so the report can cover them.
  const shots = Object.values(await loadTestScreenshots(run, content.screenshotIds));
  for (const [index, shot] of shots.entries()) {
    await saveScreenshot(id, String(index + 1), shot.image);
  }
  let recording = await getCanonicalRecording(id);
  if (shots.length) {
    recording = globalThis.T9CanonicalRecording.normalize({ ...recording,
      assets: recording.assets.map(asset => {
        const shot = shots[Number(asset.metadata?.legacyEventNo) - 1];
        return shot && Array.isArray(shot.valueRegions) ? { ...asset,
          valueRegions: shot.valueRegions, valueRegionsComplete: shot.valueRegionsComplete !== false,
          createdAt: shot.capturedAt } : asset;
      }) });
    await saveCanonicalRecording(recording);
  }
  const model = globalThis.T9BugReportModel;
  let report = globalThis.T9BugReportService.createBugReportFromRecording(recording, [], {
    extensionVersion: VERSION, productVersion: VERSION, errorEvidence: [],
    documentLanguage: content.documentLanguage, title: content.title, now });
  for (const instruction of content.steps) {
    report = model.addReproductionStep(report, instruction, now);
  }
  report = model.updateHumanContent({ ...report, source: content.source }, {
    expectedResult: content.expectedResult, actualResult: content.actualResult }, now);
  if (recording.assets.length) {
    const assetIds = recording.assets.map(asset => asset.id);
    report = model.normalize({ ...report,
      evidence: { ...report.evidence, screenshots: [...(report.evidence?.screenshots || []),
        ...assetIds.map(assetId => ({ assetId, role: "reproduction" }))] },
      traceability: { ...report.traceability, screenshotAssetIds: [
        ...(report.traceability?.screenshotAssetIds || []), ...assetIds] } });
  }
  const saved = await bugReportStore.save(report);
  await withTestRun(run.testRunId, current => globalThis.T9TestScript.updateStep(current, stepId,
    { bugReportId: saved.bugReportId }, now));
  const workspaceUrl = chrome.runtime.getURL(
    `technical-report.html?bugReportId=${encodeURIComponent(saved.bugReportId)}&new=1`);
  const tab = await chrome.tabs.create({ url: workspaceUrl });
  return { report: saved, workspaceUrl, tabId: tab.id };
}

// The suites a deleted document owned move to another of their documents, so they are still
// exported and synchronized; a suite with no other document left is deleted.
async function reanchorTestSuites(id) {
  const owned = (await listTestSuites()).filter(suite => suite.ownerSessionId === id);
  if (!owned.length) return;
  const sessionIds = new Set(owned.flatMap(suite => suite.items.map(item => item.sessionId)));
  const sessions = await chrome.storage.local.get([...sessionIds].map(sessionId => SESSION_PREFIX + sessionId));
  const present = sessionId => sessionId !== id && Boolean(sessions[SESSION_PREFIX + sessionId]);
  for (const suite of owned) {
    const next = globalThis.T9TestSuite.withoutOwner(suite, present);
    if (next) await saveTestSuite(next);
    else await chrome.storage.local.remove(TEST_SUITE_PREFIX + suite.suiteId);
  }
}

async function deleteSession(id) {
  await reanchorTestSuites(id);
  // The document's test runs go with it; reports made from them are kept.
  const runs = await listTestRuns(id);
  if (runs.length) {
    // Recordings made during its tests that were kept because they could not be compared.
    const runIds = new Set(runs.map(run => run.testRunId));
    const all = await globalThis.T9StorageQueries.getByPrefixes(chrome.storage.local,
      [SESSION_PREFIX]);
    for (const [key, value] of Object.entries(all)) {
      if (key.startsWith(SESSION_PREFIX) && value?.testRunId && runIds.has(value.testRunId) &&
          value.id !== id) await deleteSession(value.id);
    }
    await chrome.storage.local.remove(runs.map(run => TEST_RUN_PREFIX + run.testRunId));
  }
  await removeTestScreenshots(`${TEST_SCREENSHOT_PREFIX}${id}:`);
  await screenshotAssetStore.remove(id);
  await rawEventLogStorage.remove(id);
  await canonicalEventLogStorage.remove(id);
  await bcErrorEvidenceStore.remove(id);
  await chrome.storage.local.remove(
    [
      ...globalThis.T9StorageKeys.sessionDataKeys(id),
    ]
  );
}

// Discarding must always work. When the recording cannot be completed, for example because
// its evidence could not be written, it is abandoned as it is and removed, so the user is
// never left with a recording that can be neither stopped nor discarded.
async function cancelActiveSession() {
  const state = await getState();
  let session;
  try {
    session = await stopSession();
  } catch (error) {
    const id = state.sessionId;
    if (!id) throw error;
    session = await getSession(id) || { id };
    screenshotQueue = [];
    preActionCaptures.clear();
    writeQueue = Promise.resolve();
    errorEvidenceWrites = Promise.resolve();
    await setState({ recording: false, sessionId: null, tabId: state.tabId,
      startedAt: null, recordingPurpose: null });
    await setDebug({ activeSessionId: null, lastError: null });
    rawEventStore.release(id);
    canonicalStore.release(id);
    rawEventLogStorage.release(id);
    canonicalEventLogStorage.release(id);
    stoppingSessionId = null;
    recordingLicenseGuard.clear(id);
    tenantLicenseFailureNotifications.delete(String(id));
  }
  if (!session) return null;
  await deleteSession(session.id);
  return session;
}

chrome.runtime.onInstalled.addListener(async details => {
  const current = await chrome.storage.local.get(SETTINGS_KEY);
  if (!current[SETTINGS_KEY]) {
    await chrome.storage.local.set({ [SETTINGS_KEY]: INITIAL_SETTINGS });
  }
  await setState(await getState());
  await registerRecorderContentScript();
  await setDebug({
    installedAt: new Date().toISOString(),
    connected: false,
    lastError: null
  });
  // A new installation opens the Get started page; an update or a browser update does not.
  if (details?.reason === "install") {
    try { await chrome.tabs.create({ url: chrome.runtime.getURL("welcome.html") }); } catch {}
  }
});

chrome.runtime.onStartup.addListener(async () => {
  await setState(await getState());
  await registerRecorderContentScript();
});

// Recording panels open beside Business Central, by the window they are shown in. While one is
// shown in the recording tab's window, the floating box in the page steps aside for it; the
// frame around the page stays. A panel that closes, or a worker that restarts, drops its port.
// The test panel connects too, naming its test: it shows that test's recording and ends it, so
// the box steps aside for it only while that test is recorded.
const RECORDING_PANEL_PORT = "T9_RECORDING_PANEL";
const recordingPanels = new Map();
chrome.runtime.onConnect.addListener(port => {
  if (port.name !== RECORDING_PANEL_PORT || !extensionPageSender(port.sender)) return;
  recordingPanels.set(port, null);
  port.onMessage.addListener(message => {
    if (Number.isInteger(message?.windowId)) {
      recordingPanels.set(port, { windowId: message.windowId,
        testRunId: typeof message.testRunId === "string" ? message.testRunId : "" });
    }
  });
  port.onDisconnect.addListener(() => recordingPanels.delete(port));
});

async function recordingPanelShown(state) {
  if (!state?.recording || !state.tabId || !recordingPanels.size) return false;
  try {
    const tab = await chrome.tabs.get(state.tabId);
    return [...recordingPanels.values()].some(panel => panel?.windowId === tab.windowId &&
      (!panel.testRunId || panel.testRunId === state.testRunId));
  } catch { return false; }
}

// What the capture scripts in Business Central pages send. Every other message changes or
// reads the library, settings, licenses or files and is taken only from the extension's own
// pages, so a script running in a web page cannot delete recordings, change settings, start
// downloads or reach a native helper.
const PAGE_MESSAGE_TYPES = new Set(["T9_PING", "T9_GET_STATE", "T9_REQUEST_STOP_DIALOG",
  "T9_CAPTURE_GUIDANCE", "T9_CAPTURE_DIAGNOSTIC", "T9_RECORD_EVENT", "T9_CAPTURE_BC_ERROR",
  "T9_CAPTURE_BEFORE_ACTION"]);
function extensionPageSender(sender) {
  return sender?.id === chrome.runtime.id &&
    String(sender.url || "").startsWith(chrome.runtime.getURL(""));
}

// The link page of an assignment email, in the top frame of a tab, may only ask for a test
// to be opened.
function openLinkSender(sender) {
  const page = globalThis.T9TenantLicenseConfig?.openLink;
  let url;
  try { url = new URL(String(sender?.url || "")); } catch { return false; }
  return Boolean(page && sender?.id === chrome.runtime.id && sender.frameId === 0 && sender.tab?.id &&
    url.origin + url.pathname === page);
}

// The recording panel beside Business Central carries out a start begun from the toolbar popup
// (Edge closes the popup when the panel opens), so it may run the license steps of a start.
function fromRecordingPanel(sender) {
  const page = chrome.runtime.getURL("recording-panel.html");
  return sender?.id === chrome.runtime.id && !sender.tab &&
    (sender.url === page || Boolean(sender.url?.startsWith(`${page}?`)));
}

function messageAllowed(message, sender) {
  return extensionPageSender(sender) || PAGE_MESSAGE_TYPES.has(message?.type) ||
    (message?.type === "T9_OPEN_LINK" && openLinkSender(sender));
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!messageAllowed(message, sender)) {
    sendResponse({ ok: false, error: "not-allowed" });
    return false;
  }
  (async () => {
    switch (message.type) {
      case "T9_PING": {
        const pingState = await getState();
        await updateFrameDiagnostic(sender, message.frameUrl,
          message.frameDepth, pingState, message);
        const pingDebug = await chrome.storage.local.get(DEBUG_KEY);
        const recordingForSender = Boolean(pingState.recording &&
          sender.tab?.id === pingState.tabId);
        sendResponse({ ok: true, version: VERSION,
          state: { ...pingState, recording: recordingForSender,
            sessionId: recordingForSender ? pingState.sessionId : null,
            recordingPurpose: recordingForSender
              ? pingState.recordingPurpose : null },
          diagnosticsEnabled: Boolean(
            pingDebug[DEBUG_KEY]?.captureDiagnosticsEnabled
          ) });
        break;
      }

      case "T9_CAPTURE_DIAGNOSTIC":
        await appendCaptureDiagnostic(message.diagnostic, sender);
        sendResponse({ ok: true });
        break;

      case "T9_CAPTURE_BC_ERROR": {
        const operation = errorEvidenceWrites.then(() =>
          captureBcErrorEvidence(message.evidence || {}, sender));
        errorEvidenceWrites = operation.catch(() => {});
        sendResponse({ ok: true, evidence: await operation });
        break;
      }

      case "T9_CAPTURE_BEFORE_ACTION": {
        const preActionState = await getState();
        if (preActionState.recording) await requireActiveTenantLicense(preActionState);
        const preActionTabId = sender.tab?.id;
        const preActionSession = preActionState.sessionId
          ? await getSession(preActionState.sessionId) : null;
        const preActionSettings = preActionSession?.settings ||
          await getSettings();
        if (!preActionState.recording || !preActionState.sessionId ||
            !preActionTabId || !message.interactionId ||
            !preActionSettings.captureScreenshots ||
            preActionSettings.screenshotMode === "none") {
          sendResponse({ ok: false });
          break;
        }
        screenshotStats.requested += 1;
        const entry = { sessionId: preActionState.sessionId,
          tabId: preActionTabId, createdAt: Date.now(),
          promise: capture(preActionTabId,
            { valueRegions: preActionSession?.recordingPurpose === "bug-report" }) };
        preActionCaptures.set(message.interactionId, entry);
        setTimeout(() => {
          if (preActionCaptures.get(message.interactionId) === entry) {
            preActionCaptures.delete(message.interactionId);
            screenshotStats.dropped += 1;
            void setDebug({ screenshotStats: { ...screenshotStats } });
          }
        }, 10000);
        sendResponse({ ok: true });
        break;
      }

      case "T9_SET_CAPTURE_DIAGNOSTICS":
        if (sender.url !== chrome.runtime.getURL("debug.html") ||
            !(await technicalDiagnosticsPolicyEnabled())) {
          sendResponse({ ok: false, reason: "technical-diagnostics-policy-required" });
          break;
        }
        await setDebug(message.enabled
          ? { captureDiagnosticsEnabled: true, captureDiagnostics: [],
            captureStageCounts: {}, lastCaptureDiagnostic: null }
          : { captureDiagnosticsEnabled: false });
        sendResponse({ ok: true, enabled: Boolean(message.enabled) });
        break;

      case "T9_REGISTER_CONTENT_SCRIPT": {
        const registered = await registerRecorderContentScript();
        const injections = await injectRecorderIntoExistingBcTabs();
        sendResponse({
          ok: registered,
          registered,
          injections
        });
        break;
      }

      case "T9_GET_REGISTRATION_STATUS": {
        const status = await getRecorderRegistrationStatus();
        sendResponse({ ok: true, ...status });
        break;
      }

      case "T9_PREPARE_TAB": {
        const tabId = message.tabId || sender.tab?.id;
        if (!tabId) throw new Error("Ingen Business Central-flik angavs.");
        const connected = await ensureContentScript(tabId);
        sendResponse({ ok: connected, connected });
        break;
      }

      case "T9_LICENSE_INFORMATION": {
        sendResponse({ ok: true, information: await tenantLicense.information() });
        break;
      }
      case "T9_ACCEPT_LICENSE_NOTICE": {
        if (sender.url !== chrome.runtime.getURL("popup.html") &&
            !fromRecordingPanel(sender)) {
          throw new Error("Licensregistrering måste bekräftas i tilläggets popup.");
        }
        await tenantLicense.acceptNotice();
        sendResponse({ ok: true });
        break;
      }
      case "T9_LICENSE_CHECK": {
        if (sender.url !== chrome.runtime.getURL("popup.html") &&
            !sender.url?.startsWith(chrome.runtime.getURL("license-status.html")) &&
            !fromRecordingPanel(sender)) {
          throw new Error("Licenskontroll får bara startas från tilläggets licensvyer.");
        }
        const tab = await chrome.tabs.get(message.tabId);
        sendResponse({ ok: true, tenantId: globalThis.T9TenantLicense.tenantFromUrl(tab.url),
          license: await tenantLicense.check(tab.url, { force: message.force === true }) });
        break;
      }
      case "T9_REQUEST_TRIAL": {
        if (sender.url !== chrome.runtime.getURL("popup.html") &&
            !fromRecordingPanel(sender)) {
          throw new Error("Testlicens får bara begäras från tilläggets popup.");
        }
        const tab = await chrome.tabs.get(message.tabId);
        sendResponse({ ok: true,
          license: await tenantLicense.requestTrial(tab.url) });
        break;
      }
      case "T9_LICENSE_SUMMARY": {
        if (sender.url !== chrome.runtime.getURL("popup.html") &&
            !sender.url?.startsWith(chrome.runtime.getURL("license-status.html"))) {
          throw new Error("Licensöversikten får bara öppnas från tilläggets licensvyer.");
        }
        sendResponse({ ok: true, licenses: await tenantLicense.summaries() });
        break;
      }
      case "T9_CONSULTANT_LICENSE_STATUS": {
        const value = await consultantLicense.state();
        sendResponse({ ok: true, configured: consultantLicense.configured(),
          signedIn: Boolean(value.refreshToken), expiresAt: value.expiresAt || 0,
          profile: value.profile || {}, license: value.license || null });
        break;
      }
      case "T9_MICROSOFT_SIGN_IN": {
        if (sender.url !== chrome.runtime.getURL("popup.html") &&
            !sender.url?.startsWith(chrome.runtime.getURL("license-status.html")) &&
            !fromRecordingPanel(sender)) {
          throw new Error("Microsoft-inloggning får bara startas från tilläggets licensvyer.");
        }
        const account = await consultantLicense.signIn();
        sendResponse({ ok: true, profile: account.profile || {} });
        break;
      }
      case "T9_TENANT_USER_REGISTER": {
        if (sender.url !== chrome.runtime.getURL("popup.html") &&
            !sender.url?.startsWith(chrome.runtime.getURL("license-status.html")) &&
            !fromRecordingPanel(sender)) {
          throw new Error("Användarregistrering får bara startas från tilläggets licensvyer.");
        }
        const tab = await chrome.tabs.get(message.tabId);
        const tenantId = globalThis.T9TenantLicense.tenantFromUrl(tab.url);
        if (!tenantId) throw new Error("Ingen Business Central-tenant kunde identifieras.");
        const registration = await consultantLicense.registerTenantUser(tenantId,
          await tenantLicense.installationId());
        sendResponse({ ok: true, registration });
        break;
      }
      case "T9_CONSULTANT_LICENSE_CHECK": {
        const tab = await chrome.tabs.get(message.tabId);
        const tenantId = globalThis.T9TenantLicense.tenantFromUrl(tab.url);
        const license = consultantLicense.configured()
          ? await consultantLicense.check(tenantId, await tenantLicense.installationId())
          : { allowed: false, configured: false };
        sendResponse({ ok: true, license });
        break;
      }
      case "T9_CONSULTANT_LICENSE_SIGN_IN": {
        if (!sender.url?.startsWith(chrome.runtime.getURL("license-status.html"))) {
          throw new Error("Konsultinloggning får bara startas från licenssidan.");
        }
        await consultantLicense.signIn();
        const license = await consultantLicense.register(await tenantLicense.installationId());
        sendResponse({ ok: true, license });
        break;
      }
      case "T9_CONSULTANT_LICENSE_SIGN_OUT": {
        await consultantLicense.signOut();
        if (chrome.storage.session) {
          const outlookKeys = Object.keys(await chrome.storage.session.get(null))
            .filter(key => key.startsWith("t9OutlookAuthSessionV1:"));
          if (outlookKeys.length) await chrome.storage.session.remove(outlookKeys);
        }
        sendResponse({ ok: true });
        break;
      }
      case "T9_START": {
        const tabId = message.tabId || sender.tab?.id;
        if (!tabId) throw new Error("Ingen Business Central-flik angavs.");
        const session = await startSession(message, tabId);
        sendResponse({ ok: true, session });
        break;
      }

      case "T9_START_BUG_RECORDING": {
        const tabId = message.tabId || sender.tab?.id;
        if (!tabId) throw new Error("Ingen Business Central-flik angavs.");
        const session = await startSession({ ...message,
          recordingPurpose: "bug-report" }, tabId);
        sendResponse({ ok: true, session });
        break;
      }

      case "T9_START_TEST_RECORDING": {
        const tabId = message.tabId || sender.tab?.id;
        if (!tabId) throw new Error("test.noBusinessCentralTab");
        const session = await startTestRecording(message.testRunId, tabId);
        sendResponse({ ok: true, session });
        break;
      }

      case "T9_STOP_TEST_RECORDING": {
        sendResponse({ ok: true, ...(await stopTestRecording()) });
        break;
      }

      case "T9_RETRY_TEST_RECORDING_CHECK": {
        const run = await loadTestRun(message.testRunId);
        const recordingId = run?.recordingCheck?.failed ? run.recordingCheck.recordingId : "";
        if (!recordingId) throw new Error("test.noTestRecording");
        sendResponse({ ok: true, ...(await compareTestRecording(recordingId)) });
        break;
      }

      case "T9_STOP": {
        // A test recording is always compared with its test, whichever page stops it.
        if ((await getState()).testRunId) {
          sendResponse({ ok: true, ...(await stopTestRecording()) });
          break;
        }
        const session = await stopSession(message.name, message.documentLanguage);
        sendResponse({ ok: true, session });
        break;
      }

      case "T9_CANCEL_RECORDING": {
        const session = await cancelActiveSession();
        sendResponse({ ok: true, sessionId: session?.id || null });
        break;
      }

      case "T9_FINISH_BUG_RECORDING": {
        const state = await getState();
        const active = state.sessionId ? await getSession(state.sessionId) : null;
        if (!active || active.recordingPurpose !== "bug-report") {
          throw new Error("Ingen aktiv felinspelning finns.");
        }
        const session = await stopSession(message.name, message.documentLanguage);
        const created = await createAndOpenBugReport(session.id, message.name);
        sendResponse({ ok: true, session, report: created.report,
          workspaceUrl: created.workspaceUrl, tabId: created.tabId });
        break;
      }

      case "T9_REPORT_VISIBLE_BC_ERROR": {
        // A bug report from an error that is already on screen: a bug recording is started,
        // every frame captures the open error dialog through the normal evidence path, and
        // the recording is stopped at once. Nothing was captured before the user asked.
        const tabId = message.tabId || sender.tab?.id;
        if (!tabId) throw new Error("Ingen Business Central-flik angavs.");
        const session = await startSession({ name: "Business Central-fel", purpose: "",
          recordingPurpose: "bug-report" }, tabId);
        let captured = 0;
        try {
          const frames = await chrome.webNavigation.getAllFrames({ tabId })
            .catch(() => null) || [{ frameId: 0 }];
          const results = await Promise.all(frames.map(frame => chrome.tabs.sendMessage(
            tabId, { type: "T9_CAPTURE_VISIBLE_BC_ERROR", sessionId: session.id },
            { frameId: frame.frameId }).catch(() => null)));
          captured = results.reduce((sum, result) => sum + (Number(result?.captured) || 0), 0);
        } catch (error) {
          await cancelActiveSession();
          throw error;
        }
        if (!captured) {
          await cancelActiveSession();
          throw new Error("recorder.noVisibleError");
        }
        const stopped = await stopSession("", message.documentLanguage);
        const created = await createAndOpenBugReport(stopped.id, "");
        sendResponse({ ok: true, session: stopped, report: created.report,
          workspaceUrl: created.workspaceUrl, tabId: created.tabId });
        break;
      }

      case "T9_CREATE_BUG_REPORT": {
        const recording = await getCanonicalRecording(message.recordingId);
        const errorEvidence = await getBcErrorEvidenceForRecording(
          message.recordingId);
        const report = globalThis.T9BugReportService
          .createBugReportFromRecording(recording,
            Array.isArray(message.derivedSteps) ? message.derivedSteps : [], {
              ...(message.context || {}), extensionVersion: VERSION,
              productVersion: VERSION, errorEvidence
            });
        const saved = await bugReportStore.save(report);
        await setDebug({ alCallStackParser: saved.technicalDiagnostics.map(item => ({
          parserVersion: item.callStack.parserVersion,
          parseStatus: item.summary.parseStatus,
          frameCount: item.summary.frameCount,
          parsedFrameCount: item.summary.parsedFrameCount,
          unknownFrameCount: item.summary.unknownFrameCount,
          warningCodes: item.warnings.map(value => value.code)
        })) });
        sendResponse({ ok: true, report: saved, workspaceUrl:
          chrome.runtime.getURL(`technical-report.html?bugReportId=${encodeURIComponent(
            saved.bugReportId)}`) });
        break;
      }

      case "T9_CREATE_TEST_RUN": {
        // Expected results written in the latest earlier run of the document are kept.
        const runs = await listTestRuns();
        const sessionId = String(message.run?.sessionId || "");
        const previous = runs.find(value => value.sessionId === sessionId);
        // The tester is the signed-in person, or else whoever tested last; the test page can
        // change it. The name stays on this computer with the test.
        // A test made for a suite is filled in by whoever begins it, on their computer.
        const carried = globalThis.T9TestScript.carryOver(message.run, previous);
        const run = await saveTestRun(message.run?.suiteId ? carried : globalThis.T9TestScript
          .withTester(carried, { signedIn: (await signedInPerson())?.name, runs }));
        // A run made for a suite is opened from the suite's page.
        const tab = message.open === false ? null : await chrome.tabs.create({ url: chrome.runtime.getURL(
          `test-run.html?testRunId=${encodeURIComponent(run.testRunId)}`) });
        sendResponse({ ok: true, run, tabId: tab?.id });
        break;
      }

      case "T9_CREATE_TEST_SUITE": {
        const suite = await saveTestSuite(message.suite);
        if (message.open !== false) await openTestSuitePage(suite.suiteId);
        sendResponse({ ok: true, suite });
        break;
      }

      case "T9_ADD_TO_TEST_SUITE": {
        // Tests for more documents, made by the page with this suite's id, added at the end.
        const current = await loadTestSuite(message.suiteId);
        if (!current) throw new Error("suite.notFound");
        const result = globalThis.T9TestSuite.addItems(current, message.items, new Date().toISOString());
        const suite = result.added.length ? await saveTestSuite(result.suite) : current;
        sendResponse({ ok: true, suite, added: result.added.length,
          already: result.already.map(item => item.sessionId), full: result.full.map(item => item.sessionId) });
        break;
      }

      case "T9_TEST_PEOPLE": {
        // Who tests can be assigned to: the signed-in person and everyone assigned before.
        const me = await signedInPerson();
        sendResponse({ ok: true, me, people: globalThis.T9TestSuite.people(await listTestSuites(), me) });
        break;
      }

      // A link to a test from an assignment email: the test when it is on this computer,
      // else its suite, else the suite's page saying the suite has not arrived yet.
      case "T9_OPEN_LINK": {
        const id = value => /^[A-Za-z0-9_-]{1,128}$/u.test(String(value || "")) ? String(value) : "";
        const suiteId = id(message.suiteId), testRunId = id(message.testRunId);
        if (!suiteId) throw new Error("suite.notFound");
        const page = testRunId && await loadTestRun(testRunId)
          ? `test-run.html?testRunId=${encodeURIComponent(testRunId)}`
          : `test-suite.html?suiteId=${encodeURIComponent(suiteId)}${await loadTestSuite(suiteId) ? "" : "&from=link"}`;
        await chrome.tabs.update(sender.tab.id, { url: chrome.runtime.getURL(page) });
        sendResponse({ ok: true });
        break;
      }

      case "T9_LOAD_TEST_SUITE": {
        const suite = await loadTestSuite(message.suiteId);
        if (!suite) throw new Error("suite.notFound");
        const progress = await testSuiteProgress(suite);
        sendResponse({ ok: true, suite, progress, me: await signedInPerson(),
          comparison: await testSuiteComparison(suite, progress) });
        break;
      }

      case "T9_LIST_TEST_SUITES": {
        let suites = await listTestSuites();
        const rounds = globalThis.T9TestSuite.roundNumbers(suites);
        const me = await signedInPerson();
        // Tests shows only the latest round of each suite, with its comparison counts.
        if (message.latestRounds) {
          const replaced = new Set(suites.map(suite => suite.previousSuiteId).filter(Boolean));
          suites = suites.filter(suite => !replaced.has(suite.suiteId));
        }
        if (Number(message.limit) > 0) suites = suites.slice(0, Number(message.limit));
        const listed = [];
        for (const suite of suites) {
          const progress = await testSuiteProgress(suite);
          const entry = { suiteId: suite.suiteId, title: suite.title, environment: suite.environment,
            version: suite.version, createdAt: suite.createdAt, round: rounds[suite.suiteId] || 1,
            archived: suite.archived, archivedAt: suite.archivedAt,
            mine: me ? globalThis.T9TestSuite.waitingFor(progress.items, me).length : 0,
            progress: { ...progress, items: undefined } };
          if (message.comparison) {
            let comparison = null;
            try { comparison = await testSuiteComparison(suite, progress); } catch { comparison = null; }
            entry.comparison = comparison && { counts: comparison.counts, previous: comparison.previous };
          }
          listed.push(entry);
        }
        sendResponse({ ok: true, suites: listed, me });
        break;
      }

      case "T9_UPDATE_TEST_SUITE": {
        const current = await loadTestSuite(message.suiteId);
        if (!current) throw new Error("suite.notFound");
        const suite = await saveTestSuite(globalThis.T9TestSuite.update(current, message.patch || {},
          new Date().toISOString()));
        const progress = await testSuiteProgress(suite);
        sendResponse({ ok: true, suite, progress, me: await signedInPerson(),
          comparison: await testSuiteComparison(suite, progress) });
        break;
      }

      case "T9_DELETE_TEST_SUITE": {
        // The suite goes; its runs stay with their documents as earlier runs.
        await chrome.storage.local.remove(TEST_SUITE_PREFIX + String(message.suiteId || ""));
        sendResponse({ ok: true });
        break;
      }

      case "T9_NEXT_TEST_SUITE_ROUND": {
        const suite = await nextTestSuiteRound(message.suiteId);
        await openTestSuitePage(suite.suiteId);
        sendResponse({ ok: true, suite });
        break;
      }

      case "T9_LOAD_TEST_RUN": {
        const run = await loadTestRun(message.testRunId);
        if (!run) throw new Error("test.runNotFound");
        sendResponse({ ok: true, run });
        break;
      }

      case "T9_UPDATE_TEST_RUN": {
        const run = await withTestRun(message.testRunId, async current => {
          const changed = globalThis.T9TestScript.applyChanges(current, message.changes,
            new Date().toISOString());
          // The person who begins a test without a tester is the one doing it: the signed-in
          // person on this computer, or else whoever tested last.
          if (changed.tester.trim() || !globalThis.T9TestHistory.started(changed)) return changed;
          return globalThis.T9TestScript.withTester(changed, { signedIn: (await signedInPerson())?.name,
            runs: await listTestRuns() });
        });
        sendResponse({ ok: true, run });
        break;
      }

      case "T9_CANCEL_TEST_RUN": {
        // A test in progress is cancelled: kept with what was tested, no longer in progress.
        const run = await withTestRun(message.testRunId, current =>
          globalThis.T9TestScript.cancel(current, new Date().toISOString()));
        const key = globalThis.T9StorageKeys.ACTIVE_TEST_RUN_KEY;
        if ((await chrome.storage.local.get(key))[key]?.testRunId === run.testRunId) {
          await chrome.storage.local.remove(key);
        }
        sendResponse({ ok: true, run });
        break;
      }

      case "T9_RESUME_TEST_RUN": {
        const run = await withTestRun(message.testRunId, current =>
          globalThis.T9TestScript.resume(current, new Date().toISOString()));
        sendResponse({ ok: true, run });
        break;
      }

      case "T9_SET_ACTIVE_TEST_RUN": {
        const run = await loadTestRun(String(message.testRunId || ""));
        if (run) {
          await chrome.storage.local.set({ [globalThis.T9StorageKeys.ACTIVE_TEST_RUN_KEY]:
            { testRunId: run.testRunId, at: new Date().toISOString() } });
        }
        sendResponse({ ok: true });
        break;
      }

      case "T9_CLEAR_ACTIVE_TEST_RUN": {
        // Only the test named is ended, so a test opened meanwhile stays active.
        const key = globalThis.T9StorageKeys.ACTIVE_TEST_RUN_KEY;
        const pointer = (await chrome.storage.local.get(key))[key];
        if (!message.testRunId || pointer?.testRunId === String(message.testRunId)) {
          await chrome.storage.local.remove(key);
        }
        sendResponse({ ok: true });
        break;
      }

      case "T9_GET_ACTIVE_TEST_RUN": {
        const run = await activeTestRun();
        // Comparable: its steps can be recognised in a recording, so it can be started from the
        // toolbar button, which also lets the extension take screenshots of the tab.
        sendResponse({ ok: true, run: run ? { testRunId: run.testRunId, title: run.title,
          summary: globalThis.T9TestScript.summary(run),
          comparable: run.steps.some(step => globalThis.T9TestRecordingMatch.hasSignature(step.signature)) } : null });
        break;
      }

      case "T9_MARK_TEST_TAB": {
        sendResponse({ ok: true, marked: await markTestTab(message.tabId, message.title) });
        break;
      }

      case "T9_TEST_TAB_OPENED": {
        // The toolbar button was used on this tab, so the browser lets the extension capture it.
        if (Number.isInteger(message.tabId)) {
          const tab = await chrome.tabs.get(message.tabId).catch(() => null);
          if (tab && isBusinessCentralUrl(tab.url)) await setTestTabAccess(tab.id, true);
          await clearTestTabMark(message.tabId);
        }
        sendResponse({ ok: true });
        break;
      }

      case "T9_FIND_TEST_TAB": {
        // The Business Central tab the panel opens beside.
        const tab = await businessCentralTabFor(String(message.sessionId || ""));
        sendResponse({ ok: true, tab: tab ? { id: tab.id, windowId: tab.windowId } : null });
        break;
      }

      case "T9_CAPTURE_TEST_SCREENSHOT": {
        sendResponse({ ok: true, ...await captureTestScreenshot(message) });
        break;
      }

      case "T9_LOAD_TEST_SCREENSHOTS": {
        const run = await loadTestRun(message.testRunId);
        if (!run) throw new Error("test.runNotFound");
        const shots = await loadTestScreenshots(run, message.screenshotIds);
        sendResponse({ ok: true, screenshots: Object.fromEntries(Object.entries(shots)
          .map(([id, value]) => [id, value.image])) });
        break;
      }

      case "T9_DELETE_TEST_SCREENSHOT": {
        const run = await withTestRun(message.testRunId, current => globalThis.T9TestScript
          .removeScreenshot(current, message.stepId, message.screenshotId, new Date().toISOString()));
        await chrome.storage.local.remove(testScreenshotKey(run, String(message.screenshotId || "")));
        sendResponse({ ok: true, run });
        break;
      }

      case "T9_LIST_TEST_RUNS": {
        // Earlier runs of the same document, newest first, with their results counted.
        const runs = await listTestRuns(String(message.sessionId || ""));
        sendResponse({ ok: true, runs: runs.map(run => ({ testRunId: run.testRunId,
          title: run.title, createdAt: run.createdAt, updatedAt: run.updatedAt, tester: run.tester,
          environment: run.environment, summary: globalThis.T9TestScript.summary(run) })) });
        break;
      }

      case "T9_TEST_HISTORY": {
        // Every run of one document, newest first, each compared with the run before it.
        const runs = await listTestRuns(String(message.sessionId || ""));
        sendResponse({ ok: true, history: globalThis.T9TestHistory.history(runs,
          String(message.sessionId || "")) });
        break;
      }

      case "T9_TEST_OVERVIEW": {
        // Every run in brief (its results, not its texts or screenshots) and the suites, for the
        // test overview, which picks the runs its filters keep.
        const [runs, suites] = await Promise.all([listTestRuns(), listTestSuites()]);
        sendResponse({ ok: true, runs: runs.map(run => ({ testRunId: run.testRunId,
          sessionId: run.sessionId, createdAt: run.createdAt, updatedAt: run.updatedAt,
          environment: run.environment, tester: run.tester, suiteId: run.suiteId || null,
          cancelledAt: run.cancelledAt || null,
          steps: run.steps.map(step => ({ status: step.status, resultSource: step.resultSource })) })),
        suites: suites.map(suite => ({ suiteId: suite.suiteId, title: suite.title,
          environment: suite.environment, version: suite.version, createdAt: suite.createdAt })) });
        break;
      }

      case "T9_TEST_LATEST": {
        // The latest test result of every document that has been tested, for the library.
        const latest = globalThis.T9TestHistory.latest(await listTestRuns());
        sendResponse({ ok: true, latest: [...latest.values()] });
        break;
      }

      case "T9_CREATE_BUG_REPORT_FROM_TEST_STEP": {
        const result = await createBugReportFromTestStep(message.testRunId, message.stepId);
        sendResponse({ ok: true, ...result });
        break;
      }

      case "T9_REGENERATE_BUG_REPORT": {
        const current = await bugReportStore.load(message.bugReportId);
        if (!current) throw new Error("Felrapporten kunde inte hittas.");
        const result = await createAndOpenBugReport(current.recordingId, "", current);
        sendResponse({ ok: true, ...result });
        break;
      }

      case "T9_OPEN_TECHNICAL_REPORT": {
        const report = await bugReportStore.load(message.bugReportId);
        if (!report) throw new Error("Bug Report kunde inte hittas.");
        const tab = await chrome.tabs.create({ url: chrome.runtime.getURL(
          `technical-report.html?bugReportId=${encodeURIComponent(
            report.bugReportId)}`) });
        sendResponse({ ok: true, tabId: tab.id });
        break;
      }

      case "T9_REPARSE_BUG_REPORT_TECHNICAL_DIAGNOSTICS": {
        const current = await bugReportStore.load(message.bugReportId);
        if (!current) throw new Error("Bug Report kunde inte hittas.");
        const errorEvidence = await getBcErrorEvidenceForRecording(
          current.recordingId);
        const reparsed = globalThis.T9BugReportService
          .reparseTechnicalDiagnostics(current, errorEvidence);
        sendResponse({ ok: true, report: await bugReportStore.save(reparsed) });
        break;
      }

      case "T9_LOAD_BUG_REPORT": {
        const report = await refreshStoredBugReport(
          await bugReportStore.load(message.bugReportId));
        sendResponse({ ok: true, report });
        break;
      }

      case "T9_LIST_BUG_REPORTS": {
        sendResponse({ ok: true, reports: await bugReportStore.list() });
        break;
      }

      case "T9_UPDATE_BUG_REPORT": {
        const current = await bugReportStore.load(message.bugReportId);
        if (!current) throw new Error("Bug Report kunde inte hittas.");
        const updated = globalThis.T9BugReportModel.updateHumanContent(
          current, message.humanContent || {}, new Date().toISOString()
        );
        sendResponse({ ok: true, report: await bugReportStore.save(updated) });
        break;
      }

      case "T9_SAVE_BUG_REPORT": {
        // A report tab opened before the report was marked resolved from a test keeps the
        // later of the two choices.
        const model = globalThis.T9BugReportModel;
        const incoming = model.normalize(message.report);
        const stored = await bugReportStore.load(incoming.bugReportId);
        const resolution = model.laterResolution(stored?.resolution, incoming.resolution);
        sendResponse({ ok: true, report: await bugReportStore.save(resolution
          ? { ...incoming, resolution } : incoming) });
        break;
      }

      case "T9_SET_BUG_REPORT_RESOLUTION": {
        // Marks a bug report resolved, or open again, without changing what it says.
        const current = await bugReportStore.load(message.bugReportId);
        if (!current) throw new Error("test.resolveFailed");
        const resolution = { state: message.state === "open" ? "open" : "resolved",
          ...(message.state !== "open" && message.testRunId
            ? { testRunId: String(message.testRunId), stepId: String(message.stepId || "") } : {}) };
        const saved = await bugReportStore.save(globalThis.T9BugReportModel.setResolution(
          current, resolution, new Date().toISOString()));
        sendResponse({ ok: true, report: { bugReportId: saved.bugReportId,
          title: saved.summary.title, resolution: saved.resolution || null } });
        break;
      }

      case "T9_TEST_RUN_OPEN_REPORTS": {
        // The bug reports, still open, that were made from each step of a run or from the same
        // step in an earlier run of the document. A step that passes can then offer to mark
        // them resolved.
        const run = await loadTestRun(String(message.testRunId || ""));
        if (!run) { sendResponse({ ok: true, steps: {} }); break; }
        const linked = globalThis.T9TestHistory.linkedReports(run,
          await listTestRuns(String(run.sessionId || "")));
        const ids = [...new Set([...linked.values()].flat())];
        const reports = new Map((await Promise.all(ids.map(id => bugReportStore.load(id)
          .catch(() => null)))).filter(Boolean).map(report => [report.bugReportId, report]));
        const steps = {};
        for (const [stepId, reportIds] of linked) {
          const open = reportIds.map(id => reports.get(id)).filter(report => report &&
            report.status !== "archived" && !globalThis.T9BugReportModel.isResolved(report));
          if (open.length) {
            steps[stepId] = open.map(report => ({ bugReportId: report.bugReportId,
              title: report.summary.title || "" }));
          }
        }
        sendResponse({ ok: true, steps });
        break;
      }

      case "T9_BUILD_ISSUE_PACKAGE": { // Local projection only; no transmission.
        const report = await bugReportStore.load(message.bugReportId);
        if (!report) throw new Error("Bug Report kunde inte hittas.");
        const evidence = await getBcErrorEvidenceForRecording(report.recordingId);
        // Where the error comes from needs Microsoft's known error messages, loaded once.
        await globalThis.T9ErrorCause?.loadKnown?.();
        const issuePackage = globalThis.T9IssuePackage.build(report,
          { errorEvidence: evidence }, { generatedAt: new Date().toISOString(),
            includeCallStack: Boolean(message.options?.includeCallStack),
            includeTechnicalDetails: Boolean(
              message.options?.includeTechnicalDetails) });
        sendResponse({ ok: true, issuePackage,
          markdown: globalThis.T9IssuePackageMarkdown.markdown(issuePackage) });
        break;
      }

      case "T9_ARCHIVE_BUG_REPORT":
        sendResponse({ ok: true, report: await bugReportStore.archive(
          message.bugReportId, new Date().toISOString()) });
        break;

      case "T9_DELETE_BUG_REPORT":
        await bugReportStore.remove(message.bugReportId);
        sendResponse({ ok: true });
        break;

      // A Page Scripting file made from the recording, for the library to hand to downloads.
      case "T9_BUILD_PAGE_SCRIPT": {
        const session = await getSession(message.sessionId);
        if (!session) throw new Error("The recording was not found.");
        const raw = await getRawRecording(session.id).catch(() => null);
        // The knowledge catalog says whether the test's first page is a card or a list.
        await pageKnowledgePacksReady;
        const pageTypeOf = event => globalThis.T9PageIdentificationEngine.getPageDefinition(
          globalThis.T9PageIdentity.observedPageObjectId(event))?.pageType || null;
        const result = globalThis.T9PageScriptExport.build({ name: session.name,
          locale: session.settings?.documentLanguage || "en-US", pageTypeOf,
          description: "BC Process Studio", events: raw?.events || [] });
        sendResponse({ ok: true, content: result.content, stepCount: result.stepCount,
          skipped: result.skipped, startPage: result.startPage,
          recordedIdentity: result.recordedIdentity, startsOnRecord: result.startsOnRecord,
          startCaption: result.startCaption,
          fileName: globalThis.T9PageScriptExport.fileName(session.name) });
        break;
      }

      case "T9_GET_STATE": {
        const state = await getState();
        const session = state.sessionId ? await getSession(state.sessionId) : null;
        const debugData = await chrome.storage.local.get(DEBUG_KEY);
        const debug = debugData[DEBUG_KEY] || {};
        sendResponse({ ok: true, state, session,
          isRecordingTab: Boolean(state.recording &&
            sender.tab?.id === state.tabId),
          recordingPanelOpen: await recordingPanelShown(state),
          liveStatus: state.recording
            ? globalThis.T9RecordingLiveStatus.derive({ session, debug,
              connected: debug.connected !== false })
            : null });
        break;
      }

      case "T9_REQUEST_STOP_DIALOG": {
        const state = await getState();
        if (!state.recording) throw new Error("Ingen aktiv inspelning finns.");
        await setState({ ...state, stopPromptRequested: true });
        try {
          await chrome.action.openPopup();
          sendResponse({ ok: true });
        } catch (error) {
          await setState({ ...state, stopPromptRequested: false });
          throw new Error("Kunde inte öppna inspelningsdialogen. " +
            "Öppna tillägget för att stoppa inspelningen.");
        }
        break;
      }

      case "T9_CLEAR_STOP_REQUEST": {
        const state = await getState();
        if (state.stopPromptRequested) {
          await setState({ ...state, stopPromptRequested: false });
        }
        sendResponse({ ok: true });
        break;
      }

      case "T9_RECORD_EVENT": {
        const captureDebug = await chrome.storage.local.get(DEBUG_KEY);
        if (captureDebug[DEBUG_KEY]?.captureDiagnosticsEnabled) {
          await appendCaptureDiagnostic({ stage: "background-message-received",
            eventType: message.event?.type, accepted: true,
            sourceEventId: message.event?.sourceEventId }, sender);
        }
        await recordEvent(message.event, {
          tabId: sender.tab?.id,
          frameId: sender.frameId,
          parentFrameId: sender.parentFrameId,
          documentId: sender.documentId,
          origin: sender.origin || sender.url
        });
        sendResponse({ ok: true });
        break;
      }

      case "T9_CAPTURE_GUIDANCE": {
        try {
          const guidance = await recordCaptureGuidance(message.kind, sender, {
            targetSourceEventIds: message.targetSourceEventIds,
            preferredScreenshotAssetId: message.preferredScreenshotAssetId,
            sectionTitle: message.sectionTitle });
          // The panel shows the change at once rather than after the usual pause.
          liveStepsCache = { ...liveStepsCache, computedAt: 0 };
          sendResponse({ ok: true, guidance });
        } catch (error) {
          sendResponse({ ok: false, error: String(error?.message || error),
            ...(error?.code ? { code: error.code } : {}) });
        }
        break;
      }

      // The steps the recording panel shows: the active recording's document as it grows.
      // Pictures of the active recording's steps, for the panel's thumbnails and image choice.
      case "T9_GET_LIVE_STEP_IMAGES": {
        const imageState = await getState();
        if (!imageState.recording || !imageState.sessionId || imageState.testRunId) {
          sendResponse({ ok: false, code: "no-recording" });
          break;
        }
        const paths = [...new Set((Array.isArray(message.paths) ? message.paths : [])
          .filter(value => typeof value === "string" &&
            globalThis.T9ScreenshotAssetPaths.keyForPath(value)))].slice(0, 24);
        const screenshots = await getScreenshotDataForPaths(imageState.sessionId, paths);
        sendResponse({ ok: true, screenshots });
        break;
      }

      case "T9_GET_LIVE_STEPS": {
        const liveState = await getState();
        if (!liveState.recording || !liveState.sessionId || liveState.testRunId) {
          sendResponse({ ok: false, code: "no-recording" });
          break;
        }
        try {
          const live = await liveDocumentSteps(liveState.sessionId, message.language);
          sendResponse(live ? { ok: true, live } : { ok: false, code: "no-recording" });
        } catch (error) {
          sendResponse({ ok: false, code: "live-steps-failed", error: String(error?.message || error) });
        }
        break;
      }

      case "T9_LIST_SESSIONS": {
        const sessions = await listSessions();

        sendResponse({
          ok: true,
          sessions: Array.isArray(sessions) ? sessions : []
        });
        break;
      }

      case "T9_GET_DOCUMENT_LIBRARY_BOOTSTRAP": {
        sendResponse({ ok: true, ...(await getDocumentLibraryBootstrap()) });
        break;
      }

      case "T9_GET_DOCUMENT_LIBRARY": {
        sendResponse({ ok: true, records: await getDocumentLibrary() });
        break;
      }

      case "T9_SAVE_DOCUMENT_FOLDERS": {
        const folders = await saveDocumentFolders(message.folders, message.records);
        sendResponse({ ok: true, folders });
        break;
      }

      case "T9_SAVE_DOCUMENT_LIBRARY": {
        const records = Array.isArray(message.records) ? message.records : [];
        const savedRecords = await saveDocumentLibrary(records);
        sendResponse({ ok: true, records: savedRecords });
        break;
      }

      case "T9_GET_SESSION_DATA": {
        const recording = await getCanonicalRecording(message.sessionId);
        const legacySession = recording
          ? globalThis.T9CanonicalRecording.legacySessionView(recording) : null;
        const configurationRevision = globalThis.T9PageIdentificationEngine
          .configurationVersion();
        let derived = recording
          ? recordingDerivedCache.get(recording, configurationRevision) : null;
        if (!derived) {
          const normalized = recording
            ? globalThis.T9EventNormalization.normalizeRecording(recording)
            : { schemaVersion: 1, recordingId: message.sessionId, events: [] };
          derived = { normalized,
            grouped: globalThis.T9EventStepGrouping.group(normalized) };
          if (recording) recordingDerivedCache.set(recording, derived,
            configurationRevision);
        }
        const { normalized, grouped } = derived;
        const mechanicsBySource = new Map();
        const groupsByNormalizedEvent = new Map();
        grouped.groups.forEach(group => group.normalizedEventIds.forEach(id =>
          groupsByNormalizedEvent.set(id, group)
        ));
        normalized.events.forEach(item => item.sourceEventIds.forEach(id =>
          mechanicsBySource.set(id, item)
        ));
        const projectedEvents = recording
          ? recording.events.map(canonicalEvent => ({
              ...globalThis.T9CanonicalRecording.legacyEventView(canonicalEvent),
              canonicalSourceEventId: canonicalEvent.id || "",
              canonicalScreenshotAssetId:
                canonicalEvent.screenshotAssetId || "",
              // Each event names its interaction and step group; both are sent once below
              // and linked again by the receiver, instead of a copy per event.
              normalizedInteractionRef: mechanicsBySource.get(
                canonicalEvent.id)?.normalizedEventId || "",
              stepGroupRef: groupsByNormalizedEvent.get(
                mechanicsBySource.get(canonicalEvent.id)
                  ?.normalizedEventId
              )?.stepGroupId || ""
            }))
          : [];
        const recordingHeader = recording
          ? { ...recording, events: [] } : null;
        const screenshotManifest = await screenshotAssetStore.manifest(
          message.sessionId);
        const screenshots = message.includeScreenshots === false ? {} :
          await getScreenshots(message.sessionId);
        sendResponse({
          ok: true,
          recordingHeader,
          session: legacySession,
          events: projectedEvents,
          normalizedEvents: normalized.events,
          stepGroups: grouped.groups,
          supportingEvents: grouped.supportingEvents,
          groupingDiagnostics: grouped.diagnostics,
          screenshotPaths: screenshotManifest.paths,
          screenshots,
          bcErrorEvidence: await getBcErrorEvidenceForRecording(message.sessionId)
        });
        break;
      }

      case "T9_GET_SCREENSHOT_ASSETS": {
        if (!await getSession(message.sessionId)) {
          throw new Error("Inspelningen kunde inte hittas.");
        }
        const requestedPaths = [...new Set((Array.isArray(message.paths)
          ? message.paths : []).filter(value => typeof value === "string"))];
        if (requestedPaths.length > 1000) {
          throw new Error("För många skärmbilder begärdes samtidigt.");
        }
        const screenshots = await getScreenshotDataForPaths(
          message.sessionId, requestedPaths);
        const available = new Set(await screenshotAssetStore
          .manifest(message.sessionId).then(result => result.paths));
        sendResponse({ ok: true, screenshots,
          missingPaths: requestedPaths.filter(path => !available.has(path)) });
        break;
      }

      case "T9_MATCH_REFERENCE_PROCESS": {
        const recording = await getCanonicalRecording(message.sessionId);
        if (!recording) throw new Error("Inspelningen kunde inte hittas.");
        const normalized = globalThis.T9EventNormalization.normalizeRecording(recording);
        const grouped = globalThis.T9EventStepGrouping.group(normalized);
        const semanticActions = globalThis.T9SemanticInteractionEngine
          .processStepGroups(grouped.groups);
        const referenceProcesses = globalThis.T9ReferenceProcessLibrary.create(
          globalThis.T9BusinessCentralReferenceProcessSeed.library
        );
        const result = globalThis.T9ReferenceDiagramDataset
          .matchRecordingToReferences(
            recording,
            globalThis.T9BusinessCentralReferenceDiagramSeed.dataset,
            {
              referenceLibrary: referenceProcesses,
              graphProjector: globalThis.T9MultiLevelProcessGraph,
              semanticActions,
              limit: 5
            }
          );
        sendResponse({ ok: true, result });
        break;
      }

      case "T9_CAPTURE_STEP_REPAIR_SCREENSHOT": {
        const result = await captureStepRepairScreenshot(message.sessionId,
          message.stepId, sender.tab?.id);
        sendResponse({ ok: true, ...result });
        break;
      }

      case "T9_SAVE_STEP_REPAIR_SCREENSHOT": {
        const result = await saveStepRepairScreenshot(message.sessionId,
          message.assetKey, message.image);
        sendResponse({ ok: true, ...result });
        break;
      }

      case "T9_DOWNLOAD_FILE": {
        const downloadId = await chrome.downloads.download({
          url: message.url,
          filename: message.filename,
          conflictAction: "uniquify"
        });
        let opened = false;
        if (message.open) {
          try {
            await chrome.downloads.open(downloadId);
            opened = true;
          } catch {
            // The draft remains downloaded when Windows has no .eml association.
          }
        }

        sendResponse({
          ok: true,
          downloadId,
          opened
        });
        break;
      }



      case "T9_GET_REVIEW": {
        const data = await chrome.storage.local.get(
          REVIEW_PREFIX + message.sessionId
        );
        // Stored with each repeated part once (engine/review-storage-format.js). A review a
        // newer version stored is refused instead of being read, and so never overwritten.
        sendResponse({
          ok: true,
          review: globalThis.T9ReviewStorageFormat.unpack(
            data[REVIEW_PREFIX + message.sessionId] || null)
        });
        break;
      }

      case "T9_SAVE_REVIEW": {
        const hadTasks = await reviewProgressStore.hasTasks(message.sessionId);
        const review = {
          ...(message.review || {}),
          sessionId: message.sessionId,
          updatedAt: new Date().toISOString()
        };
        await chrome.storage.local.set(reviewProgressStore.entries(message.sessionId, review));
        await recordDocumentUsage("process-document", message.sessionId, !hadTasks && Boolean(review.tasks?.length));
        // The page already has the review; sending it back cost as much as saving it.
        sendResponse({ ok: true, sessionId: review.sessionId, updatedAt: review.updatedAt });
        break;
      }

      case "T9_DELETE_REVIEW":
        await chrome.storage.local.remove([
          REVIEW_PREFIX + message.sessionId,
          REVIEW_PROGRESS_PREFIX + message.sessionId
        ]);
        sendResponse({ ok: true });
        break;

      case "T9_RELEASE_DOCUMENTS": {
        // A library import or undo replaced these documents' stored entries.
        const ids = Array.isArray(message.sessionIds) ? message.sessionIds.map(String) : [];
        ids.forEach(id => {
          rawEventLogStorage.release(id);
          canonicalEventLogStorage.release(id);
        });
        sendResponse({ ok: true });
        break;
      }

      case "T9_DELETE_SESSION":
        await deleteSession(message.sessionId);
        sendResponse({ ok: true });
        break;

      case "T9_GET_PROCESS_IMPROVEMENT_DATASET": {
        if (sender.url !== chrome.runtime.getURL("debug.html") ||
            !(await technicalDiagnosticsPolicyEnabled())) {
          sendResponse({ ok: false, reason: "technical-diagnostics-policy-required" });
          break;
        }
        const result = await processImprovement.read();
        sendResponse({ ok: true, ...result });
        break;
      }

      case "T9_GET_DEBUG": {
        if (sender.url !== chrome.runtime.getURL("debug.html") ||
            !(await technicalDiagnosticsPolicyEnabled())) {
          sendResponse({ ok: false, reason: "technical-diagnostics-policy-required" });
          break;
        }
        const data = await chrome.storage.local.get(DEBUG_KEY);
        const state = await getState();
        const registration = await getRecorderRegistrationStatus();
        const improvement = await processImprovement.read();
        let browserFrames = [];
        try {
          browserFrames = state.tabId
            ? await chrome.webNavigation.getAllFrames({ tabId: state.tabId })
            : [];
        } catch (error) {
          browserFrames = [{ error: String(error) }];
        }
        sendResponse({
          ok: true,
          debug: data[DEBUG_KEY] || {},
          state,
          registration,
          processImprovement: improvement,
          browserFrames: browserFrames.map(frame => frame.error ? frame : {
            frameId: frame.frameId, parentFrameId: frame.parentFrameId,
            documentId: frame.documentId || "",
            url: diagnosticUrl(frame.url),
            origin: (() => { try { return new URL(frame.url).origin; }
              catch { return ""; } })()
          })
        });
        break;
      }

      case "T9_GET_SETTINGS": {
        const data = await chrome.storage.local.get(SETTINGS_KEY);
        const storedSettings = resolveSettings(data[SETTINGS_KEY]);

        sendResponse({
          ok: true,
          settings: {
            ...DEFAULT_SETTINGS,
            ...storedSettings,
            environmentName: storedSettings.businessCentralEnvironment ||
              storedSettings.environmentName || DEFAULT_SETTINGS.environmentName,
            companyName: storedSettings.businessCentralCompany ||
              storedSettings.companyName || ""
          }
        });
        break;
      }

      case "T9_SAVE_SETTINGS": {
        const settings = { ...(await getSettings()), ...(message.settings || {}) };
        settings.uiLocale = globalThis.T9LanguageRegistry.normalize(
          settings.uiLocale, "ui");
        settings.documentLanguage = globalThis.T9LanguageRegistry.normalize(
          settings.documentLanguage, "document");
        settings.supportEmail = String(settings.supportEmail || "").trim();
        if (settings.supportEmail &&
            !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/u.test(settings.supportEmail)) {
          throw new Error("Supportadressen är inte en giltig e-postadress.");
        }
        await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
        sendResponse({ ok: true, settings });
        break;
      }

      case "T9_SAVE_DOCUMENT_LANGUAGE": {
        const settings = { ...(await getSettings()), documentLanguage:
          globalThis.T9LanguageRegistry.normalize(message.documentLanguage, "document") };
        await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
        sendResponse({ ok: true, documentLanguage: settings.documentLanguage });
        break;
      }

      case "T9_SAVE_UI_LOCALE": {
        const data = await chrome.storage.local.get(SETTINGS_KEY);
        const settings = { ...resolveSettings(data[SETTINGS_KEY]),
          uiLocale: globalThis.T9LanguageRegistry.normalize(
            message.uiLocale, "ui") };
        await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
        sendResponse({ ok: true, uiLocale: settings.uiLocale });
        break;
      }

      default:
        sendResponse({ ok: false, error: "Okänt meddelande." });
    }
  })().catch(async error => {
    await setDebug({ lastError: String(error) });
    sendResponse({ ok: false, error: error.message || String(error),
      status: error.status, code: error.code, category: error.category,
      uncertain: error.uncertain === true });
  });

  return true;
});
