importScripts("engine/language-registry.js");
importScripts("engine/storage-keys.js");
importScripts("engine/business-central-url-context.js");
importScripts("engine/page-identity.js");
importScripts("engine/page-identification-engine.js");
importScripts("engine/process-taxonomy-schema.js");
importScripts("engine/canonical-semantic-model.js");
importScripts("engine/canonical-recording.js");
importScripts("engine/business-central-process-taxonomy-seed.js");
importScripts("engine/business-central-document-lifecycle-seed.js");
importScripts("engine/document-lifecycle.js");
importScripts("engine/bc-process-recognition-engine.js");
importScripts("engine/business-central-reference-process-seed.js");
importScripts("engine/reference-process-library.js");
importScripts("document/process-graph.js");
importScripts("document/multi-level-process-graph.js");
importScripts("engine/raw-event-persistence.js");
importScripts("engine/bc-ui-identification.js");
importScripts("engine/event-normalization.js");
importScripts("engine/capture-packet-integrity.js");
importScripts("engine/observed-state.js");
importScripts("engine/event-step-grouping.js");
importScripts("engine/source-reference.js");
importScripts("document/semantic-interaction-engine.js");
importScripts("engine/task-consolidation.js");
importScripts("engine/knowledge-domain.js");
importScripts("engine/session-interpretation-pipeline.js");
importScripts("engine/privacy-mask.js");
importScripts("engine/screenshot-capture-policy.js");
importScripts("engine/recording-live-status.js");
importScripts("bug-report/bc-diagnostic-evidence.js");
importScripts("bug-report/al-call-stack-parser.js");
importScripts("bug-report/technical-diagnostics.js");
importScripts("bug-report/bug-report-model.js");
importScripts("bug-report/bug-report-service.js");
importScripts("bug-report/bug-report-store.js");
importScripts("bug-report/telemetry-query-definitions.js");
importScripts("bug-report/telemetry-enrichment.js");
importScripts("bug-report/application-insights-provider.js");
importScripts("bug-report/application-insights-auth.js");
importScripts("bug-report/application-insights-transport.js");
importScripts("bug-report/ai-evidence-policy.js");
importScripts("bug-report/ai-analysis-input.js");
importScripts("bug-report/ai-analysis-model.js");
importScripts("bug-report/ai-analysis-prompt.js");
importScripts("bug-report/technical-analysis-provider.js");
importScripts("bug-report/ai-broker-auth.js");
importScripts("bug-report/ai-broker-transport.js");
importScripts("bug-report/issue-package.js");
importScripts("bug-report/issue-package-markdown.js");
importScripts("bug-report/issue-submission-service.js");
importScripts("bug-report/external-issue-auth.js");
importScripts("bug-report/azure-devops-adapter.js");
importScripts("bug-report/github-issue-adapter.js");
importScripts("document/document-library.js");

const VERSION = "__APP_VERSION__";
const pageKnowledgePacksReady = globalThis.T9PageIdentificationEngine
  .loadKnowledgePacks({
    indexUrl: chrome.runtime.getURL("knowledge-packs/index.json"),
    resolveUrl: file => chrome.runtime.getURL(file)
  }).catch(error => {
    console.warn("Page identification Knowledge Packs could not be loaded.", error);
    return { packs: [], validation: { diagnostics: [{
      code: "page-knowledge-pack-load-failed", message: String(error)
    }] } };
  });

const DEFAULT_SETTINGS = {
  uiLocale: "sv-SE",
  documentLanguage: "sv-SE",
  exportFileNamePattern: "{process} - {environment} - {date}",
  documentationProfile: "generic",
  defaultExpectedResult:
    "Processen är genomförd enligt arbetsgången och de registrerade " +
    "ändringarna har sparats i Business Central.",
  captureScreenshots: true,
  screenshotMode: "important",
  maskValues: true,
  maxEvents: 20000,
  environmentName: "ApteanAdvance",
  companyName: "",
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

const STATE_KEY = "t9_state";
const SETTINGS_KEY = "t9_settings";
const {
  BC_ERROR_EVIDENCE_PREFIX,
  BUG_REPORT_PREFIX,
  EVENT_PREFIX,
  RAW_RECORDING_PREFIX,
  RECORDING_PREFIX,
  REVIEW_PREFIX,
  SCREENSHOT_PREFIX,
  SESSION_PREFIX
} = globalThis.T9StorageKeys;
const DEBUG_KEY = "t9_debug";
const TELEMETRY_CONFIG_KEY = "t9_application_insights_configuration";
const AI_CONFIG_KEY = "t9_ai_analysis_configuration";
const ISSUE_CONFIG_KEY = "t9_external_issue_configuration";

let writeQueue = Promise.resolve();
let stoppingSessionId = null;
let canonicalPersistenceError = null;
let errorEvidenceWrites = Promise.resolve();
const telemetryRefreshGeneration = new Map();
const aiAnalysisGeneration = new Map();
const issueSubmissionGeneration = new Map();

const SCREENSHOT_MIN_INTERVAL_MS = 1100;
const CANONICAL_SETTLE_TIMEOUT_MS = 60000;
let screenshotQueue = [];
let screenshotWorkerRunning = false;
let screenshotWorkerPromise = Promise.resolve();
let lastScreenshotAt = 0;
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
  return { ...DEFAULT_SETTINGS, ...(data[SETTINGS_KEY] || {}) };
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
  const key = SCREENSHOT_PREFIX + id;
  const data = await chrome.storage.local.get(key);
  return data[key] || {};
}

async function saveScreenshots(id, screenshots) {
  await chrome.storage.local.set({
    [SCREENSHOT_PREFIX + id]: screenshots
  });
}

async function getCanonicalRecording(id) {
  const key = RECORDING_PREFIX + id;
  const data = await chrome.storage.local.get(key);
  if (data[key]) return globalThis.T9CanonicalRecording.normalize(data[key]);
  const session = await getSession(id);
  if (!session) return null;
  return globalThis.T9CanonicalRecording.fromLegacy(session, await getEvents(id), await getScreenshots(id));
}

async function saveCanonicalRecording(recording) {
  await chrome.storage.local.set({ [RECORDING_PREFIX + recording.id]: recording });
}

async function getRawRecording(id) {
  const key = RAW_RECORDING_PREFIX + id;
  const data = await chrome.storage.local.get(key);
  return data[key] || null;
}

async function saveRawRecording(recording) {
  await chrome.storage.local.set({
    [RAW_RECORDING_PREFIX + recording.recordingId]: recording
  });
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
  async set(key, value) { await chrome.storage.local.set({ [key]: value }); },
  async remove(key) { await chrome.storage.local.remove(key); },
  async all() { return chrome.storage.local.get(null); }
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

async function getAiConfiguration() {
  const data = await chrome.storage.local.get(AI_CONFIG_KEY);
  return data[AI_CONFIG_KEY] || { enabled: false, tenantId: "", clientId: "",
    scope: "", brokerUrl: "", model: "", maxInputTokens: 12000 };
}

async function saveAiConfiguration(value = {}) {
  const configuration = { enabled: Boolean(value.enabled),
    tenantId: String(value.tenantId || "").trim(),
    clientId: String(value.clientId || "").trim(), scope: String(value.scope || "").trim(),
    brokerUrl: String(value.brokerUrl || "").trim(), model: String(value.model || "").trim(),
    maxInputTokens: Math.min(20000, Math.max(2000,
      Number(value.maxInputTokens || 12000))) };
  await chrome.storage.local.set({ [AI_CONFIG_KEY]: configuration });
  globalThis.T9AiBrokerAuth.clear(); return configuration;
}

function createAiProvider(configuration) {
  return globalThis.T9TechnicalAnalysisProvider.create({ async invoke(request) {
    const token = await globalThis.T9AiBrokerAuth.authenticate(configuration);
    return globalThis.T9AiBrokerTransport.invoke(configuration, token, request);
  } });
}

async function getIssueConfiguration() {
  const data = await chrome.storage.local.get(ISSUE_CONFIG_KEY);
  return data[ISSUE_CONFIG_KEY] || { defaultProvider: "",
    azureDevOps: { enabled: false }, github: { enabled: false } };
}

async function saveIssueConfiguration(value = {}) {
  const azure = value.azureDevOps || {}; const github = value.github || {};
  const configuration = { defaultProvider: ["azure-devops", "github"].includes(
    value.defaultProvider) ? value.defaultProvider : "",
  azureDevOps: { enabled: Boolean(azure.enabled),
    organization: String(azure.organization || "").trim(),
    project: String(azure.project || "").trim(),
    workItemType: String(azure.workItemType || "Bug").trim(),
    areaPath: String(azure.areaPath || "").trim(),
    iterationPath: String(azure.iterationPath || "").trim(),
    descriptionField: String(azure.descriptionField || "System.Description").trim(),
    severityField: String(azure.severityField || "").trim(),
    tags: (azure.tags || []).map(String).map(item => item.trim()).filter(Boolean),
    tenantId: String(azure.tenantId || "").trim(),
    clientId: String(azure.clientId || "").trim(),
    scope: String(azure.scope || "499b84ac-1321-427f-aa17-267ca6975798/.default").trim() },
  github: { enabled: Boolean(github.enabled),
    repository: String(github.repository || "").trim(),
    labels: (github.labels || []).map(String).map(item => item.trim()).filter(Boolean),
    brokerUrl: String(github.brokerUrl || "").trim(),
    tenantId: String(github.tenantId || "").trim(),
    clientId: String(github.clientId || "").trim(), scope: String(github.scope || "").trim() } };
  await chrome.storage.local.set({ [ISSUE_CONFIG_KEY]: configuration });
  globalThis.T9ExternalIssueAuth.clear(); return configuration;
}

async function azureRequest(configuration, token, path, options = {}) {
  const url = `https://dev.azure.com/${encodeURIComponent(configuration.organization)}/${
    encodeURIComponent(configuration.project)}/${path}`;
  const response = await fetch(url, { ...options, headers: { ...(options.headers || {}),
    Authorization: `Bearer ${token}` } });
  if (!response.ok) throw Object.assign(new Error(
    `Azure DevOps returned HTTP ${response.status}.`), { status: response.status });
  return response.status === 204 ? {} : response.json();
}

function dataUrlBytes(value) {
  const match = /^data:([^;,]+)?(?:;base64)?,(.*)$/u.exec(String(value || ""));
  if (!match) throw Object.assign(new Error("Screenshot asset is unavailable."),
    { category: "attachment-failed" });
  const binary = atob(match[2]); const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function createAzureProvider(configuration, recordingId) {
  return globalThis.T9AzureDevOpsAdapter.create({ async invoke(operation, request) {
    const token = await globalThis.T9ExternalIssueAuth.authenticate(configuration,
      "azure-devops-issues");
    if (operation === "test") { await azureRequest(configuration, token,
      "_apis/wit/workitemtypes?api-version=7.1");
      return { status: "connected", destination: `${configuration.organization}/${
        configuration.project}` }; }
    const item = await azureRequest(configuration, token,
      `_apis/wit/workitems/$${encodeURIComponent(configuration.workItemType)}?api-version=7.1`,
      { method: "POST", headers: { "Content-Type": "application/json-patch+json" },
        body: JSON.stringify(request.fields) });
    const screenshotValues = await getScreenshots(recordingId); const recording =
      await getCanonicalRecording(recordingId); const attachmentFailures = [];
    for (const attachment of request.attachments || []) {
      try { const event = recording?.events?.find(value =>
        value.screenshotAssetId === attachment.assetId);
        const source = event ? screenshotValues[event.raw?.eventNo] : null;
        const uploaded = await azureRequest(configuration, token,
          `_apis/wit/attachments?fileName=${encodeURIComponent(attachment.fileName)}&api-version=7.1`,
          { method: "POST", headers: { "Content-Type": attachment.mediaType },
            body: dataUrlBytes(source) });
        await azureRequest(configuration, token,
          `_apis/wit/workitems/${item.id}?api-version=7.1`, { method: "PATCH",
            headers: { "Content-Type": "application/json-patch+json" },
            body: JSON.stringify([{ op: "add", path: "/relations/-", value: {
              rel: "AttachedFile", url: uploaded.url,
              attributes: { comment: attachment.role } } }]) });
      } catch (error) { attachmentFailures.push({ attachmentId: attachment.attachmentId,
        category: error.category || "attachment-failed", message: String(error.message).slice(0, 200) }); }
    }
    return { destination: `${configuration.organization}/${configuration.project}`,
      externalId: item.id, url: item._links?.html?.href || item.url,
      createdAt: new Date().toISOString(), attachmentFailures };
  } });
}

function createGitHubProvider(configuration) {
  return globalThis.T9GitHubIssueAdapter.create({ async invoke(operation, request) {
    const token = await globalThis.T9ExternalIssueAuth.authenticate(configuration,
      "github-issues-broker");
    const base = new URL(configuration.brokerUrl); base.pathname = `${base.pathname.replace(/\/$/u,
      "")}/external-issues/github/${operation}`;
    const response = await fetch(base, { method: "POST", headers: {
      Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(request) });
    if (!response.ok) throw Object.assign(new Error(
      `GitHub App broker returned HTTP ${response.status}.`), { status: response.status,
      uncertain: operation === "create" && response.status >= 500 });
    return response.json();
  } });
}

async function capture(tabId) {
  let indicatorHidden = false;
  try {
    const tab = await chrome.tabs.get(tabId);
    if (!tab.active) return null;

    try {
      await chrome.tabs.sendMessage(tabId, {
        type: "T9_SET_INDICATOR_CAPTURE_VISIBILITY", hidden: true
      }, { frameId: 0 });
      indicatorHidden = true;
    } catch {}

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
    if (indicatorHidden) {
      try {
        await chrome.tabs.sendMessage(tabId, {
          type: "T9_SET_INDICATOR_CAPTURE_VISIBILITY", hidden: false
        }, { frameId: 0 });
      } catch {}
    }
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
  const screenshots = await getScreenshots(recordingId);
  screenshots[assetKey] = image;
  await saveScreenshots(recordingId, screenshots);
  return { assetId: `screenshots/${assetKey}.png` };
}

function screenshotPriority(category) {
  if (category === "dialog") return 3;
  if (category === "field-input") return 2;
  if (category === "action") return 2;
  if (category === "navigation") return 1;
  return 0;
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

  const existing = screenshotQueue.find(item =>
    item.sessionId === sessionId &&
    Math.abs(item.eventNo - eventNo) <= 2 &&
    globalThis.T9ScreenshotCapturePolicy.canReuse(item, {
      category, captureKey
    })
  );

  if (existing) {
    existing.targets ||= [{ eventNo: existing.eventNo,
      eventId: existing.eventId }];
    if (!existing.targets.some(target => target.eventNo === eventNo)) {
      existing.targets.push({ eventNo, eventId });
    }
    if (screenshotPriority(category) > screenshotPriority(existing.category)) {
      existing.category = category;
      existing.eventNo = eventNo;
      existing.eventId = eventId;
      existing.tabId = tabId;
    }
    screenshotStats.reused += 1;
    await setDebug({
      screenshotQueueLength: screenshotQueue.length,
      screenshotStats: { ...screenshotStats }
    });
    return;
  }

  screenshotQueue.push({
    sessionId,
    eventNo,
    eventId,
    tabId,
    category,
    captureKey,
    targets: [{ eventNo, eventId }],
    queuedAt: Date.now()
  });

  screenshotQueue.sort((a, b) =>
    screenshotPriority(b.category) - screenshotPriority(a.category) ||
    a.queuedAt - b.queuedAt
  );

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
        continue;
      }

      const image = await capture(item.tabId || state.tabId);
      lastScreenshotAt = Date.now();

      if (!image) {
        screenshotStats.dropped += 1;
        continue;
      }

      const screenshots = await getScreenshots(item.sessionId);

      // One stable capture may represent nearby events, but every event must retain
      // an addressable screenshot so the complete recording is available in Review.
      const targets = item.targets?.length ? item.targets :
        [{ eventNo: item.eventNo, eventId: item.eventId }];
      const capturedAt = new Date().toISOString();
      for (const target of targets) {
        screenshots[target.eventNo] = image;
        await canonicalStore.associateScreenshot(
          item.sessionId, target.eventId, image, capturedAt
        );
      }
      await saveScreenshots(item.sessionId, screenshots);

      screenshotStats.captured += 1;

      await setDebug({
        screenshotQueueLength: screenshotQueue.length,
        screenshotStats: { ...screenshotStats },
        lastScreenshotAt: new Date().toISOString(),
        lastScreenshotError: null
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

    if ("value" in sourceEvent) {
      sourceEvent.value = globalThis.T9PrivacyMask.mask(
        sourceEvent.fieldName, sourceEvent.value, settings
      );
    }

    const rawResult = await rawEventStore.appendRawEvent(
      recordingId, sourceEvent, { maxEvents: settings.maxEvents }
    );
    if (rawResult.status === "truncated") {
      await setDebug({ lastError: "Maximalt antal händelser har uppnåtts.",
        recordingHealth: { status: "truncated",
          diagnostic: rawResult.diagnostic } });
      return;
    }
    const debugState = await chrome.storage.local.get(DEBUG_KEY);
    if (debugState[DEBUG_KEY]?.captureDiagnosticsEnabled) {
      await appendCaptureDiagnostic({ stage: "raw-event-persisted",
        eventType: rawResult.event.type, accepted: true, sourceEventId },
      captureContext);
    }

    const canonicalBefore = await getCanonicalRecording(recordingId);
    const alreadyCanonical = canonicalBefore.events.some(item =>
      item.source?.eventId === sourceEventId
    );
    const event = { ...rawResult.event,
      eventNo: canonicalBefore.events.length + 1 };

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
    if (debugState[DEBUG_KEY]?.captureDiagnosticsEnabled) {
      await appendCaptureDiagnostic({ stage: "canonical-event-appended",
        eventType: event.type, accepted: true, sourceEventId }, captureContext);
    }
    const events = canonical.events.map(item => item.raw);
    await saveEvents(recordingId, events);

    session.eventCount = events.length;
    session.updatedAt = event.timestamp;
    await saveSession(session);

    if (alreadyCanonical) return { recordingId, canonicalEvent, event };

    if (globalThis.T9ScreenshotCapturePolicy.shouldCapture(settings, event)) {
      const captureCategory = globalThis.T9ScreenshotCapturePolicy.category(event);
      const preActionImage = await consumePreActionCapture(event,
        captureContext, recordingId);
      if (preActionImage) {
        const screenshots = await getScreenshots(recordingId);
        screenshots[event.eventNo] = preActionImage;
        await canonicalStore.associateScreenshot(recordingId,
          canonicalEvent.id, preActionImage, new Date().toISOString());
        await saveScreenshots(recordingId, screenshots);
        lastScreenshotAt = Date.now();
        screenshotStats.captured += 1;
      } else {
        await enqueueScreenshot({
          sessionId: recordingId,
          eventNo: event.eventNo,
          eventId: canonicalEvent.id,
          tabId: captureContext.tabId || acceptedState.tabId,
          category: captureCategory,
          captureKey: event.fieldName || ""
        });
      }
    }

    const eventTypeCounts = {};
    const eventCategoryCounts = {};

    for (const savedEvent of events) {
      eventTypeCounts[savedEvent.type] =
        (eventTypeCounts[savedEvent.type] || 0) + 1;
      eventCategoryCounts[savedEvent.category] =
        (eventCategoryCounts[savedEvent.category] || 0) + 1;
    }

    await setDebug({
      connected: true,
      activeSessionId: recordingId,
      eventCount: events.length,
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
  writeQueue = operation.catch(async error => {
    canonicalPersistenceError ||= error;
    await setDebug({ lastError: String(error) });
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
  await chrome.storage.local.set({
    [BC_ERROR_EVIDENCE_PREFIX + normalized.errorEvidenceId]: normalized
  });
  return normalized;
}

async function getBcErrorEvidenceForRecording(recordingId) {
  const all = await chrome.storage.local.get(null);
  return Object.entries(all).filter(([key, value]) =>
    key.startsWith(BC_ERROR_EVIDENCE_PREFIX) && value?.recordingId === recordingId)
    .map(([, value]) => globalThis.T9BcDiagnosticEvidence.normalize(value))
    .sort((a, b) => String(a.capturedAt).localeCompare(String(b.capturedAt)));
}

async function captureBcErrorEvidence(input, sender) {
  const state = await getState();
  const session = state.sessionId ? await getSession(state.sessionId) : null;
  if (!state.recording || session?.recordingPurpose !== "bug-report") return null;
  const recording = await getCanonicalRecording(state.sessionId);
  const preceding = [...recording.events].reverse().find(item =>
    !["focus", "page-state", "dialog-open", "bc-error"].includes(item.raw?.type));
  let evidence = await saveBcErrorEvidence({ ...input,
    recordingId: state.sessionId,
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
    const screenshots = await getScreenshots(state.sessionId);
    screenshots[recorded.event.eventNo] = image;
    await saveScreenshots(state.sessionId, screenshots);
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
      js: ["capture-focus-session.js", "capture-surface-mode.js",
        "bc-error-detector.js", "content.js"],
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
        files: ["capture-focus-session.js", "capture-surface-mode.js",
          "bc-error-detector.js", "content.js"],
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
      files: ["capture-focus-session.js", "capture-surface-mode.js",
        "bc-error-detector.js", "content.js"]
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

async function startSession(message, tabId) {
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
    companyName: urlContext.companyName || contentContext.companyName || ""
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
  const now = new Date().toISOString();

  screenshotQueue = [];
  stoppingSessionId = null;
  canonicalPersistenceError = null;
  lastScreenshotAt = 0;
  screenshotStats.requested = 0;
  screenshotStats.captured = 0;
  screenshotStats.reused = 0;
  screenshotStats.dropped = 0;
  screenshotStats.errors = 0;

  const session = {
    id,
    name: message.name || "Business Central-process",
    purpose: message.purpose || "",
    recordingPurpose: globalThis.T9CanonicalRecording
      .normalizeRecordingPurpose(message.recordingPurpose),
    startedAt: now,
    completedAt: null,
    updatedAt: now,
    status: "recording",
    eventCount: 0,
    version: VERSION,
    settings
  };

  await saveSession(session);
  await saveEvents(id, []);
  await saveScreenshots(id, {});
  await rawEventStore.create(id, now);
  await canonicalStore.create(globalThis.T9CanonicalRecording.create({
    id, startedAt: now, legacySession: session
  }));
  await setState({
    recording: true,
    sessionId: id,
    tabId,
    startedAt: now,
    recordingPurpose: session.recordingPurpose
  });
  await setDebug({
    activeSessionId: id,
    eventCount: 0,
    lastEvent: null,
    lastError: null
  });

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
  if (canonicalPersistenceError) {
    await setDebug({ lastError: String(canonicalPersistenceError),
      canonicalIntegrityDiagnostic: { code: "canonical-write-failure",
        operation: "accepted-event-write" } });
    throw new Error(
      "Recording remains incomplete because canonical evidence could not be persisted."
    );
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
    const legacyEvents = await getEvents(state.sessionId);
    const canonicalRecording = await getCanonicalRecording(state.sessionId);
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
  stoppingSessionId = null;

  return session;
}

function draftBugTitle(tasks, errors) {
  const finalTask = [...(tasks || [])].reverse().find(item =>
    String(item.instruction || "").trim());
  const action = String(finalTask?.actionCaption || "").trim();
  const field = String(finalTask?.fieldCaption || "").trim();
  const page = String(finalTask?.pageCaption || "").trim();
  if (errors.length && action) return `Error when selecting "${action}"`;
  if (errors.length && field) return `Validation error in "${field}"`;
  if (errors.length && page) return `Business Central error in "${page}"`;
  return errors.length ? "Business Central error during recorded process" :
    "Reported Business Central problem";
}

async function createAndOpenBugReport(recordingId, reportTitle = "") {
  const recording = await getCanonicalRecording(recordingId);
  const normalized = globalThis.T9EventNormalization.normalizeRecording(recording);
  const grouped = globalThis.T9EventStepGrouping.group(normalized);
  const legacy = globalThis.T9CanonicalRecording.legacyView(recording);
  const screenshots = await getScreenshots(recordingId);
  const projectedEvents = legacy.events.map((event, index) => ({ ...event,
    canonicalSourceEventId: recording.events[index]?.id || "",
    canonicalScreenshotAssetId: recording.events[index]?.screenshotAssetId || "" }));
  const packResult = await pageKnowledgePacksReady;
  const interpretation = globalThis.T9SessionInterpretationPipeline.interpret({
    session: legacy.session, events: projectedEvents,
    normalizedEvents: normalized.events, stepGroups: grouped.groups,
    imagePaths: screenshots, knowledgePacks: packResult.packs || [] });
  const byCanonicalId = new Map(recording.events.map(event => [event.id, event]));
  const tasks = (interpretation.businessTasks || []).map(task => ({ ...task,
    screenshotAssetIds: [...new Set((task.sourceEventIds || []).map(id =>
      byCanonicalId.get(id)?.screenshotAssetId).filter(Boolean))] }));
  const errors = await getBcErrorEvidenceForRecording(recordingId);
  const report = globalThis.T9BugReportService.createBugReportFromRecording(
    recording, tasks, { extensionVersion: VERSION, productVersion: VERSION,
      errorEvidence: errors,
      documentLanguage: globalThis.T9LanguageRegistry.normalize(
        recording.metadata?.documentLanguage, "document"
      ),
      title: String(reportTitle || "").trim() ||
        draftBugTitle(tasks, errors) });
  const saved = await bugReportStore.save(report);
  const workspaceUrl = chrome.runtime.getURL(
    `technical-report.html?bugReportId=${encodeURIComponent(saved.bugReportId)}&new=1`);
  const tab = await chrome.tabs.create({ url: workspaceUrl });
  return { report: saved, workspaceUrl, tabId: tab.id };
}

async function listSessions() {
  const all = await chrome.storage.local.get(null);
  return Object.entries(all)
    .filter(([key]) => key.startsWith(SESSION_PREFIX))
    .map(([, value]) => value)
    .sort((a, b) => String(b.startedAt).localeCompare(String(a.startedAt)));
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
  await chrome.storage.local.remove(
    [
      ...globalThis.T9StorageKeys.sessionDataKeys(id),
      globalThis.T9StorageKeys.BC_ERROR_EVIDENCE_PREFIX + id
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
    await chrome.storage.local.set({ [SETTINGS_KEY]: DEFAULT_SETTINGS });
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
          }
        }, 10000);
        sendResponse({ ok: true });
        break;
      }

      case "T9_SET_CAPTURE_DIAGNOSTICS":
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

      case "T9_LOAD_BUG_REPORT":
        sendResponse({ ok: true,
          report: await bugReportStore.load(message.bugReportId) });
        break;

      case "T9_LIST_BUG_REPORTS":
        sendResponse({ ok: true, reports: await bugReportStore.list() });
        break;

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

      case "T9_GET_AI_CONFIGURATION":
        sendResponse({ ok: true, configuration: await getAiConfiguration() });
        break;

      case "T9_SAVE_AI_CONFIGURATION":
        sendResponse({ ok: true, configuration: await saveAiConfiguration(
          message.configuration) });
        break;

      case "T9_ANALYZE_BUG_REPORT": { // Explicit consent and user action only.
        const configuration = await getAiConfiguration();
        const validation = globalThis.T9AiBrokerTransport.validateConfiguration(
          configuration);
        if (!validation.valid) throw Object.assign(new Error(
          validation.errors.join(" ")), { category: "not-configured" });
        const report = await bugReportStore.load(message.bugReportId);
        if (!report) throw new Error("Bug Report kunde inte hittas.");
        const evidence = await getBcErrorEvidenceForRecording(report.recordingId);
        const generation = (aiAnalysisGeneration.get(report.bugReportId) || 0) + 1;
        aiAnalysisGeneration.set(report.bugReportId, generation);
        const result = await createAiProvider(configuration).analyzeTechnicalBug(
          report, evidence, message.policy || {}, configuration);
        if (aiAnalysisGeneration.get(report.bugReportId) !== generation || result.ignored) {
          sendResponse({ ok: true, ignored: true, reason: "superseded-analysis" });
          break;
        }
        const latest = await bugReportStore.load(report.bugReportId);
        if (!latest) { sendResponse({ ok: true, ignored: true,
          reason: "report-removed" }); break; }
        const latestInput = globalThis.T9AiAnalysisInput.build(latest, evidence,
          message.policy || {});
        if (latestInput.sourceEvidenceFingerprint !==
          result.analysis.sourceEvidenceFingerprint) {
          sendResponse({ ok: true, ignored: true, reason: "evidence-changed" });
          break;
        }
        result.analysis.inputPolicy = globalThis.T9AiEvidencePolicy.policy(
          message.policy || {});
        const saved = globalThis.T9BugReportModel.attachAiAnalysis(latest,
          result.analysis, new Date().toISOString());
        sendResponse({ ok: true, report: await bugReportStore.save(saved),
          analysis: result.analysis, disclosure: result.input.disclosure });
        break;
      }

      case "T9_REMOVE_BUG_REPORT_AI_ANALYSIS": {
        const report = await bugReportStore.load(message.bugReportId);
        if (!report) throw new Error("Bug Report kunde inte hittas.");
        sendResponse({ ok: true, report: await bugReportStore.save(
          globalThis.T9BugReportModel.removeAiAnalysis(report,
            new Date().toISOString())) });
        break;
      }

      case "T9_GET_ISSUE_CONFIGURATION":
        sendResponse({ ok: true, configuration: await getIssueConfiguration() });
        break;

      case "T9_SAVE_ISSUE_CONFIGURATION":
        sendResponse({ ok: true, configuration: await saveIssueConfiguration(
          message.configuration) });
        break;

      case "T9_BUILD_ISSUE_PACKAGE": { // Local projection only; no transmission.
        const report = await bugReportStore.load(message.bugReportId);
        if (!report) throw new Error("Bug Report kunde inte hittas.");
        const evidence = await getBcErrorEvidenceForRecording(report.recordingId);
        const issuePackage = globalThis.T9IssuePackage.build(report,
          { errorEvidence: evidence }, { generatedAt: new Date().toISOString(),
            includeTelemetry: Boolean(message.options?.includeTelemetry),
            includeAiAnalysis: Boolean(message.options?.includeAiAnalysis) });
        const screenshotValues = await getScreenshots(report.recordingId);
        const recording = await getCanonicalRecording(report.recordingId);
        const offlineAttachments = issuePackage.attachments.map(attachment => {
          const event = recording?.events?.find(value =>
            value.screenshotAssetId === attachment.assetId);
          return { ...attachment, dataUrl: event ?
            screenshotValues[event.raw?.eventNo] || null : null };
        });
        sendResponse({ ok: true, issuePackage,
          markdown: globalThis.T9IssuePackageMarkdown.markdown(issuePackage),
          offlineAttachments,
          existingReferences: report.enrichment?.externalIssues || [] });
        break;
      }

      case "T9_TEST_ISSUE_CONNECTION": {
        const all = await getIssueConfiguration(); const providerId = message.provider;
        if (!["azure-devops", "github"].includes(providerId)) throw Object.assign(
          new Error("Select a configured issue destination."),
          { category: "configuration-error" });
        const configuration = providerId === "azure-devops" ? all.azureDevOps : all.github;
        const provider = providerId === "azure-devops"
          ? createAzureProvider(configuration, "") : createGitHubProvider(configuration);
        const service = globalThis.T9IssueSubmissionService.create(provider);
        sendResponse({ ok: true, result: await service.testConnection(configuration) });
        break;
      }

      case "T9_CREATE_EXTERNAL_ISSUE": { // Explicit preview confirmation only.
        const report = await bugReportStore.load(message.bugReportId);
        if (!report) throw new Error("Bug Report kunde inte hittas.");
        const existing = report.enrichment?.externalIssues || [];
        if (existing.length && !message.confirmDuplicate) throw Object.assign(
          new Error("Report already has an external issue. Confirm deliberate re-submission."),
          { category: "existing-external-issue" });
        const evidence = await getBcErrorEvidenceForRecording(report.recordingId);
        const issuePackage = message.issuePackage;
        if (globalThis.T9IssuePackage.isStale(issuePackage, report,
          { errorEvidence: evidence })) throw Object.assign(
          new Error("Issue Package is stale. Generate a new preview before submission."),
          { category: "stale-package" });
        const all = await getIssueConfiguration(); const providerId = message.provider;
        if (!["azure-devops", "github"].includes(providerId)) throw Object.assign(
          new Error("Select a configured issue destination."),
          { category: "configuration-error" });
        const configuration = providerId === "azure-devops" ? all.azureDevOps : all.github;
        const provider = providerId === "azure-devops"
          ? createAzureProvider(configuration, report.recordingId)
          : createGitHubProvider(configuration);
        const generationKey = `${report.bugReportId}:${providerId}`;
        const generation = (issueSubmissionGeneration.get(generationKey) || 0) + 1;
        issueSubmissionGeneration.set(generationKey, generation);
        const result = await globalThis.T9IssueSubmissionService.create(provider).submit(
          issuePackage, configuration, { explicitConfirmation: true,
            idempotencyKey: issuePackage.packageId });
        const latest = await bugReportStore.load(report.bugReportId);
        if (!latest || issueSubmissionGeneration.get(generationKey) !== generation) {
          sendResponse({ ok: true, ignored: true, reason: "superseded-submission",
            result }); break;
        }
        const saved = globalThis.T9BugReportModel.attachExternalIssue(latest,
          result.reference, new Date().toISOString());
        sendResponse({ ok: true, result,
          report: await bugReportStore.save(saved) });
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
        const legacy = recording
          ? globalThis.T9CanonicalRecording.legacyView(recording)
          : { session: null, events: [] };
        const normalized = recording
          ? globalThis.T9EventNormalization.normalizeRecording(recording)
          : { schemaVersion: 1, recordingId: message.sessionId, events: [] };
        const grouped = globalThis.T9EventStepGrouping.group(normalized);
        const mechanicsBySource = new Map();
        const groupsByNormalizedEvent = new Map();
        grouped.groups.forEach(group => group.normalizedEventIds.forEach(id =>
          groupsByNormalizedEvent.set(id, group)
        ));
        normalized.events.forEach(item => item.sourceEventIds.forEach(id =>
          mechanicsBySource.set(id, item)
        ));
        const projectedEvents = recording
          ? legacy.events.map((event, index) => ({
              ...event,
              canonicalSourceEventId: recording.events[index]?.id || "",
              canonicalScreenshotAssetId:
                recording.events[index]?.screenshotAssetId || "",
              normalizedInteraction: mechanicsBySource.get(
                recording.events[index]?.id
              ) || null,
              stepGroup: groupsByNormalizedEvent.get(
                mechanicsBySource.get(recording.events[index]?.id)
                  ?.normalizedEventId
              ) || null
            }))
          : legacy.events;
        sendResponse({
          ok: true,
          recording,
          session: legacy.session,
          events: projectedEvents,
          normalizedEvents: normalized.events,
          stepGroups: grouped.groups,
          groupingDiagnostics: grouped.diagnostics,
          screenshots: message.includeScreenshots === false
            ? {}
            : await getScreenshots(message.sessionId),
          bcErrorEvidence: await getBcErrorEvidenceForRecording(message.sessionId)
        });
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

        sendResponse({
          ok: true,
          downloadId
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
        const review = {
          ...(message.review || {}),
          sessionId: message.sessionId,
          updatedAt: new Date().toISOString()
        };
        await chrome.storage.local.set({
          [REVIEW_PREFIX + message.sessionId]: review
        });
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

      case "T9_GET_DEBUG": {
        const data = await chrome.storage.local.get(DEBUG_KEY);
        const state = await getState();
        const registration = await getRecorderRegistrationStatus();
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
        const storedSettings = data[SETTINGS_KEY] || {};

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
        const settings = { ...DEFAULT_SETTINGS, ...(message.settings || {}) };
        settings.uiLocale = globalThis.T9LanguageRegistry.normalize(
          settings.uiLocale, "ui");
        settings.documentLanguage = globalThis.T9LanguageRegistry.normalize(
          settings.documentLanguage, "document");
        await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
        sendResponse({ ok: true, settings });
        break;
      }

      case "T9_SAVE_UI_LOCALE": {
        const data = await chrome.storage.local.get(SETTINGS_KEY);
        const settings = { ...DEFAULT_SETTINGS, ...(data[SETTINGS_KEY] || {}),
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
    sendResponse({ ok: false, error: error.message || String(error) });
  });

  return true;
});
