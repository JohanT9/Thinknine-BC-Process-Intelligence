(() => {
  if (window.__T9_RECORDER_V2__) return;

  // Compatibility for a persistent dynamic registration created before the
  // focus-session helper became a separate content-script resource. Extension
  // reloads do not necessarily recreate same-version dynamic registrations.
  const focusSessionApi = globalThis.T9CaptureFocusSession || {
    create() {
      const sessions = new WeakMap();
      return {
        start(element, value) {
          sessions.set(element, { initialValue: value, committed: false,
            committedValue: undefined });
        },
        commit(element, value) {
          const current = sessions.get(element);
          if (current) sessions.set(element, { ...current, committed: true,
            committedValue: value });
        },
        previous(element) { return sessions.get(element)?.initialValue; },
        finish(element, finalValue) {
          const current = sessions.get(element);
          sessions.delete(element);
          if (!current) return { emit: false, reason: "missing-focus-session" };
          if (current.initialValue === finalValue) {
            return { emit: false, reason: "unchanged-focus-session" };
          }
          if (current.committed && current.committedValue === finalValue) {
            return { emit: false, reason: "equivalent-native-commit" };
          }
          return { emit: true, reason: "changed-value-on-focusout-fallback",
            previousValue: current.initialValue, value: finalValue };
        }
      };
    }
  };
  const focusSessions = focusSessionApi.create();
  const surfaceModeApi = globalThis.T9CaptureSurfaceMode || {
    VERSION: "compatibility", STANDARD: "standard-bc", ENHANCED: "control-addin",
    detect: () => Object.freeze({ version: "compatibility", mode: "standard-bc",
      enhanced: false, signals: Object.freeze([]), confidence: 1 }),
    supportsEnhancedRole: () => false
  };
  window.__T9_RECORDER_V2__ = true;

  let recording = false;
  let sessionId = null;
  let diagnosticsEnabled = false;
  let recordingPurpose = null;
  let lastUrl = location.href;
  let lastPageSignature = "";
  const sourceFrameId = crypto.randomUUID();
  let sourceSequence = 0;
  const inputTimers = new WeakMap();
  const elementInteractions = new WeakMap();
  const observedDialogs = new Set();
  const dialogInteractions = new WeakMap();
  let pendingPointerCapture = null;
  let activeInteraction = null;
  const INTERACTION_WINDOW_MS = 10000;
  const recordingIndicator = { host: null, shadow: null, minimized: false,
    refreshTimer: null };

  function isTopDocument() {
    try { return window === window.top; } catch { return false; }
  }

  function isRecorderUiEvent(event) {
    return Boolean(recordingIndicator.host &&
      event.composedPath?.().includes(recordingIndicator.host));
  }

  function newInteractionId() {
    return `${sourceFrameId}:${crypto.randomUUID()}`;
  }

  function activateInteraction(interactionId, target, source) {
    const id = interactionId || newInteractionId();
    activeInteraction = { interactionId: id, target: target || null,
      source: source || "unknown", createdAt: Date.now(), lastObservedAt: Date.now() };
    if (target instanceof Element) elementInteractions.set(target, id);
    return id;
  }

  function currentInteractionId() {
    if (!activeInteraction ||
        Date.now() - activeInteraction.lastObservedAt > INTERACTION_WINDOW_MS) {
      activeInteraction = null;
      return "";
    }
    activeInteraction.lastObservedAt = Date.now();
    return activeInteraction.interactionId;
  }

  function interactionForElement(element, createIfMissing = false) {
    if (!(element instanceof Element)) return currentInteractionId();
    const existing = elementInteractions.get(element);
    if (existing) {
      if (activeInteraction?.interactionId === existing) {
        activeInteraction.lastObservedAt = Date.now();
      }
      return existing;
    }
    const active = currentInteractionId();
    if (active && (activeInteraction?.target === element ||
        activeInteraction?.target?.contains?.(element) ||
        element.contains?.(activeInteraction?.target))) {
      elementInteractions.set(element, active);
      return active;
    }
    return createIfMissing ? activateInteraction("", element, "field") : "";
  }

  function indicatorTone(liveStatus) {
    const codes = new Set((liveStatus?.warnings || []).map(item => item.code));
    if (!liveStatus?.connected || codes.has("screenshot-error") ||
        codes.has("recording-truncated")) return "error";
    return codes.size ? "warning" : "ok";
  }

  function updateRecordingIndicator(liveStatus) {
    const shadow = recordingIndicator.shadow;
    if (!shadow) return;
    const tone = indicatorTone(liveStatus);
    recordingIndicator.host.dataset.tone = tone;
    const action = liveStatus?.latestAction;
    shadow.getElementById("indicatorState").textContent = tone === "error"
      ? "Inspelningen behöver kontrolleras" : "Inspelning pågår";
    shadow.getElementById("indicatorLatest").textContent = action
      ? (action.label || action.category || action.type || "Händelse registrerad")
      : "Väntar på första händelsen";
    shadow.getElementById("indicatorCounts").textContent =
      `${liveStatus?.eventCount || 0} händelser · ` +
      `${liveStatus?.screenshots?.captured || 0} bilder`;
    const warning = shadow.getElementById("indicatorWarning");
    const messages = (liveStatus?.warnings || []).map(item => item.message);
    warning.hidden = messages.length === 0;
    warning.textContent = messages[0] || "";
  }

  function refreshRecordingIndicator() {
    if (!recording || !isTopDocument()) return;
    try {
      chrome.runtime.sendMessage({ type: "T9_GET_STATE" }, response => {
        if (chrome.runtime.lastError || !response?.state?.recording) return;
        updateRecordingIndicator(response.liveStatus);
      });
    } catch {}
  }

  function removeRecordingIndicator() {
    if (recordingIndicator.refreshTimer) {
      clearInterval(recordingIndicator.refreshTimer);
      recordingIndicator.refreshTimer = null;
    }
    recordingIndicator.host?.remove();
    recordingIndicator.host = null;
    recordingIndicator.shadow = null;
  }

  function showRecordingIndicator() {
    if (!recording || !isTopDocument() || recordingIndicator.host ||
        !document.documentElement) return;
    const host = document.createElement("div");
    host.id = "t9-recording-indicator-host";
    host.dataset.tone = "warning";
    const shadow = host.attachShadow({ mode: "closed" });
    shadow.innerHTML = `<style>
      :host{--tone:#008c95;position:fixed;inset:0;z-index:2147483647;
        pointer-events:none;box-shadow:inset 0 0 0 3px var(--tone)}
      :host([data-tone="warning"]){--tone:#c35a00}
      :host([data-tone="error"]){--tone:#c50f1f}
      .panel{position:absolute;right:16px;bottom:16px;width:270px;box-sizing:border-box;
        pointer-events:auto;background:#fff;color:#242424;border:2px solid var(--tone);
        border-radius:8px;box-shadow:0 5px 18px rgba(0,0,0,.24);font:13px "Segoe UI",Arial,sans-serif}
      .head{display:flex;align-items:center;gap:8px;padding:9px 10px;background:#f5f5f5;
        border-radius:6px 6px 0 0}.dot{width:10px;height:10px;border-radius:50%;background:var(--tone)}
      strong{flex:1}.body{padding:9px 10px}.latest{margin:0 0 5px;font-weight:600}
      .counts,.warning{margin:0;color:#5c5c5c}.warning{margin-top:6px;color:#9a3412}
      button{font:inherit;border:1px solid #8a8886;border-radius:4px;background:#fff;
        color:#242424;padding:5px 9px;cursor:pointer}.stop{border-color:#008c95;color:#006b70}
      .guidance{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:0 10px 8px}
      .guidance button{padding:6px 5px}.actions{display:flex;gap:6px;padding:0 10px 10px}
      .actions .stop{flex:1}
      :host([data-minimized="true"]) .body,:host([data-minimized="true"]) .guidance,
      :host([data-minimized="true"]) .actions{display:none}
      :host([data-minimized="true"]) .panel{width:190px}
    </style><aside class="panel" role="status" aria-live="polite">
      <div class="head"><span class="dot"></span><strong id="indicatorState">Inspelning pågår</strong>
        <button id="indicatorMinimize" type="button" title="Minimera">−</button></div>
      <div class="body"><p id="indicatorLatest" class="latest">Väntar på första händelsen</p>
        <p id="indicatorCounts" class="counts">0 händelser · 0 bilder</p>
        <p id="indicatorWarning" class="warning" hidden></p></div>
      <div class="guidance" aria-label="Markera senaste steget">
        <button id="indicatorImportant" type="button" title="Markera senaste steget som viktigt">Viktigt steg</button>
        <button id="indicatorUseImage" type="button" title="Anv\u00e4nd senaste stegets bild">Anv\u00e4nd denna bild</button>
        <button id="indicatorSection" type="button" title="Skapa en ny sektion efter senaste steget">Ny sektion</button>
        <button id="indicatorIgnore" type="button" title="Ignorera senaste steget i dokumentet">Ignorera</button>
      </div>
      <div class="actions"><button id="indicatorStop" class="stop" type="button">Stoppa</button></div>
    </aside>`;
    recordingIndicator.host = host;
    recordingIndicator.shadow = shadow;
    shadow.getElementById("indicatorMinimize").addEventListener("click", event => {
      event.stopPropagation();
      recordingIndicator.minimized = !recordingIndicator.minimized;
      host.dataset.minimized = String(recordingIndicator.minimized);
      event.currentTarget.textContent = recordingIndicator.minimized ? "+" : "−";
      event.currentTarget.title = recordingIndicator.minimized ? "Visa" : "Minimera";
    });
    shadow.getElementById("indicatorStop").addEventListener("click", event => {
      event.stopPropagation();
      chrome.runtime.sendMessage({ type: "T9_REQUEST_STOP_DIALOG" }, response => {
        if (chrome.runtime.lastError || response?.ok) return;
        shadow.getElementById("indicatorWarning").hidden = false;
        shadow.getElementById("indicatorWarning").textContent =
          response?.error || "Öppna tillägget för att stoppa inspelningen.";
      });
    });
    const sendGuidance = (kind, confirmation) => event => {
      event.stopPropagation();
      chrome.runtime.sendMessage({ type: "T9_CAPTURE_GUIDANCE", kind }, response => {
        const warning = shadow.getElementById("indicatorWarning");
        if (chrome.runtime.lastError || !response?.ok) {
          warning.hidden = false;
          warning.textContent = response?.error ||
            "Markeringen kunde inte sparas. F\u00f6rs\u00f6k igen efter n\u00e4sta h\u00e4ndelse.";
          return;
        }
        warning.hidden = true;
        shadow.getElementById("indicatorLatest").textContent = confirmation;
      });
    };
    shadow.getElementById("indicatorImportant").addEventListener("click",
      sendGuidance("important", "Senaste steget markerades som viktigt"));
    shadow.getElementById("indicatorUseImage").addEventListener("click",
      sendGuidance("use-image", "Senaste bilden har valts"));
    shadow.getElementById("indicatorSection").addEventListener("click",
      sendGuidance("new-section", "Ny sektion skapas efter senaste steget"));
    shadow.getElementById("indicatorIgnore").addEventListener("click",
      sendGuidance("ignore", "Senaste steget ignoreras i dokumentet"));
    document.documentElement.append(host);
    refreshRecordingIndicator();
    recordingIndicator.refreshTimer = setInterval(refreshRecordingIndicator, 1000);
  }

  function syncRecordingIndicator() {
    if (recording) showRecordingIndicator();
    else removeRecordingIndicator();
  }

  function diagnostic(stage, details = {}) {
    if (!diagnosticsEnabled) return;
    try {
      chrome.runtime.sendMessage({ type: "T9_CAPTURE_DIAGNOSTIC",
        diagnostic: { stage, timestamp: new Date().toISOString(),
          eventType: details.eventType || "",
          targetTag: details.targetTag || "", role: details.role || "",
          inputType: details.inputType || "", hasValue: Boolean(details.hasValue),
          accepted: details.accepted,
          rejectionReason: details.rejectionReason || "",
          sourceEventId: details.sourceEventId || "" } }, () => {
        void chrome.runtime.lastError;
      });
    } catch {}
  }

  try {
    chrome.runtime.sendMessage({ type: "T9_GET_STATE" }, response => {
      if (chrome.runtime.lastError) return;
      recording = Boolean(response?.state?.recording && response.isRecordingTab);
      sessionId = recording ? response?.state?.sessionId || null : null;
      recordingPurpose = recording
        ? response?.state?.recordingPurpose || null : null;
      syncRecordingIndicator();
    });
  } catch {
    // The extension context may be invalidated during an extension reload.
  }

  function sendPing() {
    try {
      chrome.runtime.sendMessage({
        type: "T9_PING",
        frameUrl: location.href,
        frameDepth: getFrameDepth(),
        recorderActive: recording,
        diagnosticsEnabled
      }, response => {
        if (chrome.runtime.lastError) return;
        if (response?.state) {
          recording = Boolean(response.state.recording);
          sessionId = response.state.sessionId || null;
          recordingPurpose = response.state.recordingPurpose || null;
          syncRecordingIndicator();
        }
        diagnosticsEnabled = Boolean(response?.diagnosticsEnabled);
      });
    } catch {
      // Ignore transient errors while Edge reloads the extension.
    }
  }

  sendPing();
  setInterval(sendPing, 5000);

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "T9_STATE_CHANGED") {
      recording = Boolean(message.recording);
      sessionId = message.sessionId || null;
      recordingPurpose = message.recordingPurpose || null;
      syncRecordingIndicator();
      sendResponse({ ok: true });
      return false;
    }

    if (message.type === "T9_CONTENT_PING") {
      sendResponse({
        ok: true,
        recording,
        sessionId,
        diagnosticsEnabled,
        observedContext: context(),
        frameUrl: location.href,
        version: "2.1.0"
      });
      return false;
    }

    if (message.type === "T9_SET_INDICATOR_CAPTURE_VISIBILITY") {
      if (recordingIndicator.host) {
        recordingIndicator.host.style.display = message.hidden ? "none" : "";
      }
      if (!message.hidden) {
        sendResponse({ ok: true });
        return false;
      }
      requestAnimationFrame(() => requestAnimationFrame(() =>
        sendResponse({ ok: true })));
      return true;
    }

    return false;
  });

  // tabs.sendMessage without a frame target reaches only the top document.
  // Storage state changes reach every already-injected frame and keep control
  // add-ins synchronized across service-worker restarts and frame remounts.
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local" || !changes.t9_state?.newValue) return;
    if (!changes.t9_state.newValue.recording) {
      recording = false;
      sessionId = null;
      recordingPurpose = null;
      syncRecordingIndicator();
      return;
    }
    sendPing();
  });

  function clean(value, max = 300) {
    return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
  }

  function getTopUrl() {
    try { return window.top.location.href; }
    catch { return document.referrer || ""; }
  }

  function getFrameDepth() {
    let depth = 0;
    let current = window;
    try {
      while (current !== current.top) {
        depth += 1;
        current = current.parent;
      }
    } catch {
      depth += 1;
    }
    return depth;
  }

  function getPageId() {
    for (const url of [location.href, getTopUrl()]) {
      try {
        const value = new URL(url).searchParams.get("page");
        if (value) return value;
      } catch {}
    }
    return "";
  }

  function textOf(element) {
    if (!(element instanceof Element)) return "";
    return clean(
      element.getAttribute("aria-label") ||
      element.getAttribute("title") ||
      element.getAttribute("data-caption") ||
      element.innerText ||
      element.textContent
    );
  }

  function getPageCaption() {
    const selectors = [
      '[role="heading"][aria-level="1"]',
      '[role="heading"]',
      'h1',
      '[class*="page-title"]',
      '[class*="PageTitle"]',
      '[data-control-name="PageTitle"]'
    ];

    for (const selector of selectors) {
      for (const element of document.querySelectorAll(selector)) {
        const text = textOf(element);
        if (text && text.length < 180) return text;
      }
    }

    return clean(document.title, 180);
  }

  function getCompanyName() {
    for (const value of [getTopUrl(), location.href]) {
      try {
        const companyName = clean(new URL(value).searchParams.get("company"));
        if (companyName) return companyName;
      } catch {}
    }

    const labelledSelectors = [
      '[data-control-name="CompanyName"]',
      '[data-testid*="company" i]',
      '[class*="company-name" i]',
      '[class*="CompanyName"]'
    ];
    for (const selector of labelledSelectors) {
      for (const element of document.querySelectorAll(selector)) {
        const value = textOf(element);
        if (value && value.length <= 180) return value;
      }
    }

    const labelledElements = document.querySelectorAll("[aria-label],[title]");
    const labelPattern = /(?:current\s+company|company|företag|virksomhed)\s*[:：]\s*(.+)$/i;
    for (const element of labelledElements) {
      for (const attribute of ["aria-label", "title"]) {
        const match = clean(element.getAttribute(attribute), 250).match(labelPattern);
        if (match?.[1]) return clean(match[1], 180);
      }
    }
    return "";
  }

  function context() {
    return {
      pageId: getPageId(),
      pageCaption: getPageCaption(),
      documentTitle: clean(document.title, 250),
      companyName: getCompanyName(),
      frameUrl: location.href,
      topUrl: getTopUrl(),
      frameDepth: getFrameDepth()
    };
  }

  function getLabel(element) {
    if (!(element instanceof Element)) return "";

    const aria = element.getAttribute("aria-label");
    if (aria) return clean(aria);

    const labelledBy = element.getAttribute("aria-labelledby");
    if (labelledBy) {
      const text = labelledBy
        .split(/\s+/)
        .map(id => document.getElementById(id))
        .filter(Boolean)
        .map(textOf)
        .join(" ");
      if (text) return clean(text);
    }

    if (element.id) {
      try {
        const label = document.querySelector(
          `label[for="${CSS.escape(element.id)}"]`
        );
        if (label) return textOf(label);
      } catch {}
    }

    const wrappingLabel = element.closest("label");
    if (wrappingLabel) {
      const text = textOf(wrappingLabel);
      if (text) return text;
    }

    const container = element.closest(
      '[role="group"],[role="row"],[class*="field"],[class*="control"],td,li'
    );

    if (container) {
      const label = container.querySelector(
        'label,[class*="label"],[class*="caption"],[role="rowheader"]'
      );
      if (label) return textOf(label);
    }

    return clean(
      element.getAttribute("name") ||
      element.getAttribute("placeholder") ||
      element.getAttribute("title") ||
      element.id
    );
  }

  const NATIVE_INTERACTIVE_SELECTOR = [
    "button",
    "a",
    "input",
    "textarea",
    "select",
    '[contenteditable="true"]',
    '[role="button"]',
    '[role="menuitem"]',
    '[role="tab"]',
    '[role="option"]',
    '[role="checkbox"]',
    '[role="radio"]',
    '[role="listbox"]',
    '[role="row"]',
    '[role="gridcell"]',
    '[tabindex]'
  ].join(",");

  function isObservableReactTarget(element) {
    if (!(element instanceof Element) ||
        ["HTML", "BODY", "MAIN"].includes(element.tagName)) return false;
    if (element.hasAttribute("data-testid") ||
        element.hasAttribute("data-automation-id") ||
        element.hasAttribute("data-control-id") ||
        element.hasAttribute("data-control-name")) return true;
    const classes = String(element.className || "");
    if (/(?:Mui(?:Button|IconButton|CardActionArea|ListItemButton|MenuItem|TableRow|Tab)|clickable|action|selectable)/u
      .test(classes)) return true;
    try { return getComputedStyle(element).cursor === "pointer"; }
    catch { return false; }
  }

  function surfaceSignals(element) {
    if (!(element instanceof Element)) return surfaceModeApi.detect({
      frameDepth: getFrameDepth() });
    const classes = String(element.className || "");
    const root = element.closest?.("[data-reactroot],[data-react-root]," +
      "[data-control-addin],[class*='controladdin' i]");
    return surfaceModeApi.detect({
      frameDepth: getFrameDepth(),
      controlAddInPath: getFrameDepth() > 0 &&
        /(?:controladdin|control-addin|clientcontrol|addin)/i.test(location.pathname),
      controlAddIn: Boolean(root && (root.hasAttribute?.("data-control-addin") ||
        /controladdin/i.test(String(root.className || "")))),
      reactRoot: Boolean(root?.hasAttribute?.("data-reactroot") ||
        root?.hasAttribute?.("data-react-root")),
      materialUi: /Mui[A-Z]/.test(classes) || Boolean(element.closest?.("[class*='Mui']")),
      automationMetadata: ["data-testid", "data-automation-id", "data-control-id",
        "data-control-name"].some(name => element.hasAttribute(name))
    });
  }

  function reactTargetScore(element, pathIndex) {
    try {
      if (!isObservableReactTarget(element)) return -1;
      const explicit = ["data-testid", "data-automation-id", "data-control-id",
        "data-control-name"].some(name => element.hasAttribute(name));
      const classes = String(element.className || "");
      const component = /(?:Mui(?:Button|IconButton|CardActionArea|ListItemButton|MenuItem|TableRow|Tab)|clickable|action|selectable)/u
        .test(classes);
      const visibleText = clean(element.getAttribute("aria-label") ||
        element.getAttribute("title") || element.getAttribute("data-caption") ||
        element.innerText || element.textContent || "", 500);
      const informative = visibleText && visibleText.length <= 300;
      return (explicit ? 40 : 0) + (component ? 30 : 0) +
        (informative ? 20 : visibleText ? 5 : 0) - Math.min(pathIndex, 12);
    } catch { return -1; }
  }

  function reactInteractiveTarget(event) {
    return (event?.composedPath?.() || [])
      .map((element, pathIndex) => ({ element, pathIndex,
        score: element instanceof Element
          ? reactTargetScore(element, pathIndex) : -1 }))
      .filter(candidate => candidate.score >= 0)
      .sort((left, right) => right.score - left.score ||
        left.pathIndex - right.pathIndex)[0]?.element || null;
  }

  function concisePointerLabel(event, target) {
    const candidates = [target, ...(event?.composedPath?.() || [])]
      .filter((element, index, values) => element instanceof Element &&
        values.indexOf(element) === index)
      .map(element => {
        try {
          return clean(element.getAttribute("aria-label") ||
            element.getAttribute("title") ||
            element.getAttribute("data-caption") || element.innerText ||
            element.textContent || "", 160);
        } catch { return ""; }
      })
      .filter(value => value.length >= 2 && value.length <= 120 &&
        /[\p{L}\p{N}]/u.test(value));
    return candidates[0] || "";
  }

  function interactiveTarget(target, event) {
    if (!(target instanceof Element)) return null;
    const nativeTarget = target.closest(NATIVE_INTERACTIVE_SELECTOR);
    if (nativeTarget) return nativeTarget;
    const reactTarget = reactInteractiveTarget(event);
    if (reactTarget) return reactTarget;
    const mode = surfaceSignals(target);
    if (!mode.enhanced) return null;
    return (event?.composedPath?.() || []).find(item => item instanceof Element &&
      surfaceModeApi.supportsEnhancedRole(item.getAttribute?.("role"))) || null;
  }

  function eventElement(event) {
    return event.composedPath?.().find(item => item instanceof Element) ||
      event.target;
  }

  const EDITABLE_SELECTOR = [
    'input:not([type="button"]):not([type="submit"]):not([type="reset"])',
    "textarea", "select", '[contenteditable="true"]'
  ].join(",");

  function editableTarget(event) {
    const path = event.composedPath?.() || [event.target];
    const direct = path.find(item => item instanceof Element &&
      item.matches?.(EDITABLE_SELECTOR));
    if (direct) return direct;
    const element = path.find(item => item instanceof Element) || event.target;
    return element instanceof Element ? element.closest(EDITABLE_SELECTOR) : null;
  }

  function categoryOf(element) {
    const role = element?.getAttribute?.("role");
    const tag = element?.tagName?.toLowerCase();

    if (
      role === "button" ||
      role === "menuitem" ||
      role === "tab" || role === "switch" || role === "treeitem" ||
      tag === "button"
    ) return "action";

    if (
      role === "option" ||
      role === "row" ||
      role === "gridcell"
    ) return "selection";

    return "interaction";
  }

  function descriptor(element) {
    const bounds = element?.getBoundingClientRect?.();
    const labelledBy = element?.getAttribute?.("aria-labelledby") || "";
    const labelledText = labelledBy.split(/\s+/).filter(Boolean)
      .map(id => document.getElementById(id)).filter(Boolean).map(textOf).join(" ");
    let associatedLabel = "";
    if (element?.id) {
      try { associatedLabel = textOf(document.querySelector(`label[for="${CSS.escape(element.id)}"]`)); }
      catch {}
    }
    const wrappingLabel = element?.closest?.("label");
    const wrappingLabelText = textOf(wrappingLabel);
    const ariaLabel = element?.getAttribute?.("aria-label") || "";
    const title = element?.getAttribute?.("title") || "";
    const placeholder = element?.getAttribute?.("placeholder") || "";
    const elementText = clean(element?.innerText || element?.textContent || "");
    const role = element?.getAttribute?.("role") || "";
    const dialog = element?.closest?.('[role="dialog"],[aria-modal="true"]');
    const menu = element?.closest?.('[role="menu"],[role="listbox"]');
    const accessibleName = labelledText || ariaLabel || associatedLabel ||
      wrappingLabelText || elementText || title || placeholder || getLabel(element);
    const accessibleNameSource = labelledText ? "aria-labelledby" : ariaLabel
      ? "aria-label" : associatedLabel ? "label-for" : wrappingLabelText
        ? "wrapping-label" : elementText ? "element-text" : title
          ? "title" : placeholder ? "placeholder" : "surrounding-label";
    const uiHierarchy = [];
    let ancestor = element?.parentElement;
    for (let depth = 0; ancestor && depth < 8; depth += 1, ancestor = ancestor.parentElement) {
      const role = ancestor.getAttribute("role") || "";
      const classes = String(ancestor.className || "");
      const explicit = ancestor.getAttribute("data-control-type") || ancestor.getAttribute("data-part-type") || "";
      let type = explicit;
      let heuristic = false;
      if (!type && (role === "dialog" || ancestor.getAttribute("aria-modal") === "true")) type = "dialog";
      else if (!type && /fasttab/i.test(classes)) { type = "fastTab"; heuristic = true; }
      else if (!type && /factbox/i.test(classes)) { type = "factBox"; heuristic = true; }
      else if (!type && /subpage|part-container/i.test(classes)) { type = "subpage"; heuristic = true; }
      else if (!type && /actiongroup/i.test(classes)) { type = "actionGroup"; heuristic = true; }
      else if (!type && /actionbar/i.test(classes)) { type = "actionBar"; heuristic = true; }
      else if (!type && /controladdin/i.test(classes)) { type = "controlAddIn"; heuristic = true; }
      else if (!type && role === "grid") type = "repeater";
      else if (!type && role === "row") type = "row";
      else if (!type && role === "group") type = "group";
      if (type) uiHierarchy.unshift({
        type,
        caption: clean(ancestor.getAttribute("aria-label") || ancestor.getAttribute("data-caption") || "", 180),
        identity: clean(ancestor.getAttribute("data-control-id") || ancestor.getAttribute("data-control-name") || "", 180),
        heuristic
      });
    }
    const captureSurface = surfaceSignals(element);
    return {
      role: role || element?.tagName?.toLowerCase() || "",
      controlType: element?.tagName?.toLowerCase() || "",
      automationId:
        element?.getAttribute?.("data-automation-id") ||
        element?.getAttribute?.("data-control-id") ||
        element?.getAttribute?.("data-control-name") ||
        "",
      dataControlId: element?.getAttribute?.("data-control-id") || "",
      dataControlName: element?.getAttribute?.("data-control-name") || "",
      fieldId: element?.getAttribute?.("data-field-id") || "",
      controlId: element?.getAttribute?.("data-control-id") || "",
      elementId: element?.id || "",
      nameAttribute: element?.getAttribute?.("name") || "",
      inputType: element?.getAttribute?.("type") || "",
      ariaHasPopup: element?.getAttribute?.("aria-haspopup") || "",
      placeholder,
      accessibleName,
      accessibleNameSource,
      label: accessibleName,
      readOnly: Boolean(element?.readOnly),
      disabled: Boolean(element?.disabled || element?.getAttribute?.("aria-disabled") === "true"),
      checked: element?.checked ?? undefined,
      selected: element?.getAttribute?.("aria-selected") === "true" || undefined,
      reactInteractive: isObservableReactTarget(element) || undefined,
      controlAddIn: uiHierarchy.some(item => item.type === "controlAddIn") || /Mui[A-Z]/.test(String(element?.className || "")),
      captureSurface,
      uiHierarchy,
      localBounds: bounds ? { x: bounds.x, y: bounds.y,
        width: bounds.width, height: bounds.height } : undefined,
      devicePixelRatio: window.devicePixelRatio || 1,
      viewportScale: window.visualViewport?.scale || 1,
      uiState: {
        dialogComplete: Boolean(dialog?.isConnected),
        menuOpen: Boolean(menu?.isConnected) ||
          element?.getAttribute?.("aria-expanded") === "true",
        selectedOptionVisible: ["menuitem", "option", "row", "gridcell"]
          .includes(role) && Boolean(element?.isConnected)
      }
    };
  }

  function valueOf(element) {
    if (element instanceof HTMLInputElement) {
      if (element.type === "checkbox") return element.checked;
      if (element.type === "radio") return element.checked ? element.value : "";
      if (element.type === "password") return "[maskerat]";
      return element.value;
    }

    if (
      element instanceof HTMLTextAreaElement ||
      element instanceof HTMLSelectElement
    ) return element.value;

    if (element?.getAttribute?.("contenteditable") === "true") {
      return clean(element.textContent, 500);
    }

    return "";
  }

  function record(event) {
    const summary = { eventType: event.type,
      targetTag: event.controlType, role: event.role,
      inputType: event.inputType,
      hasValue: Object.prototype.hasOwnProperty.call(event, "value") };
    if (!recording || !sessionId) {
      diagnostic("capture-policy", { ...summary, accepted: false,
        rejectionReason: "recorder-inactive" });
      return;
    }

    try {
      const localSequence = ++sourceSequence;
      const sourceEventId = `${sessionId}:${sourceFrameId}:${localSequence}`;
      diagnostic("target-resolved", { ...summary, accepted: true,
        sourceEventId });
      diagnostic("capture-policy", { ...summary, accepted: true,
        sourceEventId });
      diagnostic("runtime-message-sent", { ...summary, accepted: true,
        sourceEventId });
      chrome.runtime.sendMessage({
        type: "T9_RECORD_EVENT",
        event: {
          sourceEventId,
          recordingId: sessionId,
          source: "business-central-content-script",
          sourceFrameId,
          sourceSequence: localSequence,
          captureProvenance: {
            producer: "business-central-content-script",
            frameInstanceId: sourceFrameId,
            localSequence
          },
          timestamp: new Date().toISOString(),
          ...context(),
          ...event
        }
      }, () => {
        void chrome.runtime.lastError;
      });
    } catch {
      // Ignore transient extension reload errors.
    }
  }

  const errorDialogLifecycles = new WeakMap();

  function observeBugError(dialog) {
    if (recordingPurpose !== "bug-report" || !globalThis.T9BcErrorDetector) return;
    const current = errorDialogLifecycles.get(dialog);
    const openedAt = current?.openedAt || new Date().toISOString();
    const buttons = [...dialog.querySelectorAll(
      'button,[role="button"],[role="menuitem"]'
    )].map(textOf).filter(Boolean);
    const details = dialog.querySelector(
      '[data-diagnostic-details],[data-error-details],pre,textarea,[role="log"]'
    );
    const heading = dialog.querySelector(
      '[role="heading"],h1,h2,h3,[aria-live="assertive"]'
    );
    const snapshot = { role: dialog.getAttribute("role") || "",
      modal: dialog.getAttribute("aria-modal") === "true",
      ariaInvalid: dialog.getAttribute("aria-invalid") === "true",
      liveAssertive: dialog.getAttribute("aria-live") === "assertive" ||
        Boolean(dialog.querySelector('[aria-live="assertive"],[role="alert"]')),
      accessibleName: dialog.getAttribute("aria-label") || textOf(heading),
      actions: buttons, detailsText: details?.value || details?.innerText ||
        details?.textContent || "", message: textOf(dialog),
      elementIdentity: dialog.id || dialog.getAttribute("data-control-id") ||
        dialog.getAttribute("aria-labelledby") || "dialog",
      frameInstanceId: sourceFrameId, openedAt };
    const identified = globalThis.T9BcErrorDetector.classifySnapshot(snapshot);
    if (!identified.detected || current?.captured) return;
    const errorEvidenceId = `bc-error:${sessionId}:${crypto.randomUUID()}`;
    errorDialogLifecycles.set(dialog, { openedAt, captured: true,
      errorEvidenceId });
    try {
      chrome.runtime.sendMessage({ type: "T9_CAPTURE_BC_ERROR",
        evidence: { errorEvidenceId, capturedAt: new Date().toISOString(),
          rawMessage: snapshot.message, rawDiagnostics: snapshot.detailsText,
          diagnosticsAvailable: identified.detailsAvailable,
          source: { kind: "business-central-ui", surface: identified.surface,
            confidence: identified.confidence },
          frameContext: { sourceFrameId, frameUrl: location.href,
            topUrl: getTopUrl(), frameDepth: getFrameDepth() } } }, () => {
          void chrome.runtime.lastError;
        });
    } catch {}
  }

  window.addEventListener("pointerdown", event => {
    if (isRecorderUiEvent(event)) return;
    if (!recording || !sessionId || event.button !== 0) return;
    const observedTarget = eventElement(event);
    const target = interactiveTarget(observedTarget, event) ||
      (observedTarget instanceof Element ? observedTarget : null);
    const label = concisePointerLabel(event, target);
    if (!target || !label) return;
    const interactionId = activateInteraction("", target, "pointer");
    pendingPointerCapture = { interactionId, target, createdAt: Date.now() };
    try {
      chrome.runtime.sendMessage({ type: "T9_CAPTURE_BEFORE_ACTION",
        interactionId }, () => { void chrome.runtime.lastError; });
    } catch {}
  }, true);


  window.addEventListener("click", event => {
    if (isRecorderUiEvent(event)) return;
    const observedTarget = eventElement(event);
    const target = interactiveTarget(observedTarget, event) ||
      (observedTarget instanceof Element ? observedTarget : null);
    diagnostic("native-event-observed", { eventType: "click",
      targetTag: eventElement(event)?.tagName?.toLowerCase?.() || "",
      role: eventElement(event)?.getAttribute?.("role") || "",
      accepted: Boolean(target),
      rejectionReason: target ? "" : "no-interactive-target" });
    if (!target) return;
    const category = categoryOf(target);
    const role = target.getAttribute?.("role") || "";
    const selectedElement = role === "row"
      ? target.querySelector?.('[role="gridcell"]') || target : target;
    const selectedCaption = category === "selection"
      ? clean(selectedElement?.innerText || selectedElement?.textContent || "")
      : "";
    const targetDescriptor = descriptor(target);
    const pointerLabel = category === "interaction"
      ? concisePointerLabel(event, target) : "";
    const pointerPath = event.composedPath?.() || [];
    const preActionCaptureId = pendingPointerCapture &&
      Date.now() - pendingPointerCapture.createdAt < 5000 &&
      (pointerPath.includes(pendingPointerCapture.target) ||
        pendingPointerCapture.target.contains?.(observedTarget))
      ? pendingPointerCapture.interactionId : "";
    const interactionId = preActionCaptureId ||
      activateInteraction("", target, "click");
    activateInteraction(interactionId, target, "click");
    pendingPointerCapture = null;

    record({
      type: "click",
      category,
      ...(selectedCaption ? { selectedValue: selectedCaption,
        selectedCaption } : {}),
      clientX: event.clientX,
      clientY: event.clientY,
      pointerTarget: true,
      interactionId,
      ...(preActionCaptureId ? { preActionCaptureId } : {}),
      ...targetDescriptor,
      ...(pointerLabel ? { accessibleName: pointerLabel,
        accessibleNameSource: "pointer-path-text", label: pointerLabel } : {})
    });
  }, true);

  function emitField(element, source, previousValue) {
    if (!(element instanceof Element)) return false;
    const value = valueOf(element);

    const targetDescriptor = descriptor(element);
    record({
      type: "field-change",
      category: "field",
      fieldName: getLabel(element) || "Okänt fält",
      value,
      previousValue: previousValue === undefined
        ? focusSessions.previous(element) : previousValue,
      inputSource: source,
      interactionId: interactionForElement(element, true),
      ...targetDescriptor,
      uiState: { ...targetDescriptor.uiState, resultVisible: true }
    });
    if (source !== "focusout") focusSessions.commit(element, value);
    return true;
  }

  window.addEventListener("input", event => {
    const element = editableTarget(event);
    diagnostic("native-event-observed", { eventType: "input",
      targetTag: element?.tagName?.toLowerCase?.() || "",
      role: element?.getAttribute?.("role") || "",
      inputType: element?.getAttribute?.("type") || "",
      hasValue: Boolean(element), accepted: Boolean(element),
      rejectionReason: element ? "" : "no-editable-target" });
    if (!(element instanceof Element)) return;

    clearTimeout(inputTimers.get(element));
    inputTimers.set(
      element,
      setTimeout(() => emitField(element, "input"), 600)
    );
  }, true);

  window.addEventListener("focusin", event => {
    const element = editableTarget(event);
    if (!(element instanceof Element)) return;
    focusSessions.start(element, valueOf(element));
    const interactionId = interactionForElement(element, true);
    const targetDescriptor = descriptor(element);
    record({ type: "focus", category: "lifecycle", value: valueOf(element),
      interactionId,
      ...targetDescriptor,
      uiState: { ...targetDescriptor.uiState, focusOnly: true } });
  }, true);

  window.addEventListener("change", event => {
    const element = editableTarget(event);
    if (element instanceof Element) {
      clearTimeout(inputTimers.get(element));
      emitField(element, "change");
    }
  }, true);

  window.addEventListener("focusout", event => {
    const element = editableTarget(event);

    if (element instanceof Element) {
      clearTimeout(inputTimers.get(element));
      const finalValue = valueOf(element);
      const outcome = focusSessions.finish(element, finalValue);
      if (outcome.emit) {
        emitField(element, "focusout", outcome.previousValue);
      } else {
        diagnostic("capture-policy", { eventType: "focusout",
          targetTag: element.tagName.toLowerCase(),
          role: element.getAttribute("role") || "",
          inputType: element.getAttribute("type") || "",
          hasValue: finalValue !== "", accepted: false,
          rejectionReason: outcome.reason });
      }
    }
  }, true);

  window.addEventListener("keydown", event => {
    if (!["Enter", " ", "Spacebar", "Escape", "F4"].includes(event.key)) return;
    const eventTarget = eventElement(event);
    const target = interactiveTarget(eventTarget, event) || eventTarget;
    const interactionId = interactionForElement(eventTarget, false) ||
      activateInteraction("", target, "keyboard");

    record({
      type: "key",
      category: "interaction",
      key: event.key,
      code: event.code,
      altKey: event.altKey,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      shiftKey: event.shiftKey,
      repeat: event.repeat,
      inputSource: "keyboard",
      interactionId,
      fieldName: getLabel(eventTarget),
      ...descriptor(target)
    });
  }, true);

  const observer = new MutationObserver(() => {
    const currentDialogs = new Set(document
      .querySelectorAll('[role="dialog"],[aria-modal="true"]'));
    currentDialogs.forEach(dialog => {
        observeBugError(dialog);
        if (observedDialogs.has(dialog)) return;
        observedDialogs.add(dialog);
        const interactionId = currentInteractionId();
        if (interactionId) dialogInteractions.set(dialog, interactionId);
        const dialogDescriptor = descriptor(dialog);
        record({
          type: "dialog-open",
          category: "dialog",
          ...(interactionId ? { interactionId } : {}),
          ...dialogDescriptor,
          label: textOf(dialog).slice(0, 600),
          uiHierarchy: [{ type: "dialog", caption: textOf(dialog).slice(0, 180) },
            ...dialogDescriptor.uiHierarchy]
        });
      });
    observedDialogs.forEach(dialog => {
      if (currentDialogs.has(dialog)) return;
      observedDialogs.delete(dialog);
      const dialogDescriptor = descriptor(dialog);
      const interactionId = dialogInteractions.get(dialog) || currentInteractionId();
      dialogInteractions.delete(dialog);
      record({ type: "dialog-close", category: "dialog",
        ...(interactionId ? { interactionId } : {}),
        label: textOf(dialog).slice(0, 600), ...dialogDescriptor,
        uiState: { ...dialogDescriptor.uiState, dialogComplete: false,
          dialogClosed: true } });
    });

    const signature = `${getPageId()}|${getPageCaption()}|${location.href}`;
    if (signature !== lastPageSignature) {
      lastPageSignature = signature;
      const interactionId = currentInteractionId();
      record({
        type: "page-state",
        category: "navigation",
        ...(interactionId ? { interactionId } : {}),
        uiState: { resultVisible: true }
      });
    }
  });

  function startObserver() {
    if (!document.documentElement) {
      requestAnimationFrame(startObserver);
      return;
    }

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  startObserver();

  setInterval(() => {
    if (location.href === lastUrl) return;

    const from = lastUrl;
    lastUrl = location.href;
    const interactionId = currentInteractionId();

    record({
      type: "navigation",
      category: "navigation",
      ...(interactionId ? { interactionId } : {}),
      uiState: { resultVisible: true },
      from,
      to: location.href
    });
  }, 400);
})();
