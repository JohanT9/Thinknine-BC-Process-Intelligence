(() => {
  if (window.__T9_RECORDER_V2__) return;
  window.__T9_RECORDER_V2__ = true;

  let recording = false;
  let sessionId = null;
  let lastUrl = location.href;
  let lastPageSignature = "";
  const sourceFrameId = crypto.randomUUID();
  let sourceSequence = 0;
  const inputTimers = new WeakMap();
  const initialValues = new WeakMap();
  const observedDialogs = new Set();

  try {
    chrome.runtime.sendMessage({ type: "T9_GET_STATE" }, response => {
      if (chrome.runtime.lastError) return;
      recording = Boolean(response?.state?.recording);
      sessionId = response?.state?.sessionId || null;
    });
  } catch {
    // The extension context may be invalidated during an extension reload.
  }

  function sendPing() {
    try {
      chrome.runtime.sendMessage({
        type: "T9_PING",
        frameUrl: location.href
      }, () => {
        void chrome.runtime.lastError;
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
      sendResponse({ ok: true });
      return false;
    }

    if (message.type === "T9_CONTENT_PING") {
      sendResponse({
        ok: true,
        recording,
        sessionId,
        frameUrl: location.href,
        version: "2.0.1"
      });
      return false;
    }

    return false;
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

  function context() {
    return {
      pageId: getPageId(),
      pageCaption: getPageCaption(),
      documentTitle: clean(document.title, 250),
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

  function interactiveTarget(target) {
    if (!(target instanceof Element)) return null;

    return target.closest([
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
      '[role="row"]',
      '[role="gridcell"]',
      '[tabindex]'
    ].join(","));
  }

  function eventElement(event) {
    return event.composedPath?.().find(item => item instanceof Element) ||
      event.target;
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
    const ariaLabel = element?.getAttribute?.("aria-label") || "";
    const title = element?.getAttribute?.("title") || "";
    const placeholder = element?.getAttribute?.("placeholder") || "";
    const elementText = clean(element?.innerText || element?.textContent || "");
    const accessibleName = labelledText || ariaLabel || associatedLabel || elementText || title || placeholder || getLabel(element);
    const accessibleNameSource = labelledText ? "aria-labelledby" : ariaLabel
      ? "aria-label" : associatedLabel ? "label-for" : elementText
        ? "element-text" : title ? "title" : placeholder
          ? "placeholder" : "surrounding-label";
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
    if (!recording || !sessionId) return;

    try {
      const localSequence = ++sourceSequence;
      chrome.runtime.sendMessage({
        type: "T9_RECORD_EVENT",
        event: {
          sourceEventId: `${sessionId}:${sourceFrameId}:${localSequence}`,
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


  document.addEventListener("click", event => {
    const target = interactiveTarget(eventElement(event));
    if (!target) return;
    const category = categoryOf(target);
    const role = target.getAttribute?.("role") || "";
    const selectedElement = role === "row"
      ? target.querySelector?.('[role="gridcell"]') || target : target;
    const selectedCaption = category === "selection"
      ? clean(selectedElement?.innerText || selectedElement?.textContent || "")
      : "";

    record({
      type: "click",
      category,
      ...(selectedCaption ? { selectedValue: selectedCaption,
        selectedCaption } : {}),
      clientX: event.clientX,
      clientY: event.clientY,
      ...descriptor(target)
    });
  }, true);

  function emitField(element, source) {
    if (!(element instanceof Element)) return;

    record({
      type: "field-change",
      category: "field",
      fieldName: getLabel(element) || "Okänt fält",
      value: valueOf(element),
      previousValue: initialValues.has(element)
        ? initialValues.get(element)
        : undefined,
      inputSource: source,
      ...descriptor(element)
    });
  }

  document.addEventListener("input", event => {
    const element = eventElement(event);
    if (!(element instanceof Element)) return;

    clearTimeout(inputTimers.get(element));
    inputTimers.set(
      element,
      setTimeout(() => emitField(element, "input"), 600)
    );
  }, true);

  document.addEventListener("focusin", event => {
    const element = eventElement(event);
    if (!(element instanceof Element) ||
        !element.matches('input,textarea,select,[contenteditable="true"]')) return;
    initialValues.set(element, valueOf(element));
    record({ type: "focus", category: "lifecycle", value: valueOf(element),
      ...descriptor(element) });
  }, true);

  document.addEventListener("change", event => {
    const element = eventElement(event);
    if (element instanceof Element) {
      clearTimeout(inputTimers.get(element));
      emitField(element, "change");
    }
  }, true);

  document.addEventListener("focusout", event => {
    const element = eventElement(event);

    if (
      element instanceof Element &&
      element.matches('input,textarea,select,[contenteditable="true"]')
    ) {
      clearTimeout(inputTimers.get(element));
      emitField(element, "focusout");
      initialValues.delete(element);
    }
  }, true);

  document.addEventListener("keydown", event => {
    if (!["Enter", " ", "Spacebar", "Escape", "F4"].includes(event.key)) return;
    const eventTarget = eventElement(event);
    const target = interactiveTarget(eventTarget) || eventTarget;

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
