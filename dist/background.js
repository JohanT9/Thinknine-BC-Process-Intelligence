importScripts("engine/storage-keys.js");
importScripts("engine/page-identity.js");
importScripts("engine/page-identification-engine.js");
importScripts("engine/canonical-recording.js");
importScripts("engine/raw-event-persistence.js");
importScripts("engine/bc-ui-identification.js");
importScripts("engine/event-normalization.js");
importScripts("engine/event-step-grouping.js");
importScripts("engine/privacy-mask.js");
importScripts("engine/screenshot-capture-policy.js");
importScripts("document/document-library.js");

const VERSION = "4.6.0";
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
  exportFileNamePattern: "{process} - {environment} - {date}",
  documentationProfile: "generic",
  captureScreenshots: true,
  screenshotMode: "important",
  maskValues: true,
  maxEvents: 20000,
  environmentName: "ApteanAdvance",
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
  EVENT_PREFIX,
  RAW_RECORDING_PREFIX,
  RECORDING_PREFIX,
  REVIEW_PREFIX,
  SCREENSHOT_PREFIX,
  SESSION_PREFIX
} = globalThis.T9StorageKeys;
const DEBUG_KEY = "t9_debug";

let writeQueue = Promise.resolve();
let stoppingSessionId = null;
let canonicalPersistenceError = null;

const SCREENSHOT_MIN_INTERVAL_MS = 1100;
const CANONICAL_SETTLE_TIMEOUT_MS = 60000;
let screenshotQueue = [];
let screenshotWorkerRunning = false;
let screenshotWorkerPromise = Promise.resolve();
let lastScreenshotAt = 0;

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
    startedAt: null
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
    version: VERSION,
    updatedAt: new Date().toISOString(),
    ...(data[DEBUG_KEY] || {}),
    ...patch
  };
  await chrome.storage.local.set({ [DEBUG_KEY]: debug });
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

async function capture(tabId) {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (!tab.active) return null;

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
  }
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

      // Reuse the same screenshot for nearby events instead of taking another one.
      screenshots[item.eventNo] = image;
      await canonicalStore.associateScreenshot(
        item.sessionId, item.eventId, image, new Date().toISOString()
      );
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
    const events = canonical.events.map(item => item.raw);
    await saveEvents(recordingId, events);

    session.eventCount = events.length;
    session.updatedAt = event.timestamp;
    await saveSession(session);

    if (alreadyCanonical) return;

    if (globalThis.T9ScreenshotCapturePolicy.shouldCapture(settings, event)) {
      const captureCategory = globalThis.T9ScreenshotCapturePolicy.category(event);
      await enqueueScreenshot({
        sessionId: recordingId,
        eventNo: event.eventNo,
        eventId: canonicalEvent.id,
        tabId: captureContext.tabId || acceptedState.tabId,
        category: captureCategory,
        captureKey: event.fieldName || ""
      });
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
        label: event.label || event.fieldName || event.pageCaption || ""
      },
      lastError: null
    });
  });
  writeQueue = operation.catch(async error => {
    canonicalPersistenceError ||= error;
    await setDebug({ lastError: String(error) });
  });

  return operation;
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
      js: ["content.js"],
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
        files: ["content.js"],
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
    const response = await chrome.tabs.sendMessage(tabId, {
      type: "T9_CONTENT_PING"
    });
    return Boolean(response?.ok);
  } catch {
    return false;
  }
}

async function ensureContentScript(tabId) {
  if (await pingContentScript(tabId)) {
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
      files: ["content.js"]
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
  const connected = await pingContentScript(tabId);

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

  const settings = await getSettings();
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
    startedAt: now
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
      sessionId: id
    });
  } catch {}

  return session;
}

async function stopSession() {
  const state = await getState();
  if (!state.sessionId) return null;
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
  if (session) {
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
    await canonicalStore.finalize(state.sessionId, session.completedAt);
    await saveSession(session);
  }

  screenshotStats.dropped += screenshotQueue.length;
  screenshotQueue = [];

  await setState({
    recording: false,
    sessionId: null,
    tabId: state.tabId,
    startedAt: null
  });
  await setDebug({
    activeSessionId: null,
    lastError: null
  });
  stoppingSessionId = null;

  return session;
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
    globalThis.T9StorageKeys.sessionDataKeys(id)
  );
}

chrome.runtime.onInstalled.addListener(async () => {
  const current = await chrome.storage.local.get(SETTINGS_KEY);
  if (!current[SETTINGS_KEY]) {
    await chrome.storage.local.set({ [SETTINGS_KEY]: DEFAULT_SETTINGS });
  }
  await setState(await getState());
  await setDebug({
    installedAt: new Date().toISOString(),
    connected: false,
    lastError: null
  });
});

chrome.runtime.onStartup.addListener(async () => {
  await setState(await getState());
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    switch (message.type) {
      case "T9_PING":
        await setDebug({
          connected: true,
          lastPingAt: new Date().toISOString(),
          lastFrameUrl: message.frameUrl || sender.url || "",
          lastError: null
        });
        sendResponse({ ok: true, version: VERSION });
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

      case "T9_STOP": {
        const session = await stopSession();
        sendResponse({ ok: true, session });
        break;
      }

      case "T9_GET_STATE": {
        const state = await getState();
        const session = state.sessionId ? await getSession(state.sessionId) : null;
        sendResponse({ ok: true, state, session });
        break;
      }

      case "T9_RECORD_EVENT":
        await recordEvent(message.event, {
          tabId: sender.tab?.id,
          frameId: sender.frameId,
          parentFrameId: sender.parentFrameId,
          documentId: sender.documentId,
          origin: sender.origin || sender.url
        });
        sendResponse({ ok: true });
        break;

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
            : await getScreenshots(message.sessionId)
        });
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
        sendResponse({
          ok: true,
          debug: data[DEBUG_KEY] || {},
          state,
          registration
        });
        break;
      }

      case "T9_GET_SETTINGS": {
        const data = await chrome.storage.local.get("t9-settings");

        sendResponse({
          ok: true,
          settings: {
            ...DEFAULT_SETTINGS,
            ...(data["t9-settings"] || {})
          }
        });
        break;
      }

      case "T9_SAVE_SETTINGS": {
        const settings = { ...DEFAULT_SETTINGS, ...(message.settings || {}) };
        await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
        sendResponse({ ok: true, settings });
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
