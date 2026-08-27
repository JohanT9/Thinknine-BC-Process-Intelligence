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
  const observedDialogs = new Set();
  let pendingPointerCapture = null;

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
      recording = Boolean(response?.state?.recording);
      sessionId = response?.state?.sessionId || null;
      recordingPurpose = response?.state?.recordingPurpose || null;
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

    return false;
  });

  // tabs.sendMessage without a frame target reaches only the top document.
  // Storage state changes reach every already-injected frame and keep control
  // add-ins synchronized across service-worker restarts and frame remounts.
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local" || !changes.t9_state?.newValue) return;
    recording = Boolean(changes.t9_state.newValue.recording);
    sessionId = changes.t9_state.newValue.sessionId || null;
    recordingPurpose = changes.t9_state.newValue.recordingPurpose || null;
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
    return reactInteractiveTarget(event);
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
      role === "tab" ||
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
    return {
      role: element?.getAttribute?.("role") || element?.tagName?.toLowerCase() || "",
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
      uiHierarchy,
      localBounds: bounds ? { x: bounds.x, y: bounds.y,
        width: bounds.width, height: bounds.height } : undefined,
      devicePixelRatio: window.devicePixelRatio || 1,
      viewportScale: window.visualViewport?.scale || 1
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
    if (!recording || !sessionId || event.button !== 0) return;
    const observedTarget = eventElement(event);
    const target = interactiveTarget(observedTarget, event) ||
      (observedTarget instanceof Element ? observedTarget : null);
    const label = concisePointerLabel(event, target);
    if (!target || !label) return;
    const interactionId = `${sourceFrameId}:${crypto.randomUUID()}`;
    pendingPointerCapture = { interactionId, target, createdAt: Date.now() };
    try {
      chrome.runtime.sendMessage({ type: "T9_CAPTURE_BEFORE_ACTION",
        interactionId }, () => { void chrome.runtime.lastError; });
    } catch {}
  }, true);


  window.addEventListener("click", event => {
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
    pendingPointerCapture = null;

    record({
      type: "click",
      category,
      ...(selectedCaption ? { selectedValue: selectedCaption,
        selectedCaption } : {}),
      clientX: event.clientX,
      clientY: event.clientY,
      pointerTarget: true,
      ...(preActionCaptureId ? { preActionCaptureId } : {}),
      ...targetDescriptor,
      ...(pointerLabel ? { accessibleName: pointerLabel,
        accessibleNameSource: "pointer-path-text", label: pointerLabel } : {})
    });
  }, true);

  function emitField(element, source, previousValue) {
    if (!(element instanceof Element)) return false;
    const value = valueOf(element);

    record({
      type: "field-change",
      category: "field",
      fieldName: getLabel(element) || "Okänt fält",
      value,
      previousValue: previousValue === undefined
        ? focusSessions.previous(element) : previousValue,
      inputSource: source,
      ...descriptor(element)
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
    record({ type: "focus", category: "lifecycle", value: valueOf(element),
      ...descriptor(element) });
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
        const dialogDescriptor = descriptor(dialog);
        record({
          type: "dialog-open",
          category: "dialog",
          ...dialogDescriptor,
          label: textOf(dialog).slice(0, 600),
          uiHierarchy: [{ type: "dialog", caption: textOf(dialog).slice(0, 180) },
            ...dialogDescriptor.uiHierarchy]
        });
      });
    observedDialogs.forEach(dialog => {
      if (currentDialogs.has(dialog)) return;
      observedDialogs.delete(dialog);
      record({ type: "dialog-close", category: "dialog",
        label: textOf(dialog).slice(0, 600), ...descriptor(dialog) });
    });

    const signature = `${getPageId()}|${getPageCaption()}|${location.href}`;
    if (signature !== lastPageSignature) {
      lastPageSignature = signature;
      record({
        type: "page-state",
        category: "navigation"
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

    record({
      type: "navigation",
      category: "navigation",
      from,
      to: location.href
    });
  }, 400);
})();
