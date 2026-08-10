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
    return {
      role: element?.getAttribute?.("role") || element?.tagName?.toLowerCase() || "",
      controlType: element?.tagName?.toLowerCase() || "",
      automationId:
        element?.getAttribute?.("data-automation-id") ||
        element?.getAttribute?.("data-control-id") ||
        element?.getAttribute?.("data-control-name") ||
        "",
      label: textOf(element) || getLabel(element)
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
      chrome.runtime.sendMessage({
        type: "T9_RECORD_EVENT",
        event: {
          sourceEventId: crypto.randomUUID(),
          source: "business-central-content-script",
          sourceFrameId,
          sourceSequence: ++sourceSequence,
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
    const target = interactiveTarget(event.target);
    if (!target) return;

    record({
      type: "click",
      category: categoryOf(target),
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
      inputSource: source,
      ...descriptor(element)
    });
  }

  document.addEventListener("input", event => {
    const element = event.target;
    if (!(element instanceof Element)) return;

    clearTimeout(inputTimers.get(element));
    inputTimers.set(
      element,
      setTimeout(() => emitField(element, "input"), 600)
    );
  }, true);

  document.addEventListener("change", event => {
    if (event.target instanceof Element) {
      emitField(event.target, "change");
    }
  }, true);

  document.addEventListener("focusout", event => {
    const element = event.target;

    if (
      element instanceof Element &&
      element.matches('input,textarea,select,[contenteditable="true"]')
    ) {
      emitField(element, "focusout");
    }
  }, true);

  document.addEventListener("keydown", event => {
    if (!["Enter", "Escape", "F4"].includes(event.key)) return;

    record({
      type: "key",
      category: "interaction",
      key: event.key,
      fieldName: getLabel(event.target)
    });
  }, true);

  const observer = new MutationObserver(() => {
    document
      .querySelectorAll('[role="dialog"],[aria-modal="true"]')
      .forEach(dialog => {
        if (dialog.dataset.t9RecordedDialog === "1") return;

        dialog.dataset.t9RecordedDialog = "1";
        record({
          type: "dialog",
          category: "dialog",
          label: textOf(dialog).slice(0, 600)
        });
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
