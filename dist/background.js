importScripts("engine/locale-catalogs.js");
importScripts("engine/language-registry.js");
importScripts("engine/storage-keys.js");
importScripts("engine/storage-queries.js");
importScripts("engine/knowledge-mcp-client-manager.js");
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
importScripts("engine/event-normalization.js");
importScripts("engine/capture-packet-integrity.js");
importScripts("engine/observed-state.js");
importScripts("engine/event-step-grouping.js");
importScripts("engine/source-reference.js");
importScripts("document/semantic-interaction-engine.js");
importScripts("engine/task-consolidation.js");
importScripts("engine/knowledge-domain.js");
importScripts("engine/knowledge-repository.js");
importScripts("engine/knowledge-native-mcp-client.js");
importScripts("engine/knowledge-mcp-cache.js");
importScripts("engine/knowledge-mcp-adapter.js");
importScripts("engine/process-decision-code-registry.js");
importScripts("review/task-visibility.js");
importScripts("engine/process-quality-guard.js");
importScripts("engine/process-contradiction-engine.js");
importScripts("engine/process-analysis-model.js");
importScripts("engine/session-interpretation-pipeline.js");
importScripts("engine/privacy-mask.js");
importScripts("engine/recording-derived-cache.js");
importScripts("engine/screenshot-capture-policy.js");
importScripts("engine/screenshot-queue-policy.js");
importScripts("engine/screenshot-asset-paths.js");
importScripts("engine/screenshot-asset-store.js");
importScripts("engine/screenshot-target-registration.js");
importScripts("engine/recording-live-status.js");
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
importScripts("bug-report/telemetry-query-definitions.js");
importScripts("bug-report/telemetry-enrichment.js");
importScripts("bug-report/application-insights-provider.js");
importScripts("bug-report/application-insights-auth.js");
importScripts("bug-report/application-insights-transport.js");
importScripts("bug-report/bug-report-generator.js");
importScripts("bug-report/issue-package.js");
importScripts("bug-report/issue-package-markdown.js");
importScripts("document/document-library.js");
importScripts("review/process-improvement-dataset.js");
importScripts("review/knowledge-feedback-learning.js");
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
const windowsSharePorts = new Set();
const KNOWLEDGE_MCP_CACHE_KEY = "t9KnowledgeMcpLookupCacheV1";
const knowledgeMcpClientManager = globalThis.T9KnowledgeMcpClientManager.create(() =>
  globalThis.BCKnowledgeNativeMcpClient.create({
    connectNative: host => chrome.runtime.connectNative(host)
  }));
async function knowledgeMcpCacheKey(lookup) {
  const stable = value => Array.isArray(value) ? value.map(stable)
    : value && typeof value === "object"
      ? Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]))
      : value;
  const source = JSON.stringify({ cacheVersion: globalThis.T9KnowledgeMcpCache.VERSION,
    kind: lookup?.kind, request: stable(lookup?.request || {}) });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(source));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}
function isKnowledgeMcpSettingsSender(sender) {
  return sender.id === chrome.runtime.id &&
    sender.url === chrome.runtime.getURL("dashboard.html");
}
const pageKnowledgePacksReady = globalThis.BCKnowledgeRepository.load({
  indexUrl: chrome.runtime.getURL("knowledge-packs/index.json"),
  resolveUrl: file => chrome.runtime.getURL(file)
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
async function validateKnowledgeDraft(draft) {
  const { snapshot } = await pageKnowledgePacksReady;
  if (!snapshot) return { status: "unavailable", releaseId: null,
    diagnostics: [{ code: "knowledge-release-unavailable", severity: "error" }] };
  try {
  if (typeof draft?.targetPackId !== "string" ||
      !/^[a-z0-9][a-z0-9._-]*$/.test(draft.targetPackId)) {
    return { status: "blocked", releaseId: snapshot.release.releaseId,
      diagnostics: [{ code: "knowledge-target-pack-required", severity: "error" }] };
  }
  const packs = snapshot.packs.map(pack => JSON.parse(JSON.stringify(pack)));
  const target = packs.find(pack => pack.packId === draft.targetPackId);
  if (!target) return { status: "blocked", releaseId: snapshot.release.releaseId,
    diagnostics: [{ code: "knowledge-target-pack-unavailable", severity: "error" }] };
  target.rules.push(JSON.parse(JSON.stringify(draft.rule)));
  const result = globalThis.BCKnowledgeRepository.importRelease(snapshot.manifest,
    packs.map(pack => ({ packId: pack.packId, pack })));
  const diagnostics = result.diagnostics.map(item => ({ code: item.code,
    severity: item.severity, subjectRef: item.subjectRef }));
  const hasErrors = diagnostics.some(item => item.severity === "error");
  const hasWarnings = diagnostics.some(item => item.severity === "warning");
  return { status: hasErrors ? "blocked" : hasWarnings ? "warnings" : "valid",
    releaseId: snapshot.release.releaseId, diagnostics };
  } catch {
    return { status: "blocked", releaseId: snapshot.release.releaseId,
      diagnostics: [{ code: "knowledge-candidate-invalid", severity: "error" }] };
  }
}
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
  screenshotMode: "important",
  maskValues: true,
  maxEvents: 20000,
  environmentName: "ApteanAdvance",
  companyName: "",
  supportEmail: "",
  bugReportEmailMode: "eml",
  knowledgeMcpEnabled: false,
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
  EVENT_PREFIX,
  RAW_RECORDING_PREFIX,
  RECORDING_PREFIX,
  REVIEW_PREFIX,
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
const processImprovement = globalThis.T9ProcessImprovementService.create({
  storage: chrome.storage.local, reviewPrefix: REVIEW_PREFIX,
  validateDraft: validateKnowledgeDraft
});
const DEBUG_KEY = "t9_debug";
const TELEMETRY_CONFIG_KEY = "t9_application_insights_configuration";

let writeQueue = Promise.resolve();
let stoppingSessionId = null;
let errorEvidenceWrites = Promise.resolve();
const telemetryRefreshGeneration = new Map();
const tenantLicenseFailureNotifications = new Map();

const SCREENSHOT_MIN_INTERVAL_MS = 1100;
const SCREENSHOT_MAX_QUEUE_ITEMS = 40;
const CANONICAL_SETTLE_TIMEOUT_MS = 60000;
let screenshotQueue = [];
let screenshotWorkerRunning = false;
let screenshotWorkerPromise = Promise.resolve();
let lastScreenshotAt = 0;
let lastScreenshotError = null;
const preActionCaptures = new Map();

const screenshotStats = {
  requested: 0,
  captured: 0,
  reused: 0,
  dropped: 0,
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

async function setDebug(patch) {
  const data = await chrome.storage.local.get(DEBUG_KEY);
  const debug = {
    ...(data[DEBUG_KEY] || {}),
    version: VERSION,
    updatedAt: new Date().toISOString(),
    ...patch
  };
  await chrome.storage.local.set({ [DEBUG_KEY]: debug });
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
  const data = await chrome.storage.local.get(DEBUG_KEY);
  const current = data[DEBUG_KEY] || {};
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
  const captureDiagnostics = [...(current.captureDiagnostics || []), entry]
    .slice(-100);
  const captureStageCounts = { ...(current.captureStageCounts || {}) };
  captureStageCounts[entry.stage] = (captureStageCounts[entry.stage] || 0) + 1;
  await setDebug({ captureDiagnostics, captureStageCounts,
    lastCaptureDiagnostic: entry });
}

async function updateFrameDiagnostic(sender = {}, frameUrl = "", frameDepth,
  state = {}, reported = {}) {
  const data = await chrome.storage.local.get(DEBUG_KEY);
  const current = data[DEBUG_KEY] || {};
  const key = `${sender.tab?.id ?? "?"}:${sender.frameId ?? "?"}:` +
    `${sender.documentId || "unknown"}`;
  const frames = { ...(current.frameDiagnostics || {}), [key]: {
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
  } };
  const frameDiagnostics = Object.fromEntries(Object.entries(frames).slice(-100));
  await setDebug({ frameDiagnostics,
    framePermissionScope: ["https://businesscentral.dynamics.com/*",
      "https://*.businesscentral.dynamics.com/*"],
    externalFramesRequireExplicitHostPermission: true,
    connected: true,
    lastPingAt: new Date().toISOString(),
    lastFrameUrl: diagnosticUrl(frameUrl || sender.url),
    lastError: null });
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

const telemetryProvider = globalThis.T9ApplicationInsightsProvider.create({
  authenticate: globalThis.T9ApplicationInsightsAuth.authenticate,
  query: globalThis.T9ApplicationInsightsTransport.query,
  sanitizeError(error) { return globalThis.T9ApplicationInsightsAuth.scrub(error).message; }
});

async function getTelemetryConfiguration() {
  const data = await chrome.storage.local.get(TELEMETRY_CONFIG_KEY);
  return data[TELEMETRY_CONFIG_KEY] || { enabled: false, tenantId: "",
    clientId: "", applicationId: "", environmentName: "" };
}

async function saveTelemetryConfiguration(value = {}) {
  const configuration = { enabled: Boolean(value.enabled),
    tenantId: String(value.tenantId || "").trim(),
    clientId: String(value.clientId || "").trim(),
    applicationId: String(value.applicationId || "").trim(),
    environmentName: String(value.environmentName || "").trim() };
  await chrome.storage.local.set({ [TELEMETRY_CONFIG_KEY]: configuration });
  globalThis.T9ApplicationInsightsAuth.clear();
  return configuration;
}

async function technicalDiagnosticsPolicyEnabled() {
  try {
    const policy = await chrome.storage.managed.get("technicalDiagnosticsEnabled");
    return policy?.technicalDiagnosticsEnabled === true;
  } catch {
    return false;
  }
}

async function capture(tabId) {
  const captureId = crypto.randomUUID();
  let captureFrames = [0];
  try {
    const tab = await chrome.tabs.get(tabId);
    if (!tab.active) return null;

    try {
      const frames = await chrome.webNavigation.getAllFrames({ tabId });
      captureFrames = [...new Set([0, ...(frames || []).map(frame => frame.frameId)])];
    } catch {}
    await Promise.allSettled(captureFrames.map(frameId => chrome.tabs.sendMessage(tabId, {
      type: "T9_SET_INDICATOR_CAPTURE_VISIBILITY", captureId, hidden: true
    }, { frameId })));

    return await chrome.tabs.captureVisibleTab(tab.windowId, {
      format: "png"
    });
  } catch (error) {
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
  const tabs = await chrome.tabs.query({ url: [
    "https://businesscentral.dynamics.com/*",
    "https://*.businesscentral.dynamics.com/*"
  ] });
  const environment = String(session.settings?.environmentName || "").toLowerCase();
  const candidates = tabs.filter(tab => Number.isInteger(tab.id)).sort((a, b) => {
    const aContext = globalThis.T9BusinessCentralUrlContext
      .parseBusinessCentralUrl(a.url || "");
    const bContext = globalThis.T9BusinessCentralUrlContext
      .parseBusinessCentralUrl(b.url || "");
    const aMatch = String(aContext.environmentName || "").toLowerCase() === environment;
    const bMatch = String(bContext.environmentName || "").toLowerCase() === environment;
    return Number(bMatch) - Number(aMatch) ||
      Number(b.lastAccessed || 0) - Number(a.lastAccessed || 0);
  });
  const target = candidates[0];
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
      const waitMs = Math.max(
        0,
        SCREENSHOT_MIN_INTERVAL_MS - (Date.now() - lastScreenshotAt)
      );

      if (waitMs > 0) {
        await new Promise(resolve => setTimeout(resolve, waitMs));
      }

      const item = screenshotQueue.shift();

      const state = await getState();
      if (!state.recording || state.sessionId !== item.sessionId) {
        screenshotStats.dropped += 1;
        await setDebug({ screenshotQueueLength: screenshotQueue.length,
          screenshotStats: { ...screenshotStats } });
        continue;
      }

      const image = await capture(item.tabId || state.tabId);
      lastScreenshotAt = Date.now();

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
            item.sessionId, target.eventId, image, capturedAt
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

    const privacySafeEvent = globalThis.T9PrivacyMask
      .maskFieldValues(sourceEvent, settings);

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

    if (alreadyCanonical) return { recordingId, canonicalEvent, event };

    if (globalThis.T9ScreenshotCapturePolicy.shouldCapture(settings, event)) {
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
            canonicalEvent.id, preActionImage, new Date().toISOString());
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

    const { eventTypeCounts, eventCategoryCounts } =
      globalThis.T9RecordingLiveStatus.incrementEventCounts(
        debugState[DEBUG_KEY] || {}, event
      );

    await setDebug({
      connected: true,
      activeSessionId: recordingId,
      eventCount: canonical.events.length,
      eventTypeCounts,
      eventCategoryCounts,
      screenshotQueueLength: screenshotQueue.length,
      screenshotStats: { ...screenshotStats },
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
    });
    return { recordingId, canonicalEvent, event };
  });
  writeQueue = globalThis.T9RecoveringQueue.recover(operation, async error => {
    await setDebug({ lastError: String(error), recordingHealth:
      globalThis.T9RecordingLiveStatus.persistenceFailure({ rawEventPersisted,
        canonicalEventPersisted, occurredAt: new Date().toISOString() }) });
  });

  return operation;
}

const CAPTURE_GUIDANCE_KINDS = new Set([
  "important", "use-image", "new-section", "ignore"
]);

async function recordCaptureGuidance(kind, sender = {}) {
  if (!CAPTURE_GUIDANCE_KINDS.has(kind)) {
    throw new Error("Ok\u00e4nd inspelningsmarkering.");
  }
  const state = await getState();
  if (!state.recording || !state.sessionId || sender.tab?.id !== state.tabId) {
    throw new Error("Ingen aktiv inspelning hittades i den h\u00e4r fliken.");
  }
  await settleBounded(writeQueue, "accepted event writes before guidance");
  if (kind === "use-image") {
    await settleBounded(screenshotWorkerPromise,
      "screenshot registrations before image guidance");
  }
  const recording = await getCanonicalRecording(state.sessionId);
  const candidates = [...(recording.events || [])].reverse().filter(event =>
    event.raw?.type !== "capture-guidance");
  const target = candidates.find(event =>
    event.raw?.interactionId || event.interaction?.id) || candidates[0];
  if (!target) throw new Error("Registrera ett steg innan du markerar det.");
  const targetInteractionId = target.raw?.interactionId || target.interaction?.id || "";
  const preferredScreenshotAssetId = target.screenshotAssetId || "";
  if (kind === "use-image" && !preferredScreenshotAssetId) {
    throw new Error("Det finns \u00e4nnu ingen bild f\u00f6r det senaste steget.");
  }
  const recorded = await recordEvent({
    type: "capture-guidance", category: "guidance", guidanceKind: kind,
    targetSourceEventId: target.id,
    ...(targetInteractionId ? { targetInteractionId } : {}),
    ...(preferredScreenshotAssetId ? { preferredScreenshotAssetId } : {}),
    source: "recording-indicator"
  }, { tabId: sender.tab?.id, frameId: sender.frameId,
    parentFrameId: sender.parentFrameId, documentId: sender.documentId,
    origin: sender.origin || sender.url });
  return { targetSourceEventId: target.id,
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

async function captureBcErrorEvidence(input, sender) {
  const state = await getState();
  if (state.recording) await requireActiveTenantLicense(state);
  const session = state.sessionId ? await getSession(state.sessionId) : null;
  if (!state.recording || session?.recordingPurpose !== "bug-report") return null;
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
  const image = await capture(sender.tab?.id || state.tabId);
  if (image && recorded?.canonicalEvent) {
    const associatedRecording = await canonicalStore.associateScreenshot(
      state.sessionId, recorded.canonicalEvent.id, image, new Date().toISOString());
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
    updatedSession.updatedAt = new Date().toISOString();
    await saveSession(updatedSession);
  }
  return evidence;
}



const CONTENT_SCRIPT_ID = "thinknine-bc-recorder-main";
// Must match manifest.json content_scripts so dynamically injected frames get
// the same capture helpers as statically injected ones.
const CAPTURE_SCRIPT_FILES = Object.freeze([
  "engine/business-central-version-capture.js", "capture-field-privacy.js",
  "capture-focus-session.js", "capture-keyboard.js", "capture-surface-mode.js", "bc-error-detector.js",
  "capture-indicator-i18n.js", "content.js"
]);

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
  screenshotStats.errors = 0;

  const session = {
    id,
    licenseTenantId: globalThis.T9TenantLicense.tenantFromUrl(recordingTab.url),
    name: message.name || "Business Central-process",
    purpose: message.purpose || "",
    recordingPurpose: globalThis.T9CanonicalRecording
      .normalizeRecordingPurpose(message.recordingPurpose),
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

  if (session.recordingPurpose === "bug-report") {
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
    recordingPurpose: session.recordingPurpose
  });
  await setDebug(globalThis.T9RecordingLiveStatus.freshSessionDebug(id));

  try {
    await chrome.tabs.sendMessage(tabId, {
      type: "T9_STATE_CHANGED",
      recording: true,
      sessionId: id,
      recordingPurpose: session.recordingPurpose
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
    throw new Error("Recording remains incomplete because evidence writes did not settle.");
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
      throw new Error("Recording remains incomplete because evidence integrity validation failed.");
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
    recordingPurpose: null
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

async function createAndOpenBugReport(recordingId, reportTitle = "", regenerateCurrent = null) {
  const recording = await getCanonicalRecording(recordingId);
  const normalized = globalThis.T9EventNormalization.normalizeRecording(recording);
  const grouped = globalThis.T9EventStepGrouping.group(normalized);
  const legacy = globalThis.T9CanonicalRecording.legacyView(recording);
  const screenshotManifest = await screenshotAssetStore.manifest(recordingId);
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
    imagePaths: screenshots, knowledgePacks: packResult.packs || [] });
  const byCanonicalId = new Map(recording.events.map(event => [event.id, event]));
  const tasks = (interpretation.businessTasks || []).map(task => ({ ...task,
    screenshotAssetIds: [...new Set((task.sourceEventIds || []).map(id =>
      byCanonicalId.get(id)?.screenshotAssetId).filter(Boolean))] }));
  const errors = await getBcErrorEvidenceForRecording(recordingId);
  let report = globalThis.T9BugReportService.createBugReportFromRecording(
    recording, tasks, { extensionVersion: VERSION, productVersion: VERSION,
      errorEvidence: errors,
      documentLanguage: globalThis.T9LanguageRegistry.normalize(
        recording.metadata?.documentLanguage, "document"
      ),
      title: String(reportTitle || "").trim() });
  if (regenerateCurrent) {
    if (!tasks.length) throw new Error("Inga rapportsteg kunde återskapas. Befintlig rapport har inte ändrats.");
    report = globalThis.T9BugReportService.regenerate({ ...regenerateCurrent,
      evidence: { ...regenerateCurrent.evidence, screenshots: [] } }, recording, tasks, {
      extensionVersion: VERSION, productVersion: VERSION, errorEvidence: errors,
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

async function listSessions() {
  const all = await globalThis.T9StorageQueries.getByPrefixes(
    chrome.storage.local, [SESSION_PREFIX]
  );
  return Object.entries(all)
    .filter(([key]) => key.startsWith(SESSION_PREFIX))
    .map(([, value]) => value)
    .sort((a, b) => String(b.startedAt).localeCompare(String(a.startedAt)));
}

async function getDocumentLibraryBootstrap() {
  const all = await globalThis.T9StorageQueries.getByPrefixes(
    chrome.storage.local, [SESSION_PREFIX, BUG_REPORT_PREFIX, REVIEW_PREFIX],
    [globalThis.T9StorageKeys.DOCUMENT_LIBRARY_KEY]
  );
  // Only the review progress is returned; the reviews themselves stay in storage.
  const reviewProgress = Object.entries(all)
    .filter(([key, value]) => key.startsWith(REVIEW_PREFIX) && value)
    .map(([key, review]) => {
      const tasks = (Array.isArray(review.tasks) ? review.tasks : []).filter(task =>
        globalThis.T9ReviewTaskVisibility.isVisible(task, review));
      return { sessionId: key.slice(REVIEW_PREFIX.length), total: tasks.length,
        approved: tasks.filter(task => task.approved).length,
        completed: review.status === "completed" };
    });
  const sessions = Object.entries(all)
    .filter(([key]) => key.startsWith(SESSION_PREFIX))
    .map(([, value]) => value)
    .sort((a, b) => String(b.startedAt).localeCompare(String(a.startedAt)));
  const reports = Object.entries(all)
    .filter(([key]) => key.startsWith(BUG_REPORT_PREFIX))
    .map(([, value]) => globalThis.T9BugReportModel.normalize(value))
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  const records = all[globalThis.T9StorageKeys.DOCUMENT_LIBRARY_KEY];
  return { sessions, reports, reviewProgress,
    records: Array.isArray(records) ? records : [] };
}

async function getDocumentLibrary() {
  const data = await chrome.storage.local.get(
    globalThis.T9StorageKeys.DOCUMENT_LIBRARY_KEY
  );
  return Array.isArray(data[globalThis.T9StorageKeys.DOCUMENT_LIBRARY_KEY])
    ? data[globalThis.T9StorageKeys.DOCUMENT_LIBRARY_KEY]
    : [];
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

async function deleteSession(id) {
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

async function cancelActiveSession() {
  const session = await stopSession();
  if (!session) return null;
  await deleteSession(session.id);
  return session;
}

chrome.runtime.onInstalled.addListener(async () => {
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
});

chrome.runtime.onStartup.addListener(async () => {
  await setState(await getState());
  await registerRecorderContentScript();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
          promise: capture(preActionTabId) };
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
        if (sender.url !== chrome.runtime.getURL("popup.html")) {
          throw new Error("Licensregistrering måste bekräftas i tilläggets popup.");
        }
        await tenantLicense.acceptNotice();
        sendResponse({ ok: true });
        break;
      }
      case "T9_LICENSE_CHECK": {
        if (sender.url !== chrome.runtime.getURL("popup.html") &&
            !sender.url?.startsWith(chrome.runtime.getURL("license-status.html"))) {
          throw new Error("Licenskontroll får bara startas från tilläggets licensvyer.");
        }
        const tab = await chrome.tabs.get(message.tabId);
        sendResponse({ ok: true, tenantId: globalThis.T9TenantLicense.tenantFromUrl(tab.url),
          license: await tenantLicense.check(tab.url, { force: message.force === true }) });
        break;
      }
      case "T9_REQUEST_TRIAL": {
        if (sender.url !== chrome.runtime.getURL("popup.html")) {
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
            !sender.url?.startsWith(chrome.runtime.getURL("license-status.html"))) {
          throw new Error("Microsoft-inloggning får bara startas från tilläggets licensvyer.");
        }
        const account = await consultantLicense.signIn();
        sendResponse({ ok: true, profile: account.profile || {} });
        break;
      }
      case "T9_TENANT_USER_REGISTER": {
        if (sender.url !== chrome.runtime.getURL("popup.html") &&
            !sender.url?.startsWith(chrome.runtime.getURL("license-status.html"))) {
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

      case "T9_STOP": {
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

      case "T9_SAVE_BUG_REPORT":
        sendResponse({ ok: true,
          report: await bugReportStore.save(message.report) });
        break;

      case "T9_GET_TELEMETRY_CONFIGURATION":
        sendResponse({ ok: true, configuration: await getTelemetryConfiguration() });
        break;

      case "T9_SAVE_TELEMETRY_CONFIGURATION":
        sendResponse({ ok: true, configuration: await saveTelemetryConfiguration(
          message.configuration) });
        break;

      case "T9_TEST_TELEMETRY_CONNECTION":
        sendResponse({ ok: true, result: await telemetryProvider.testConnection(
          await getTelemetryConfiguration()) });
        break;

      case "T9_REFRESH_BUG_REPORT_TELEMETRY": { // Explicit user action only.
        const report = await bugReportStore.load(message.bugReportId);
        if (!report) throw new Error("Bug Report kunde inte hittas.");
        const errorId = String(message.errorEvidenceId || "");
        if (!(report.businessCentralError?.errorEvidenceIds || []).includes(errorId)) {
          throw new Error("Välj ett specifikt Business Central-fel för korrelation.");
        }
        const errorEvidence = (await getBcErrorEvidenceForRecording(
          report.recordingId)).find(item => item.errorEvidenceId === errorId);
        if (!errorEvidence) throw new Error("Felevidensen kunde inte hittas.");
        const identifiers = errorEvidence.structuredDiagnostics || {};
        const refreshKey = `${report.bugReportId}:${errorId}`;
        const generation = (telemetryRefreshGeneration.get(refreshKey) || 0) + 1;
        telemetryRefreshGeneration.set(refreshKey, generation);
        const telemetry = await telemetryProvider.queryBugContext({ errorEvidenceId: errorId,
          timestamp: identifiers.timestamp || errorEvidence.capturedAt,
          applicationInsightsSessionId: identifiers.applicationInsightsSessionId,
          clientActivityId: identifiers.clientActivityId,
          internalSessionId: identifiers.internalSessionId,
          environmentName: identifiers.environment || "" },
        await getTelemetryConfiguration(), { windowMinutes: message.windowMinutes });
        if (telemetryRefreshGeneration.get(refreshKey) !== generation) {
          sendResponse({ ok: true, ignored: true, reason: "superseded-refresh" });
          break;
        }
        const latestReport = await bugReportStore.load(message.bugReportId);
        if (!latestReport) {
          sendResponse({ ok: true, ignored: true, reason: "report-removed" });
          break;
        }
        const updated = globalThis.T9BugReportModel.attachTelemetry(latestReport, errorId,
          telemetry, new Date().toISOString());
        sendResponse({ ok: true, report: await bugReportStore.save(updated), telemetry });
        break;
      }

      case "T9_BUILD_ISSUE_PACKAGE": { // Local projection only; no transmission.
        const report = await bugReportStore.load(message.bugReportId);
        if (!report) throw new Error("Bug Report kunde inte hittas.");
        const evidence = await getBcErrorEvidenceForRecording(report.recordingId);
        const issuePackage = globalThis.T9IssuePackage.build(report,
          { errorEvidence: evidence }, { generatedAt: new Date().toISOString(),
            includeTelemetry: Boolean(message.options?.includeTelemetry),
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

      case "T9_GET_STATE": {
        const state = await getState();
        const session = state.sessionId ? await getSession(state.sessionId) : null;
        const debugData = await chrome.storage.local.get(DEBUG_KEY);
        const debug = debugData[DEBUG_KEY] || {};
        sendResponse({ ok: true, state, session,
          isRecordingTab: Boolean(state.recording &&
            sender.tab?.id === state.tabId),
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
          const guidance = await recordCaptureGuidance(message.kind, sender);
          sendResponse({ ok: true, guidance });
        } catch (error) {
          sendResponse({ ok: false, error: String(error?.message || error) });
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
              normalizedInteraction: mechanicsBySource.get(
                canonicalEvent.id
              ) || null,
              stepGroup: groupsByNormalizedEvent.get(
                mechanicsBySource.get(canonicalEvent.id)
                  ?.normalizedEventId
              ) || null
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

      case "T9_SHARE_BUG_REPORT_WINDOWS": {
        if (sender.id !== chrome.runtime.id || !sender.url?.startsWith(
          chrome.runtime.getURL("technical-report.html") + "?")) {
          throw new Error("Windows-delning får bara startas från felrapportvyn.");
        }
        const payload = message.payload;
        const legacy = payload?.action === "shareBugReport" && payload?.schemaVersion === 1;
        const pdf = payload?.action === "shareBugReportPdf" && payload?.schemaVersion === 2 &&
          typeof payload?.pdfBase64 === "string" && typeof payload?.includeTechnicalPackage === "boolean";
        if (!payload || (!legacy && !pdf) ||
            typeof payload.reportJson !== "string" || typeof payload.markdown !== "string" ||
            new TextEncoder().encode(JSON.stringify(payload)).length > 24 * 1024 * 1024) {
          throw new Error("Felrapporten är ogiltig eller för stor för Windows-delning (max 24 MB).");
        }
        const result = await new Promise((resolve, reject) => {
          const port = chrome.runtime.connectNative("com.thinknine.bcprocessstudio.share");
          windowsSharePorts.add(port);
          let replied = false;
          const timer = setTimeout(() => {
            if (!replied) {
              replied = true;
              reject(new Error("Windows-hjälparen svarade inte. Ingen rapport har skickats."));
              port.disconnect();
              windowsSharePorts.delete(port);
            }
          }, 30000);
          port.onMessage.addListener(response => {
            if (replied) return;
            replied = true;
            clearTimeout(timer);
            if (!response?.ok) {
              reject(new Error(response?.error || "Windows-delning kunde inte startas."));
              port.disconnect();
              windowsSharePorts.delete(port);
            } else resolve(response);
          });
          port.onDisconnect.addListener(() => {
            const error = chrome.runtime.lastError;
            clearTimeout(timer);
            windowsSharePorts.delete(port);
            if (!replied) reject(new Error(error
              ? "Windows-hjälparen kunde inte anslutas. Installera och registrera hjälparen för detta tillägg."
              : "Windows-hjälparen stängdes innan rapporten kunde förberedas."));
          });
          port.postMessage(payload);
        });
        sendResponse(result);
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
        sendResponse({
          ok: true,
          review: data[REVIEW_PREFIX + message.sessionId] || null
        });
        break;
      }

      case "T9_SAVE_REVIEW": {
        const existing = (await chrome.storage.local.get(REVIEW_PREFIX + message.sessionId))[REVIEW_PREFIX + message.sessionId];
        const review = {
          ...(message.review || {}),
          sessionId: message.sessionId,
          updatedAt: new Date().toISOString()
        };
        await chrome.storage.local.set({
          [REVIEW_PREFIX + message.sessionId]: review
        });
        await recordDocumentUsage("process-document", message.sessionId, !existing?.tasks?.length && Boolean(review.tasks?.length));
        sendResponse({ ok: true, review });
        break;
      }

      case "T9_DELETE_REVIEW":
        await chrome.storage.local.remove(
          REVIEW_PREFIX + message.sessionId
        );
        sendResponse({ ok: true });
        break;

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

      case "T9_GET_KNOWLEDGE_ADMIN_ACCESS": {
        if (sender.url !== chrome.runtime.getURL("popup.html")) {
          sendResponse({ ok: false, reason: "invalid-admin-access-check-origin" });
          break;
        }
        const authorized = await consultantLicense.hasApplicationAdminRole();
        sendResponse({ ok: true, authorized });
        break;
      }

      case "T9_GET_KNOWLEDGE_ADMIN_DATA": {
        if (sender.url !== chrome.runtime.getURL("knowledge-admin.html") ||
            !(await consultantLicense.hasApplicationAdminRole())) {
          sendResponse({ ok: false, reason: "application-admin-role-required" });
          break;
        }
        const knowledgeReady = await pageKnowledgePacksReady;
        const result = await processImprovement.read({ includeKnowledgeFeedback: true,
          knowledgePacks: knowledgeReady.packs });
        sendResponse({ ok: true, ...result });
        break;
      }

      case "T9_CREATE_KNOWLEDGE_RULE_DRAFT": {
        if (sender.url !== chrome.runtime.getURL("knowledge-admin.html") ||
            !(await consultantLicense.hasApplicationAdminRole())) {
          sendResponse({ ok: false, reason: "application-admin-role-required" });
          break;
        }
        const result = await processImprovement.createDraft(message.proposalId,
          message.targetPackId);
        sendResponse(result);
        break;
      }

      case "T9_SET_KNOWLEDGE_DRAFT_TARGET": {
        if (sender.url !== chrome.runtime.getURL("knowledge-admin.html") ||
            !(await consultantLicense.hasApplicationAdminRole())) {
          sendResponse({ ok: false, reason: "application-admin-role-required" });
          break;
        }
        const result = await processImprovement.setDraftTarget(message.draftId,
          message.targetPackId);
        sendResponse(result);
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

      case "T9_TEST_KNOWLEDGE_MCP_CONNECTION": {
        if (!isKnowledgeMcpSettingsSender(sender)) {
          sendResponse({ ok: false, reason: "dashboard-only" });
          break;
        }
        if (!(await getSettings()).knowledgeMcpEnabled) {
          sendResponse({ ok: false, reason: "knowledge-mcp-consent-required" });
          break;
        }
        let knowledgeMcpLease = null;
        try {
          knowledgeMcpLease = knowledgeMcpClientManager.acquire();
          const tools = await knowledgeMcpLease.client.listTools();
          sendResponse({ ok: true, toolCount: tools.length });
        } catch (error) {
          const detail = String(error?.message || error || "").replace(/[\u0000-\u001f]+/gu, " ").trim().slice(0, 240);
          sendResponse({ ok: false, reason: "knowledge-mcp-unavailable",
            ...(detail ? { detail } : {}) });
        } finally {
          knowledgeMcpLease?.release();
        }
        break;
      }

      case "T9_TEST_KNOWLEDGE_MCP_SAMPLE_LOOKUP": {
        if (!isKnowledgeMcpSettingsSender(sender)) {
          sendResponse({ ok: false, reason: "dashboard-only" });
          break;
        }
        const settings = await getSettings();
        if (!settings.knowledgeMcpEnabled) {
          sendResponse({ ok: false, reason: "knowledge-mcp-consent-required" });
          break;
        }
        let knowledgeMcpLease = null;
        try {
          knowledgeMcpLease = knowledgeMcpClientManager.acquire();
          const response = await knowledgeMcpLease.client.callTool({
            name: globalThis.BCKnowledgeMcpAdapter.TOOL_OBJECT,
            arguments: { objectType: "page", objectId: "22",
              productFamily: "business-central",
              ...(settings.uiLocale ? { locale: settings.uiLocale } : {}) }
          });
          const result = globalThis.BCKnowledgeMcpAdapter.parseToolResult("object", response);
          sendResponse({ ok: true, result });
        } catch (error) {
          const detail = String(error?.message || error || "").replace(/[\u0000-\u001f]+/gu, " ").trim().slice(0, 240);
          sendResponse({ ok: false, reason: "knowledge-mcp-unavailable",
            ...(detail ? { detail } : {}) });
        } finally {
          knowledgeMcpLease?.release();
        }
        break;
      }
      case "T9_LOOKUP_KNOWLEDGE_MCP_BATCH": {
        if (!isKnowledgeMcpSettingsSender(sender)) {
          sendResponse({ ok: false, reason: "dashboard-only" });
          break;
        }
        const settings = await getSettings();
        if (!settings.knowledgeMcpEnabled) {
          sendResponse({ ok: false, reason: "knowledge-mcp-consent-required" });
          break;
        }
        const repositoryState = await pageKnowledgePacksReady;
        if (!repositoryState.repository) {
          sendResponse({ ok: false, reason: "knowledge-repository-unavailable" });
          break;
        }
        const lookups = Array.isArray(message.lookups) ? message.lookups.slice(0, 12) : [];
        const results = new Array(lookups.length);
        const cacheUpdates = [];
        let knowledgeMcpLease = null;
        let cacheHitCount = 0;
        try {
          const cacheData = await chrome.storage.local.get(KNOWLEDGE_MCP_CACHE_KEY);
          const cache = cacheData[KNOWLEDGE_MCP_CACHE_KEY] || {};
          const misses = [];
          for (const [index, lookup] of lookups.entries()) {
            const cacheKey = await knowledgeMcpCacheKey(lookup);
            const cached = globalThis.T9KnowledgeMcpCache.read(cache, cacheKey);
            const resultKey = typeof lookup?.key === "string"
              ? lookup.key.slice(0, 160) : "lookup-" + index;
            if (cached) {
              results[index] = { key: resultKey, kind: lookup?.kind,
                result: cached, fromCache: true };
              cacheHitCount++;
            } else misses.push({ lookup, index, cacheKey, resultKey });
          }
          if (misses.length) {
            knowledgeMcpLease = knowledgeMcpClientManager.acquire();
            const adapter = globalThis.BCKnowledgeMcpAdapter.createMcpKnowledgeAdapter({
              client: knowledgeMcpLease.client, repository: repositoryState.repository, consent: true
            });
            const resolveLookup = async item => {
              const { lookup, cacheKey, resultKey } = item;
              const kind = lookup?.kind;
              const request = lookup?.request || {};
              const result = kind === "object" ? await adapter.resolveObject(request)
                : kind === "action" ? await adapter.resolveAction(request)
                  : { status: "unresolved", candidates: [], reason: "invalid-lookup-kind" };
              if (result?.status === "suggested" && result?.source === "mcp-unverified" &&
                  result?.requiresReview === true) cacheUpdates.push({ key: cacheKey, result });
              else if (globalThis.T9KnowledgeMcpCache.isTransientFailure(result)) {
                cacheUpdates.push({ key: cacheKey, result,
                  ttlMs: globalThis.T9KnowledgeMcpCache.TRANSIENT_FAILURE_TTL_MS });
              }
              return { key: resultKey, kind, result, fromCache: false };
            };
            // Native MCP requests are bounded by the client timeout. Resolve a
            // small batch concurrently instead of serially blocking for N×12s.
            for (let offset = 0; offset < misses.length; offset += 4) {
              const batch = misses.slice(offset, offset + 4);
              const resolved = await Promise.all(batch.map(resolveLookup));
              batch.forEach((item, index) => { results[item.index] = resolved[index]; });
            }
            if (cacheUpdates.length) {
              const nextCache = globalThis.T9KnowledgeMcpCache.write(cache, cacheUpdates);
              await chrome.storage.local.set({ [KNOWLEDGE_MCP_CACHE_KEY]: nextCache });
            }
          }
          sendResponse({ ok: true, results,
            fromCache: results.length > 0 && results.every(item => item?.fromCache === true),
            cacheHitCount, cacheMissCount: misses.length,
            failureCount: results.filter(item => item?.result?.status === "unresolved").length,
            cacheTtlDays: 30 });
        } catch (error) {
          const detail = String(error?.message || error || "").replace(/[\u0000-\u001f]+/gu, " ").trim().slice(0, 240);
          sendResponse({ ok: false, reason: "knowledge-mcp-unavailable",
            ...(detail ? { detail } : {}) });
        } finally {
          knowledgeMcpLease?.release();
        }
        break;
      }
      case "T9_LOOKUP_KNOWLEDGE_MCP": {
        if (!isKnowledgeMcpSettingsSender(sender)) {
          sendResponse({ ok: false, reason: "dashboard-only" });
          break;
        }
        if (!(await getSettings()).knowledgeMcpEnabled) {
          sendResponse({ ok: false, reason: "knowledge-mcp-consent-required" });
          break;
        }
        const repositoryState = await pageKnowledgePacksReady;
        if (!repositoryState.repository) {
          sendResponse({ ok: false, reason: "knowledge-repository-unavailable" });
          break;
        }
        let knowledgeMcpLease = null;
        try {
          knowledgeMcpLease = knowledgeMcpClientManager.acquire();
          const adapter = globalThis.BCKnowledgeMcpAdapter.createMcpKnowledgeAdapter({
            client: knowledgeMcpLease.client, repository: repositoryState.repository,
            consent: true
          });
          const request = message.request || {};
          const result = message.kind === "object"
            ? await adapter.resolveObject(request)
            : message.kind === "action"
              ? await adapter.resolveAction(request)
              : { status: "unresolved", candidates: [], reason: "invalid-lookup-kind" };
          sendResponse({ ok: true, result });
        } catch (error) {
          const detail = String(error?.message || error || "").replace(/[\u0000-\u001f]+/gu, " ").trim().slice(0, 240);
          sendResponse({ ok: false, reason: "knowledge-mcp-unavailable",
            ...(detail ? { detail } : {}) });
        } finally {
          knowledgeMcpLease?.release();
        }
        break;
      }

      case "T9_SAVE_SETTINGS": {
        const settings = { ...(await getSettings()), ...(message.settings || {}) };
        settings.knowledgeMcpEnabled = settings.knowledgeMcpEnabled === true;
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
