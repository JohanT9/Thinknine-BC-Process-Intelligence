(() => {
  "use strict";
  // The recording shown beside Business Central: the document as it is recorded, in the
  // document's own words, and the changes the user can make to it while working; then saving it
  // and a summary of what was saved. It reads and changes the same recording as the toolbar popup
  // and the floating box in the page; the background worker owns the recording.
  //
  // Every change is a marker added to the recording (append-only), so nothing recorded is lost and
  // a change is undone by the opposite marker: include after ignore, no-section after new-section,
  // automatic image after a chosen one.
  const i18n = globalThis.T9UiI18n;
  const $ = id => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  // Opened by a start button. The panel carries out the start itself (start, tabId): Edge closes
  // the toolbar popup as soon as the panel opens, so a start left there would never finish.
  const startPurpose = params.get("start") === "bug-report" ? "bug-report"
    : params.get("start") ? "documentation" : "";
  const startTabId = Number(params.get("tabId")) || 0;
  const startNonce = params.get("nonce") || "";
  let startingUntil = params.get("starting") || startPurpose ? Date.now() + 180000 : 0;
  const REFRESH_MS = 1000;
  const TOAST_MS = 8000;
  const THUMB_WIDTH = 240;
  const MARK_ERRORS = Object.freeze({
    "no-image": "recPanel.noImageYet",
    "no-step": "recPanel.noStepYet",
    "no-recording": "recPanel.noRecording"
  });
  const ICONS = Object.freeze({
    section: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M2 4h12M2 8h12M2 12h7"/></svg>',
    ignore: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M2 8s2.2-4.5 6-4.5S14 8 14 8s-2.2 4.5-6 4.5S2 8 2 8z"/><circle cx="8" cy="8" r="1.8"/><path d="M2.5 13.5l11-11"/></svg>'
  });

  let locale = i18n.DEFAULT_LOCALE;
  let documentLanguage = "en-US";
  let view = "";
  let recordingSeen = false;
  let purpose = "process";
  let startedAt = 0;
  let busy = false;
  let refreshing = false;
  let completedId = "";
  let startError = "";
  let startRunning = false;

  // ---- The document as it is recorded ------------------------------------------------------
  let live = null;            // the steps as the background worker last interpreted them
  let liveFailed = false;
  let liveLoading = false;
  let liveSeq = 0;            // each request for the steps is numbered
  let settledAfter = 0;       // a request numbered above this shows every saved change
  let changesInFlight = 0;
  // A change shows at once; it is kept over the worker's steps until they include it.
  const overrides = new Map();
  let firstTitleOverride = null;
  let editing = null;         // the section being named: "first" or the key of the step before it
  let editingValue = null;
  let openTools = null;       // an earlier step whose tools are open; the latest step's always are
  let openPicker = null;      // the step whose images are shown to choose from
  const seenRuns = new Map();
  let arrivedKey = "";
  let updatedKey = "";
  let mergedKey = "";
  let renderedSignature = "";
  let rebuilding = false;     // the list is being replaced, which moves focus by itself
  const images = new Map();   // screenshot path → { state, url, at }

  const t = (key, values = {}) => i18n.format(key, values, locale);
  const show = (element, visible) => { element.hidden = !visible; };
  const setText = (element, value) => {
    const text = String(value ?? "");
    if (element.textContent !== text) element.textContent = text;
  };
  // A panel left open while the extension was updated or reloaded keeps showing, but can no
  // longer reach it. Loading the page again connects it to the extension as it is now; it is
  // done at most once a minute so a lasting fault cannot make the panel reload over and over.
  const RELOAD_KEY = "t9RecordingPanelReloadedAt";
  function disconnectedFromExtension(error) {
    return !chrome.runtime?.id || /context invalidated/i.test(String(error?.message || error || ""));
  }
  function reconnectPage() {
    let last = 0;
    try { last = Number(sessionStorage.getItem(RELOAD_KEY)) || 0; } catch {}
    if (Date.now() - last < 60000) return false;
    try { sessionStorage.setItem(RELOAD_KEY, String(Date.now())); } catch {}
    location.reload();
    return true;
  }
  // An answer that never comes must not hold up the panel: every request has a time limit.
  const SEND_TIMEOUT_MS = 8000;
  const send = (message, timeout = SEND_TIMEOUT_MS) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("technical.requestTimeout")), timeout);
    const finish = (fn, value) => { clearTimeout(timer); fn(value); };
    try {
      chrome.runtime.sendMessage(message, response => {
        if (chrome.runtime.lastError) finish(reject, new Error(chrome.runtime.lastError.message));
        else finish(resolve, response);
      });
    } catch (error) {
      if (disconnectedFromExtension(error)) reconnectPage();
      finish(reject, error);
    }
  });
  // Messages from the background worker are translated when they are known interface text.
  const errorText = (error, fallbackKey) => {
    const message = String(error?.message || error || "");
    return message ? t(message) : t(fallbackKey);
  };

  // While a panel is connected, the floating box in the Business Central page steps aside.
  function connect() {
    let port;
    try { port = chrome.runtime.connect({ name: "T9_RECORDING_PANEL" }); }
    catch (error) {
      if (disconnectedFromExtension(error) && reconnectPage()) return;
      setTimeout(connect, 2000);
      return;
    }
    chrome.windows.getCurrent().then(window => port.postMessage({ windowId: window.id }))
      .catch(() => {});
    port.onDisconnect.addListener(() => {
      void chrome.runtime.lastError;
      // The extension was updated or reloaded: this page belongs to the old one.
      if (disconnectedFromExtension() && reconnectPage()) return;
      setTimeout(connect, 1000);
    });
  }

  function formatElapsed() {
    if (!startedAt) return "";
    const total = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
    const hours = Math.floor(total / 3600);
    const minutes = String(Math.floor(total / 60) % 60).padStart(2, "0");
    const seconds = String(total % 60).padStart(2, "0");
    return hours ? `${hours}:${minutes}:${seconds}` : `${minutes}:${seconds}`;
  }

  function setState(textKey, state) {
    $("rpState").dataset.state = state;
    setText($("rpStateText"), t(textKey));
  }

  const INFO = Object.freeze({
    starting: ["recPanel.stateStarting", "recPanel.startingTitle", "recPanel.startingHelp"],
    idle: ["recPanel.stateNone", "recPanel.idleTitle", "recPanel.idleHelp"],
    ended: ["recPanel.stateNone", "recPanel.endedTitle", "recPanel.endedHelp"],
    test: ["recPanel.stateTest", "recPanel.testTitle", "recPanel.testHelp"],
    failed: ["recPanel.stateNone", "recPanel.startFailedTitle", ""]
  });

  // One view at a time: information, the live recording (with or without the save form),
  // work in progress, or the outcome.
  function setView(next) {
    if (view === next) return;
    const previous = view;
    view = next;
    $("recordingPanel").dataset.view = next;
    const info = INFO[next];
    const live = next === "recording" || next === "form";
    show($("rpInfo"), Boolean(info));
    // While saving, the form gets the whole panel so its buttons stay in view.
    show($("rpLive"), next === "recording");
    show($("rpFoot"), live || next === "busy" || next === "done");
    show($("rpRecordingActions"), next === "recording");
    show($("rpSaveForm"), next === "form");
    show($("rpBusy"), next === "busy");
    show($("rpDone"), next === "done");
    if (next !== "recording") hideToast();
    // The status line is shown while a recording runs; other views say it in their heading.
    show(document.querySelector(".rp-head"), live || next === "test");
    show($("rpTime"), live);
    show($("rpContext"), live);
    show($("rpCounts"), live);
    if (!live) { show($("rpWarning"), false); show($("rpCause"), false); }
    if (info) {
      setState(info[0], next === "test" ? "recording" : "idle");
      setText($("rpInfoTitle"), t(info[1]));
      setText($("rpInfoHelp"), info[2] ? t(info[2]) : startError);
      show($("rpOpenLibrary"), next === "ended");
      show($("rpRetry"), next === "failed");
    } else if (live) {
      setState(purpose === "bug" ? "recPanel.stateBug" : "recPanel.stateProcess", "recording");
    } else if (next === "done") {
      setState("recPanel.stateNone", "idle");
    }
    if (next === "form" && previous !== "form") {
      $("rpFormError").textContent = "";
      show($("rpConfirm"), false);
      $("rpDiscard").setAttribute("aria-expanded", "false");
      $("rpDocumentLanguage").value = documentLanguage;
      // The first section's name is usually what the whole document is about.
      if (!$("rpName").value.trim() && firstTitle()) $("rpName").value = firstTitle();
      $("rpName").focus();
      $("rpName").select();
    }
    if (next === "recording" && previous === "form") $("rpStop").focus();
  }

  function renderWarnings(liveStatus) {
    // The waiting line already says that no step has been recorded yet.
    const messages = (liveStatus?.warnings || []).filter(item => item.code !== "no-events-yet")
      .map(item => {
        const key = `recorder.warning.${item.code}`;
        const translated = item.code ? t(key) : "";
        return translated && translated !== key ? translated : item.message;
      }).filter(Boolean);
    show($("rpWarning"), messages.length > 0);
    setText($("rpWarning"), messages.join(" "));
  }

  function renderStatus(response) {
    const liveStatus = response.liveStatus || {};
    const context = [liveStatus.context?.environmentName, liveStatus.context?.companyName]
      .filter(Boolean).join(" · ");
    setText($("rpContext"), context || t("recorder.notIdentified"));
    const screenshots = liveStatus.screenshots || {};
    setText($("rpCounts"), t("recPanel.counts", { events: liveStatus.eventCount || 0,
      screenshots: screenshots.captured || 0 }) + (screenshots.pending
      ? t("recorder.pendingCount", { count: screenshots.pending }) : ""));
    renderWarnings(liveStatus);
    renderCause(response.session?.lastErrorCause);
  }

  // The latest error Business Central showed in a bug report recording, and its possible cause
  // when the message gives one. The report has the whole suggestion, with what to check.
  let causeShown = "";
  function renderCause(latest) {
    const causeApi = globalThis.T9ErrorCause;
    const shown = purpose === "bug" && Boolean(latest?.errorEvidenceId);
    show($("rpCause"), shown);
    // The panel refreshes every second; a screen reader announces the box only for a new error.
    const shownKey = shown ? `${latest.errorEvidenceId}|${locale}` : "";
    if (shownKey === causeShown) return;
    causeShown = shownKey;
    if (!shown) return;
    const described = latest.cause && causeApi?.describe(latest.cause, locale);
    const labels = causeApi?.labels(locale) || {};
    setText($("rpCauseTitle"), t("recPanel.errorSeen"));
    const text = $("rpCauseText");
    text.replaceChildren();
    if (described) {
      const title = document.createElement("strong");
      title.textContent = labels.title;
      const tag = document.createElement("span");
      tag.className = "rp-cause-tag";
      tag.textContent = labels.unconfirmed;
      text.append(title, tag, document.createElement("br"), described.text);
    }
    show(text, Boolean(described));
    setText($("rpCauseOrigin"), described?.origin ? `${labels.origin}: ${described.origin}` : "");
    show($("rpCauseOrigin"), Boolean(described?.origin));
    setText($("rpCauseNote"), t(described ? "recPanel.causeNote" : "recPanel.errorSaved"));
  }

  // ---- Steps and sections as they stand, with changes not yet interpreted ------------------
  function currentSteps() {
    return (live?.steps || []).map(step => ({ ...step, ...(overrides.get(step.key) || {}) }));
  }
  function firstTitle() {
    return firstTitleOverride ?? String(live?.firstSectionTitle || "");
  }
  const plainText = step => (step.runs || []).map(run => run.text).join("");
  function numbering(steps) {
    const numbers = new Map();
    let number = 0;
    for (const step of steps) if (!step.ignored) numbers.set(step.key, ++number);
    return numbers;
  }
  function sections(steps) {
    const list = [{ key: "first", title: firstTitle(), steps: [] }];
    for (const step of steps) {
      list.at(-1).steps.push(step);
      if (step.sectionAfter) list.push({ key: step.key, title: step.sectionTitle || "", steps: [] });
    }
    return list;
  }

  function acceptLive(next) {
    const known = new Set((live?.steps || []).map(step => step.key));
    // Steps written in another document language are not steps that changed.
    if (live && next.language !== live.language) seenRuns.clear();
    let arrived = "";
    for (const step of next.steps || []) {
      const runs = JSON.stringify(step.runs || []);
      const before = seenRuns.get(step.key);
      // The same step written differently: more events made it one step with what came before.
      if (before !== undefined && before !== runs) { updatedKey = step.key; mergedKey = step.key; }
      seenRuns.set(step.key, runs);
      if (!known.has(step.key)) arrived = step.key;
    }
    if (arrived && live) {
      arrivedKey = arrived;
      if (mergedKey !== updatedKey) mergedKey = "";
      if (openTools && !document.activeElement?.closest?.(`[data-key="${CSS.escape(openTools)}"]`)) {
        openTools = null;
      }
    }
    live = next;
  }

  async function loadLive() {
    if (liveLoading || view !== "recording" && view !== "form") return;
    liveLoading = true;
    const seq = ++liveSeq;
    try {
      const response = await send({ type: "T9_GET_LIVE_STEPS", language: documentLanguage }, 20000);
      if (!response?.ok) {
        liveFailed = response?.code === "live-steps-failed";
        return;
      }
      liveFailed = false;
      // A reading requested after the last change was saved includes it.
      if (!response.live.updating && seq > settledAfter && !changesInFlight) {
        overrides.clear();
        firstTitleOverride = null;
      }
      acceptLive(response.live);
    } catch {
      // The worker may be restarting; the next refresh tries again.
    } finally {
      liveLoading = false;
      render();
    }
  }

  // ---- Screenshots, made small for the panel ------------------------------------------------
  let imageTimer = 0;
  const imageQueue = new Set();
  function imageUrl(path) {
    if (!path) return "";
    const entry = images.get(path);
    // A screenshot still being saved is asked for again a moment later.
    if (!entry || entry.state === "missing" && Date.now() - entry.at > 3000) {
      images.set(path, { state: "loading" });
      imageQueue.add(path);
      clearTimeout(imageTimer);
      imageTimer = setTimeout(() => { void loadImages(); }, 50);
      return "";
    }
    return entry.url || "";
  }
  function shrink(dataUrl) {
    return new Promise(resolve => {
      const image = new Image();
      image.onload = () => {
        try {
          const scale = Math.min(1, THUMB_WIDTH / (image.naturalWidth || THUMB_WIDTH));
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
          canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
          canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.82));
        } catch { resolve(dataUrl); }
      };
      image.onerror = () => resolve("");
      image.src = dataUrl;
    });
  }
  async function loadImages() {
    const batch = [...imageQueue].slice(0, 12);
    batch.forEach(path => imageQueue.delete(path));
    if (!batch.length) return;
    try {
      const response = await send({ type: "T9_GET_LIVE_STEP_IMAGES", paths: batch }, 20000);
      for (const path of batch) {
        const data = response?.screenshots?.[path];
        const url = data ? await shrink(data) : "";
        images.set(path, url ? { state: "ready", url } : { state: "missing", at: Date.now() });
      }
    } catch {
      for (const path of batch) images.set(path, { state: "missing", at: Date.now() });
    }
    render();
    if (imageQueue.size) imageTimer = setTimeout(() => { void loadImages(); }, 50);
  }

  // ---- Rendering ----------------------------------------------------------------------------
  function el(tag, attributes = {}, ...children) {
    const node = document.createElement(tag);
    for (const [name, value] of Object.entries(attributes)) {
      if (value === null || value === undefined || value === false) continue;
      if (name === "class") node.className = value;
      else if (name === "text") node.textContent = value;
      else if (name === "html") node.innerHTML = value; // only the fixed icons above
      else node.setAttribute(name, value === true ? "" : String(value));
    }
    node.append(...children.filter(child => child !== null && child !== undefined && child !== false));
    return node;
  }

  function runsNode(runs) {
    return el("p", { class: "rp-text" }, ...(runs || []).map(run => {
      const text = document.createTextNode(run.text);
      if (run.bold && run.italic) return el("strong", {}, el("em", {}, text));
      if (run.bold) return el("strong", {}, text);
      if (run.italic) return el("em", {}, text);
      return text;
    }));
  }

  function sectionRow(section, number, removable) {
    const name = section.title || t("recPanel.sectionNumber", { number });
    if (editing === section.key) {
      const input = el("input", { id: "rpSecInput", maxlength: 80, autocomplete: "off",
        "aria-label": t("recPanel.sectionInputLabel", { number }),
        placeholder: t("recPanel.sectionPlaceholder") });
      input.value = editingValue ?? section.title;
      return el("div", { class: "rp-sec" }, el("form", { class: "rp-sec-edit", "data-section": section.key },
        input, el("button", { type: "submit", text: t("recPanel.sectionDone") })));
    }
    return el("div", { class: "rp-sec" },
      el("p", { class: "rp-sec-name", "data-unnamed": !section.title, text: name }),
      el("button", { type: "button", class: "rp-textbtn", "data-act": "rename", "data-key": section.key,
        "aria-label": section.title ? t("recPanel.sectionRenameLabel", { name })
          : t("recPanel.sectionInputLabel", { number }),
        text: t(section.title ? "recPanel.sectionRename" : "recPanel.sectionName") }),
      removable ? el("button", { type: "button", class: "rp-textbtn", "data-act": "remove-section",
        "data-key": section.key, "aria-label": t("recPanel.sectionRemoveLabel", { name }),
        text: t("recPanel.sectionRemove") }) : null);
  }

  function thumbnail(step, number) {
    const count = step.images.length;
    if (!count) return null;
    const url = imageUrl(step.shownPath);
    return el("button", { type: "button", class: "rp-thumb", "data-act": "picker", "data-key": step.key,
      "data-chosen": Boolean(step.chosenAssetId),
      "aria-label": count > 1 ? t("recPanel.thumbChooseLabel", { number, count })
        : t("recPanel.thumbLabel", { number }),
      "aria-expanded": count > 1 ? String(openPicker === step.key) : null },
    url ? el("img", { src: url, alt: "" }) : null,
    count > 1 ? el("span", { class: "rp-count", "aria-hidden": "true", text: count }) : null);
  }

  function picker(step) {
    if (openPicker !== step.key || step.images.length < 2 || step.ignored) return null;
    const shown = step.chosenAssetId || step.images.find(image => image.path === step.shownPath)?.assetId;
    return el("div", { class: "rp-picker" },
      el("p", { text: t("recPanel.pickerHelp", { count: step.images.length }) }),
      el("div", { class: "rp-picks" }, ...step.images.map((image, index) => {
        const url = imageUrl(image.path);
        return el("button", { type: "button", class: "rp-pick", "data-act": "pick", "data-key": step.key,
          "data-asset": image.assetId, "aria-pressed": String(image.assetId === shown),
          "aria-label": t("recPanel.pickerImage", { number: index + 1 }) },
        url ? el("img", { src: url, alt: "" }) : null);
      })),
      step.chosenAssetId ? el("button", { type: "button", class: "rp-textbtn", "data-act": "pick-auto",
        "data-key": step.key, text: t("recPanel.pickerAuto") }) : null);
  }

  function tools(step, number, latest) {
    if (step.ignored) {
      return el("div", { class: "rp-tools" },
        el("p", { class: "rp-ignored-note", text: t("recPanel.ignoredNote") }),
        el("button", { type: "button", class: "rp-chip", "data-act": "include", "data-key": step.key,
          "aria-label": t("recPanel.includeLabel", { step: plainText(step) }),
          text: t("recPanel.include") }));
    }
    if (!latest && openTools !== step.key) {
      return el("div", { class: "rp-tools" }, el("button", { type: "button", class: "rp-textbtn",
        "data-act": "open", "data-key": step.key, "aria-label": t("recPanel.changeLabel", { number }),
        text: t("recPanel.change") }));
    }
    return el("div", { class: "rp-tools", role: "group", "aria-label": t("recPanel.toolsLabel", { number }) },
      el("button", { type: "button", class: "rp-chip", "data-act": "section", "data-key": step.key,
        "aria-pressed": String(Boolean(step.sectionAfter)),
        "aria-label": t("recPanel.chipSectionLabel", { number }) },
      el("span", { html: ICONS.section }), t("recPanel.chipSection")),
      el("button", { type: "button", class: "rp-chip", "data-act": "ignore", "data-key": step.key,
        "aria-label": t("recPanel.chipIgnoreLabel", { number }) },
      el("span", { html: ICONS.ignore }), t("recPanel.chipIgnore")),
      latest ? null : el("button", { type: "button", class: "rp-textbtn", "data-act": "close",
        "data-key": step.key, text: t("recPanel.closeTools") }));
  }

  function stepCard(step, number, latest) {
    return el("article", { class: "rp-step", "data-key": step.key, "data-latest": latest,
      "data-ignored": Boolean(step.ignored), "data-arrived": arrivedKey === step.key,
      "data-updated": updatedKey === step.key,
      "aria-label": step.ignored ? t("recPanel.stepIgnoredLabel") : t("recPanel.stepLabel", { number }) },
    el("div", { class: "rp-step-main" },
      el("span", { class: "rp-num", "aria-hidden": "true", text: step.ignored ? "–" : number }),
      el("div", { class: "rp-step-copy" }, runsNode(step.runs),
        step.pageCaption ? el("p", { class: "rp-where", text: step.pageCaption }) : null,
        mergedKey === step.key ? el("p", { class: "rp-merged", text: t("recPanel.merged") }) : null,
        step.chosenAssetId ? el("span", { class: "rp-badge", text: t("recPanel.chosenBadge") }) : null),
      thumbnail(step, number)),
    picker(step), tools(step, number, latest));
  }

  function focusedControl() {
    const active = document.activeElement;
    if (!active || !$("rpList").contains(active)) return null;
    return { act: active.dataset.act, key: active.dataset.key, asset: active.dataset.asset };
  }
  function restoreFocus(target) {
    const input = $("rpSecInput");
    if (input) {
      if (document.activeElement !== input) input.focus();
      return;
    }
    if (!target?.key) return;
    const key = CSS.escape(target.key);
    const selector = target.asset ? `[data-asset="${CSS.escape(target.asset)}"][data-key="${key}"]`
      : `[data-act="${target.act}"][data-key="${key}"]`;
    ($("rpList").querySelector(selector) ||
      $("rpList").querySelector(`[data-key="${key}"] button`))?.focus();
  }

  function render() {
    if (view !== "recording" && view !== "form") return;
    const steps = currentSteps();
    const imageStates = steps.flatMap(step => [step.shownPath,
      ...(openPicker === step.key ? step.images.map(image => image.path) : [])])
      .map(path => images.get(path)?.state || "");
    const signature = JSON.stringify([locale, steps, firstTitle(), editing, openTools, openPicker,
      arrivedKey, updatedKey, mergedKey, imageStates, liveFailed, Boolean(live)]);
    if (signature === renderedSignature) return;
    renderedSignature = signature;
    // A name being typed is kept while new steps come in.
    if ($("rpSecInput")) editingValue = $("rpSecInput").value;
    const focus = focusedControl();
    const nearEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 120;
    const numbers = numbering(steps);
    const nodes = [];
    if (steps.length) {
      sections(steps).forEach((section, index) => {
        nodes.push(sectionRow(section, index + 1, index > 0));
        for (const step of section.steps) {
          nodes.push(stepCard(step, numbers.get(step.key) || 0, step === steps.at(-1)));
        }
      });
    }
    rebuilding = true;
    try { $("rpList").replaceChildren(...nodes); } finally { rebuilding = false; }
    setText($("rpWaitingText"), liveFailed && !steps.length ? t("recPanel.liveFailed")
      : t(steps.length ? "recPanel.waitingNext" : "recPanel.waitingFirst"));
    restoreFocus(focus);
    if (arrivedKey && nearEnd && !$("rpSecInput")) $("rpWaiting").scrollIntoView({ block: "end" });
    arrivedKey = "";
    updatedKey = "";
  }

  // ---- Changes, and taking them back -------------------------------------------------------
  let toastTimer = 0;
  let undoAction = null;
  function hideToast() {
    clearTimeout(toastTimer);
    undoAction = null;
    show($("rpToast"), false);
  }
  // A change can be undone until the next change: the user's attention is in Business Central.
  // A message without undo goes away by itself.
  function toast(text, undo = null, error = false) {
    clearTimeout(toastTimer);
    undoAction = undo;
    setText($("rpToastText"), text);
    $("rpToast").toggleAttribute("data-error", error);
    show($("rpUndo"), Boolean(undo));
    show($("rpToast"), true);
    if (!undo) toastTimer = setTimeout(() => show($("rpToast"), false), TOAST_MS);
  }

  // Shows a change at once and saves it as a marker; a change that cannot be saved is taken back.
  async function apply({ kind, step = null, override, sectionTitle, imageId }) {
    const first = kind === "first-section-title";
    const before = first ? firstTitleOverride : overrides.get(step.key);
    if (first) firstTitleOverride = override;
    else overrides.set(step.key, { ...(before || {}), ...override });
    render();
    changesInFlight += 1;
    try {
      const response = await send({ type: "T9_CAPTURE_GUIDANCE", kind,
        ...(step ? { targetSourceEventIds: step.sourceEventIds } : {}),
        ...(imageId ? { preferredScreenshotAssetId: imageId } : {}),
        ...(sectionTitle !== undefined ? { sectionTitle } : {}) });
      if (!response?.ok) throw Object.assign(new Error("not-saved"), { code: response?.code });
      settledAfter = liveSeq;
      return true;
    } catch (error) {
      if (first) firstTitleOverride = before;
      else if (before) overrides.set(step.key, before);
      else overrides.delete(step.key);
      toast(t(MARK_ERRORS[error?.code] || "recPanel.markFailed"), null, true);
      return false;
    } finally {
      changesInFlight -= 1;
      render();
      void loadLive();
    }
  }

  const stepByKey = key => currentSteps().find(step => step.key === key);
  const numberOf = step => numbering(currentSteps()).get(step.key) || 0;

  async function setIgnored(step, ignored) {
    const number = numberOf(step);
    if (ignored && openTools === step.key) openTools = null;
    const saved = await apply({ kind: ignored ? "ignore" : "include", step, override: { ignored } });
    if (!saved) return;
    const message = ignored ? t("recPanel.toastIgnored", { number })
      : t("recPanel.toastIncluded", { number: numberOf(stepByKey(step.key) || step) });
    toast(message, () => apply({ kind: ignored ? "include" : "ignore", step,
      override: { ignored: !ignored } }));
  }

  async function addSection(step) {
    editing = step.key;
    editingValue = "";
    const saved = await apply({ kind: "new-section", step, sectionTitle: "",
      override: { sectionAfter: true, sectionTitle: "" } });
    if (!saved) { editing = null; render(); return; }
    toast(t("recPanel.toastSection", { number: numberOf(step) }), () => {
      if (editing === step.key) editing = null;
      return apply({ kind: "no-section", step, override: { sectionAfter: false, sectionTitle: "" } });
    });
  }

  async function removeSection(step) {
    const title = step.sectionTitle || "";
    if (editing === step.key) editing = null;
    const saved = await apply({ kind: "no-section", step,
      override: { sectionAfter: false, sectionTitle: "" } });
    if (!saved) return;
    toast(t("recPanel.toastSectionRemoved"), () => apply({ kind: "new-section", step,
      sectionTitle: title, override: { sectionAfter: true, sectionTitle: title } }));
  }

  function nameSection(key) {
    const step = key === "first" ? null : stepByKey(key);
    const before = key === "first" ? firstTitle() : step?.sectionTitle || "";
    const change = name => key === "first"
      ? apply({ kind: "first-section-title", sectionTitle: name, override: name })
      : apply({ kind: "new-section", step, sectionTitle: name,
        override: { sectionAfter: true, sectionTitle: name } });
    return { before, step, change };
  }

  async function saveSectionName(key, value, quiet = false) {
    const title = String(value || "").replace(/\s+/gu, " ").trim().slice(0, 80);
    editing = null;
    editingValue = null;
    const { before, step, change } = nameSection(key);
    if (key !== "first" && !step) { render(); return; }
    if (title === before) { render(); restoreFocusTo(key); return; }
    const saved = await change(title);
    restoreFocusTo(key);
    if (!saved) return;
    if (quiet) return;
    toast(title ? t("recPanel.toastSectionNamed", { name: title }) : t("recPanel.toastSectionUnnamed"),
      () => change(before));
  }
  function restoreFocusTo(key) {
    $("rpList").querySelector(`[data-act="rename"][data-key="${CSS.escape(key)}"]`)?.focus();
  }

  async function chooseImage(step, assetId) {
    const before = step.chosenAssetId || null;
    if ((assetId || null) === before) { openPicker = null; render(); return; }
    const number = numberOf(step);
    const pathOf = id => step.images.find(image => image.assetId === id)?.path || "";
    const autoPath = step.images.at(-1)?.path || "";
    const pick = id => apply({ kind: id ? "use-image" : "auto-image", step, imageId: id || undefined,
      override: { chosenAssetId: id || null, shownPath: id ? pathOf(id) : autoPath } });
    openPicker = null;
    const saved = await pick(assetId);
    if (!saved) return;
    const index = step.images.findIndex(image => image.assetId === assetId);
    toast(assetId ? t("recPanel.toastImage", { number, image: index + 1 })
      : t("recPanel.toastImageAuto", { number }), () => pick(before));
  }

  function onListClick(event) {
    const button = event.target.closest("[data-act]");
    if (!button || !$("rpList").contains(button)) return;
    const key = button.dataset.key;
    const step = key === "first" ? null : stepByKey(key);
    const act = button.dataset.act;
    if (act === "rename") { editing = key; editingValue = null; render(); $("rpSecInput")?.select(); return; }
    if (!step) return;
    if (act === "remove-section") { void removeSection(step); return; }
    if (act === "open") { openTools = key; render(); return; }
    if (act === "close") { openTools = null; render(); return; }
    if (act === "picker") {
      if (step.images.length < 2) { toast(t("recPanel.oneImage", { number: numberOf(step) })); return; }
      openPicker = openPicker === key ? null : key;
      render();
      return;
    }
    if (act === "pick") { void chooseImage(step, button.dataset.asset); return; }
    if (act === "pick-auto") { void chooseImage(step, null); return; }
    if (act === "section") { void (step.sectionAfter ? removeSection(step) : addSection(step)); return; }
    if (act === "ignore") { void setIgnored(step, true); return; }
    if (act === "include") void setIgnored(step, false);
  }

  async function undo() {
    const action = undoAction;
    if (!action) return;
    hideToast();
    const saved = await action();
    if (saved) toast(t("recPanel.undone"));
    else toast(t("recPanel.undoFailed"), null, true);
  }

  // ---- Updates ------------------------------------------------------------------------------
  async function refresh() {
    if (busy || refreshing || view === "done") return;
    refreshing = true;
    try {
      const response = await send({ type: "T9_GET_STATE" });
      if (busy || view === "done") return;
      const state = response?.state || {};
      if (!state.recording) {
        setView(recordingSeen ? "ended" : startError ? "failed"
          : startingUntil > Date.now() ? "starting" : "idle");
        return;
      }
      recordingSeen = true;
      // A test recording belongs to its test and is stopped and compared there.
      if (state.testRunId) { setView("test"); return; }
      purpose = state.recordingPurpose === "bug-report" ? "bug" : "process";
      const started = typeof state.startedAt === "number" ? state.startedAt : Date.parse(state.startedAt || "");
      startedAt = Number.isFinite(started) ? started : 0;
      setText($("rpStop"), t(purpose === "bug" ? "recPanel.stopBug" : "recPanel.stopProcess"));
      if (view !== "form") setView("recording");
      else setState(purpose === "bug" ? "recPanel.stateBug" : "recPanel.stateProcess", "recording");
      setText($("rpTime"), formatElapsed());
      $("rpTime").setAttribute("aria-label", t("recPanel.elapsed", { time: formatElapsed() }));
      renderStatus(response);
      render();
      void loadLive();
    } catch {
      // The worker may be restarting; the next refresh tries again.
    } finally {
      refreshing = false;
    }
  }

  // ---- Starting the recording ---------------------------------------------------------------
  const recordingStart = globalThis.T9RecordingStart.create({
    send: (message, timeout) => send(message, timeout), t: key => t(key),
    tf: (key, values) => t(key, values), withTimeout: globalThis.T9AsyncOperations.withTimeout,
    licenseCheckTimeout: globalThis.T9TenantLicense.CHECK_TIMEOUT_MS + 5000 });

  async function runStart() {
    if (startRunning || !startPurpose || !startTabId) return;
    startRunning = true;
    startError = "";
    startingUntil = Date.now() + 180000;
    view = "";
    setView("starting");
    try {
      const tab = await chrome.tabs.get(startTabId);
      await recordingStart.startRecording({ purpose: startPurpose, tab,
        progress: key => setText($("rpInfoHelp"), t(key)) });
      void refresh();
    } catch (error) {
      // The panel says what went wrong and offers to try again; nothing was recorded yet.
      startError = errorText(error, "recorder.startFailed");
      view = "";
      setView("failed");
      $("rpRetry").focus();
    } finally {
      startRunning = false;
    }
  }

  // A start is carried out once, also if the panel is loaded again while it runs.
  function claimStart() {
    if (!startPurpose || !startNonce) return false;
    const key = `t9RecordingPanelStart:${startNonce}`;
    try {
      if (sessionStorage.getItem(key)) return false;
      sessionStorage.setItem(key, "1");
    } catch {}
    return true;
  }

  function startBusy(textKey) {
    busy = true;
    setText($("rpBusy"), t(textKey));
    setState("recPanel.stateSaving", "idle");
    setView("busy");
  }

  // What was saved, as the panel last showed it.
  function summaryOf(snapshot) {
    const kept = snapshot.steps.filter(step => !step.ignored);
    const boundaries = snapshot.steps.filter(step => step.sectionAfter);
    const hasSections = boundaries.length > 0 || Boolean(snapshot.firstTitle);
    const outline = [];
    if (hasSections) {
      const list = [{ title: snapshot.firstTitle, steps: [] }];
      for (const step of snapshot.steps) {
        if (!step.ignored) list.at(-1).steps.push(step);
        if (step.sectionAfter) list.push({ title: step.sectionTitle || "", steps: [] });
      }
      list.forEach((section, index) => outline.push({
        name: section.title || t("recPanel.sectionNumber", { number: index + 1 }),
        count: section.steps.length }));
    }
    // The list to paste: the kept steps in their document words, under their section names when
    // the document has sections.
    const list = hasSections
      ? sections(snapshot.steps).map((section, index) => ({
        title: (index === 0 ? snapshot.firstTitle : section.title) ||
          t("recPanel.sectionNumber", { number: index + 1 }),
        steps: section.steps.filter(step => !step.ignored).map(plainText) }))
        .filter(section => section.steps.length)
      : [{ title: "", steps: kept.map(plainText) }];
    return { steps: kept.length, sections: outline, images: kept.filter(step => step.shownPath).length,
      leftOut: snapshot.steps.length - kept.length, time: snapshot.time, list };
  }

  function renderSummary(summary) {
    const stat = (label, value) => el("div", {}, el("dt", { text: label }), el("dd", { text: value }));
    const nodes = [
      el("dl", { class: "rp-stats" },
        stat(t("recPanel.statSteps"), summary.steps),
        summary.sections.length ? stat(t("recPanel.statSections"), summary.sections.length) : null,
        stat(t("recPanel.statImages"), summary.images),
        summary.time ? stat(t("recPanel.statTime"), summary.time) : null),
      summary.leftOut ? el("p", { class: "rp-help", text: summary.leftOut === 1
        ? t("recPanel.leftOutOne") : t("recPanel.leftOut", { count: summary.leftOut }) }) : null
    ];
    $("rpSummary").replaceChildren(...nodes.filter(Boolean));
  }

  function showDone({ titleKey, name = "", helpKey = "", recordingId = "", summary = null }) {
    busy = false;
    completedId = recordingId;
    completedName = name;
    setView("done");
    setText($("rpDoneTitle"), t(titleKey));
    setText($("rpDoneName"), name);
    show($("rpDoneName"), Boolean(name));
    if (summary) renderSummary(summary);
    show($("rpSummary"), Boolean(summary));
    show($("rpDoneCheck"), Boolean(recordingId));
    // A saved document can be used at once; the help says that it can still be changed first.
    const help = recordingId ? "recPanel.footHelp" : helpKey;
    setText($("rpDoneHelp"), help ? t(help) : "");
    show($("rpDoneHelp"), Boolean(help));
    show($("rpOpenDocument"), Boolean(recordingId));
    resetResults(recordingId ? summary?.list || null : null);
    show($("rpResults"), Boolean(recordingId));
    $("rpDoneTitle").focus();
  }

  // ---- Using the saved document at once -----------------------------------------------------
  // Word export and making a test are the library's own: the library page is loaded out of sight
  // to do that one job for the saved document, and it says how it went. It stays loaded until the
  // browser has the file, which the page hands over.
  const PREVIEW_STEPS = 4;
  let completedName = "";
  let copyList = null;
  let copyExpanded = false;
  const jobs = new Map();
  window.addEventListener("message", event => {
    if (event.origin !== location.origin || event.data?.type !== "T9_PANEL_JOB") return;
    jobs.get(event.data.jobId)?.(event.data);
  });

  // onProgress gets each step a job reports before it is done, such as uploading a shared file.
  function libraryJob(kind, timeout, onProgress = () => {}) {
    const jobId = crypto.randomUUID();
    const frame = el("iframe", { class: "rp-job", "aria-hidden": "true", tabindex: "-1",
      src: `dashboard.html?panelJob=${kind}&projectId=${encodeURIComponent(completedId)}&jobId=${jobId}` });
    const done = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("technical.requestTimeout")), timeout);
      jobs.set(jobId, data => {
        if (data.progress) { onProgress(data); return; }
        clearTimeout(timer);
        if (data.ok) resolve(data);
        else reject(new Error(data.error || ""));
      });
    });
    document.body.append(frame);
    return { done, remove: () => { jobs.delete(jobId); frame.remove(); } };
  }

  // A file counts as saved only when the browser says so; the name is the one it was saved under.
  const DOWNLOAD_STOPPED = "recPanel.downloadStopped";
  function downloadFinished(downloadId) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const settle = item => {
        if (settled || !item) return;
        if (item.state === "complete") {
          settled = true;
          chrome.downloads.onChanged.removeListener(onChanged);
          resolve(String(item.filename || "").split(/[\\/]/).pop());
        } else if (item.state === "interrupted") {
          settled = true;
          chrome.downloads.onChanged.removeListener(onChanged);
          reject(new Error(DOWNLOAD_STOPPED));
        }
      };
      const check = () => chrome.downloads.search({ id: downloadId })
        .then(([item]) => settle(item)).catch(() => {});
      const onChanged = delta => { if (delta.id === downloadId && delta.state) void check(); };
      chrome.downloads.onChanged.addListener(onChanged);
      void check();
    });
  }

  // What the error says, as a sentence, or that the cause is not known.
  function causeOf(error) {
    const text = errorText(error, "recPanel.noCause").trim();
    return /[.!?…]$/.test(text) ? text : `${text}.`;
  }

  function setStatus(id, kind, text, action = null) {
    const node = $(id);
    node.dataset.kind = kind === "busy" ? "" : kind;
    if (!text) { node.replaceChildren(); return; }
    node.replaceChildren(...[kind === "busy" ? el("span", { class: "rp-spin", "aria-hidden": "true" }) : null,
      el("span", {}, text, action)].filter(Boolean));
  }

  function showInFolder(downloadId) {
    const button = el("button", { type: "button", text: t("recPanel.showInFolder") });
    button.addEventListener("click", () => { try { chrome.downloads.show(downloadId); } catch {} });
    return button;
  }

  function resetResults(list) {
    copyList = list && list.some(section => section.steps.length) ? list : null;
    copyExpanded = false;
    for (const id of ["rpWordStatus", "rpTestStatus", "rpCopyStatus"]) setStatus(id, "", "");
    $("rpShare").hidden = true;
    $("rpShare").replaceChildren();
    $("rpShareAction").setAttribute("aria-expanded", "false");
    for (const id of ["rpWord", "rpTest", "rpListCard"]) delete $(id).dataset.state;
    const word = $("rpWordAction");
    word.disabled = false;
    word.classList.add("primary");
    setText(word, t("recPanel.wordAction"));
    $("rpTestAction").disabled = false;
    $("rpScriptAction").disabled = false;
    show($("rpListCard"), Boolean(copyList));
    renderCopyList();
  }

  function renderCopyList() {
    if (!copyList) return;
    const total = copyList.reduce((sum, section) => sum + section.steps.length, 0);
    const items = [];
    let shown = 0;
    for (const section of copyList) {
      if (!copyExpanded && shown >= PREVIEW_STEPS) break;
      if (section.title) items.push(el("li", { class: "rp-copy-sec", text: section.title }));
      for (const text of section.steps) {
        if (!copyExpanded && shown >= PREVIEW_STEPS) break;
        items.push(el("li", {}, el("span", { text })));
        shown++;
      }
    }
    $("rpCopyList").replaceChildren(...items);
    const more = $("rpCopyMore");
    show(more, total > PREVIEW_STEPS);
    setText(more, copyExpanded ? t("recPanel.showFewer") : t("recPanel.showAll", { count: total }));
    more.setAttribute("aria-expanded", String(copyExpanded));
  }

  // Numbered through the whole document, a blank line between sections.
  function copyText() {
    let number = 0;
    return copyList.map(section => [section.title,
      ...section.steps.map(text => `${++number}. ${text}`)].filter(Boolean).join("\n")).join("\n\n");
  }

  // The clipboard can refuse a page that does not have the focus; copying a selection still works.
  async function writeClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {}
    const area = el("textarea", { class: "rp-job", "aria-hidden": "true", tabindex: "-1", readonly: true });
    area.value = text;
    document.body.append(area);
    area.select();
    const copied = document.execCommand("copy");
    area.remove();
    $("rpCopyAction").focus();
    if (!copied) throw new Error("copy");
  }

  async function copySteps() {
    const total = copyList.reduce((sum, section) => sum + section.steps.length, 0);
    try {
      await writeClipboard(copyText());
      $("rpListCard").dataset.state = "done";
      setStatus("rpCopyStatus", "ok", total === 1 ? t("recPanel.copiedOne") : t("recPanel.copied", { count: total }));
    } catch {
      // The whole list is shown so it can be selected and copied by hand.
      copyExpanded = true;
      renderCopyList();
      setStatus("rpCopyStatus", "error", t("recPanel.copyFailed"));
    }
  }

  async function exportWord() {
    const button = $("rpWordAction");
    button.disabled = true;
    delete $("rpWord").dataset.state;
    setStatus("rpWordStatus", "busy", t("recPanel.wordCreating"));
    const job = libraryJob("export-word", 300000);
    try {
      const result = await job.done;
      setStatus("rpWordStatus", "busy", t("recPanel.handedOver"));
      const fileName = await downloadFinished(result.downloadId);
      $("rpWord").dataset.state = "done";
      button.classList.remove("primary");
      setText(button, t("recPanel.downloadAgain"));
      setStatus("rpWordStatus", "ok", t("recPanel.savedFile", { fileName }), showInFolder(result.downloadId));
    } catch (error) {
      setStatus("rpWordStatus", "error", error?.message === DOWNLOAD_STOPPED ? t(DOWNLOAD_STOPPED)
        : t("recPanel.wordFailed", { detail: causeOf(error) }));
      setText(button, t("recPanel.retry"));
    } finally {
      job.remove();
      button.disabled = false;
    }
  }

  // Share link: the Word file in the user's own OneDrive and a link people in the organization
  // can read. The first click says where the file goes and who can read it; Share sends it. The
  // library page does the work out of sight, as for the Word file, and the link is shown and
  // copied only once OneDrive has confirmed it.
  const GRAPH = { origins: ["https://graph.microsoft.com/*"] };
  let shareBusy = false;
  function shareButton(text, onClick, primary = false) {
    const button = el("button", { type: "button", class: primary ? "primary" : "rp-textbtn", text });
    button.addEventListener("click", onClick);
    return button;
  }
  function closeShare() {
    $("rpShare").hidden = true;
    $("rpShare").replaceChildren();
    $("rpShareAction").setAttribute("aria-expanded", "false");
    $("rpShareAction").focus();
  }
  function showShareIntro() {
    if (shareBusy) return;
    const status = el("div", { id: "rpShareStatus", class: "rp-r-status", role: "status", "aria-live": "polite" });
    const go = shareButton(t("share.submit"), () => { void shareLink(go, status); }, true);
    $("rpShare").replaceChildren(el("p", { text: t("share.intro") }),
      el("p", { class: "rp-r-help", text: t("share.firstTime") }),
      el("div", { class: "rp-r-actions" }, go, shareButton(t("folder.cancel"), closeShare)), status);
    $("rpShare").hidden = false;
    $("rpShareAction").setAttribute("aria-expanded", "true");
    go.focus();
  }
  function showShareLink(result) {
    const field = el("input", { type: "text", readonly: true, value: result.link,
      "aria-label": t("share.linkLabel") });
    const status = el("div", { class: "rp-r-status", role: "status", "aria-live": "polite" });
    const copy = async () => {
      try { await navigator.clipboard.writeText(result.link); return true; }
      catch { field.select(); return false; }
    };
    const copyButton = shareButton(t("share.copy"), async () => {
      setStatusNode(status, "ok", t(await copy() ? "share.copied" : "share.copyManual"));
    }, true);
    $("rpShare").replaceChildren(el("p", { text: t(result.wasShared ? "share.updated" : "share.shared") }),
      el("div", { class: "rp-share-link" }, field, copyButton,
        shareButton(t("share.open"), () => { window.open(result.link, "_blank", "noopener"); })),
      el("p", { class: "rp-r-help", text: t("share.meta", { date: new Intl.DateTimeFormat(locale,
        { dateStyle: "medium", timeStyle: "short" }).format(new Date()), file: result.file }) }), status);
    void copy().then(copied => setStatusNode(status, "ok", [t(copied ? "share.copied" : "share.copyManual"),
      result.linkChanged ? t("share.linkChanged") : ""].filter(Boolean).join(" ")));
    copyButton.focus();
  }
  function setStatusNode(node, kind, text) {
    node.dataset.kind = kind === "busy" ? "" : kind;
    node.replaceChildren(...[kind === "busy" ? el("span", { class: "rp-spin", "aria-hidden": "true" }) : null,
      el("span", {}, text)].filter(Boolean));
  }
  async function shareLink(button, status) {
    if (shareBusy) return;
    shareBusy = true;
    button.disabled = true;
    setStatusNode(status, "busy", t("share.creating"));
    let job = null;
    try {
      // Asked for directly from the click, before anything else, as for Outlook.
      if (!await chrome.permissions.request(GRAPH)) throw new Error(t("share.errorPermission"));
      job = libraryJob("share-link", 300000, data => setStatusNode(status, "busy", data.text || t("share.creating")));
      showShareLink(await job.done);
    } catch (error) {
      setStatusNode(status, "error", error?.message || t("share.errorFailed"));
      setText(button, t("share.retry"));
      button.disabled = false;
    } finally {
      job?.remove();
      shareBusy = false;
    }
  }

  // The test opens in this panel, beside Business Central, where it is recorded and checked.
  async function startTest() {
    const button = $("rpTestAction");
    button.disabled = true;
    setStatus("rpTestStatus", "busy", t("recPanel.testCreating"));
    const job = libraryJob("run-test", 120000);
    try {
      const { testRunId } = await job.done;
      const path = `test-panel.html?testRunId=${encodeURIComponent(testRunId)}`;
      await chrome.sidePanel?.setOptions?.({ enabled: true, path }).catch(() => {});
      location.href = path;
    } catch (error) {
      setStatus("rpTestStatus", "error", t("recPanel.testFailed", { detail: causeOf(error) }));
      button.disabled = false;
    } finally {
      job.remove();
    }
  }

  async function exportScript() {
    const button = $("rpScriptAction");
    button.disabled = true;
    setStatus("rpTestStatus", "busy", t("pageScript.exportCreating", { title: completedName }));
    let url = "";
    try {
      const response = await send({ type: "T9_BUILD_PAGE_SCRIPT", sessionId: completedId }, 60000);
      if (!response?.ok) throw new Error(response?.error || "");
      if (!response.stepCount) {
        setStatus("rpTestStatus", "warn", t(response.recordedIdentity ? "pageScript.exportEmpty"
          : "pageScript.exportNotRecorded", { title: completedName }));
        return;
      }
      url = URL.createObjectURL(new Blob([response.content], { type: "text/yaml" }));
      const download = await send({ type: "T9_DOWNLOAD_FILE", url, filename: response.fileName }, 30000);
      if (!download?.ok) throw new Error(download?.error || "");
      setStatus("rpTestStatus", "busy", t("recPanel.handedOver"));
      const fileName = await downloadFinished(download.downloadId);
      const skipped = response.skipped || [];
      const names = skipped.slice(0, 5).map(item => item.label || "?").join("; ") +
        (skipped.length > 5 ? "; …" : "");
      const text = [t("recPanel.savedFile", { fileName }),
        response.stepCount === 1 ? t("recPanel.scriptStepsOne") : t("recPanel.scriptSteps", { count: response.stepCount }),
        skipped.length ? t("recPanel.scriptSkipped", { skipped: skipped.length, steps: names }) : "",
        response.dependentCount === 1 ? t("pageScript.dependentSkippedOne")
          : response.dependentCount > 1 ? t("pageScript.dependentSkipped", { count: response.dependentCount }) : ""]
        .filter(Boolean).join(" ");
      setStatus("rpTestStatus", skipped.length ? "warn" : "ok", text, showInFolder(download.downloadId));
    } catch (error) {
      setStatus("rpTestStatus", "error", error?.message === DOWNLOAD_STOPPED ? t(DOWNLOAD_STOPPED)
        : t("pageScript.exportFailed", { detail: causeOf(error) }));
    } finally {
      if (url) setTimeout(() => URL.revokeObjectURL(url), 60000);
      button.disabled = false;
    }
  }

  async function stop() {
    if (purpose !== "bug") { setView("form"); return; }
    // An issue report is created and opened at once; its name comes from the report.
    startBusy("recorder.creatingReport");
    try {
      const response = await send({ type: "T9_FINISH_BUG_RECORDING", name: "",
        documentLanguage: globalThis.T9LanguageRegistry.normalize(documentLanguage, "document") },
        240000);
      if (!response?.ok) throw new Error(response?.error || "recorder.stopFailed");
      showDone({ titleKey: "recorder.reportOpened" });
    } catch (error) {
      busy = false;
      setView("recording");
      toast(errorText(error, "recorder.stopFailed"), null, true);
    }
  }

  async function save(event) {
    event.preventDefault();
    const name = $("rpName").value.trim();
    if (!name) {
      $("rpFormError").textContent = t("recPanel.nameRequired");
      $("rpName").setAttribute("aria-invalid", "true");
      $("rpName").focus();
      return;
    }
    $("rpName").removeAttribute("aria-invalid");
    const language = globalThis.T9LanguageRegistry.normalize($("rpDocumentLanguage").value, "document");
    const snapshot = live ? { steps: currentSteps(), firstTitle: firstTitle(), time: formatElapsed() } : null;
    startBusy("recorder.stopping");
    try {
      const response = await send({ type: "T9_STOP", name, documentLanguage: language }, 240000);
      if (!response?.ok) throw new Error(response?.error || "recorder.stopFailed");
      const recordingId = response.session?.id || "";
      if (snapshot) {
        showDone({ titleKey: "recPanel.doneTitle", name: response.session?.name || name,
          recordingId, summary: summaryOf(snapshot) });
      } else {
        showDone({ titleKey: "recPanel.savedTitle", name: response.session?.name || name,
          helpKey: "recorder.completionHelp", recordingId });
      }
    } catch (error) {
      // The recording is still running, so nothing is lost: the form is shown again.
      busy = false;
      view = "";
      setView("form");
      $("rpFormError").textContent = errorText(error, "recorder.stopFailed");
    }
  }

  async function discard() {
    startBusy("recorder.discarding");
    try {
      const response = await send({ type: "T9_CANCEL_RECORDING" }, 30000);
      if (!response?.ok) throw new Error(response?.error || "recorder.cancelFailed");
      showDone({ titleKey: "recorder.discarded" });
    } catch (error) {
      busy = false;
      view = "";
      setView("form");
      $("rpFormError").textContent = errorText(error, "recorder.cancelFailed");
    }
  }

  function toggleConfirm(open) {
    show($("rpConfirm"), open);
    $("rpDiscard").setAttribute("aria-expanded", String(open));
    (open ? $("rpDiscardNo") : $("rpDiscard")).focus();
  }

  function openLibrary(query = "") {
    void chrome.tabs.create({ url: chrome.runtime.getURL(`dashboard.html${query}`) });
  }

  function bindList() {
    const list = $("rpList");
    list.addEventListener("click", onListClick);
    list.addEventListener("submit", event => {
      const form = event.target.closest("[data-section]");
      if (!form) return;
      event.preventDefault();
      void saveSectionName(form.dataset.section, $("rpSecInput")?.value);
    });
    list.addEventListener("input", event => {
      if (event.target.id === "rpSecInput") editingValue = event.target.value;
    });
    list.addEventListener("keydown", event => {
      if (event.key !== "Escape" || !editing) return;
      event.stopPropagation();
      const key = editing;
      editing = null;
      editingValue = null;
      render();
      restoreFocusTo(key);
    });
    // Leaving the name field keeps what was written; an empty name keeps the numbered name.
    list.addEventListener("focusout", event => {
      if (event.target.id !== "rpSecInput" || !editing) return;
      if (event.relatedTarget && event.target.form?.contains(event.relatedTarget)) return;
      // Rebuilding the list moves focus too; only the user leaving the field saves it.
      if (rebuilding || !document.hasFocus()) return;
      void saveSectionName(editing, event.target.value, true);
    });
  }

  async function start() {
    try {
      const response = await send({ type: "T9_GET_SETTINGS" });
      locale = i18n.apply(response?.settings?.uiLocale);
      documentLanguage = globalThis.T9LanguageRegistry.normalize(
        response?.settings?.documentLanguage, "document");
    } catch { locale = i18n.apply(locale); }
    document.title = t("recPanel.pageTitle");
    // The panel's own words follow a change of interface language made elsewhere, and its
    // steps a change of document language.
    chrome.storage.onChanged.addListener(async (changes, area) => {
      if (area !== "local" || !Object.keys(changes).some(key => /setting/i.test(key))) return;
      try {
        const response = await send({ type: "T9_GET_SETTINGS" });
        const next = i18n.normalizeLocale(response?.settings?.uiLocale);
        const nextDocument = globalThis.T9LanguageRegistry.normalize(
          response?.settings?.documentLanguage, "document");
        if (next === locale && nextDocument === documentLanguage) return;
        documentLanguage = nextDocument;
        locale = i18n.apply(next);
        document.title = t("recPanel.pageTitle");
        const current = view;
        view = "";
        setView(current || "starting");
        void refresh();
      } catch {}
    });
    bindList();
    $("rpUndo").addEventListener("click", () => { void undo(); });
    $("rpStop").addEventListener("click", () => { void stop(); });
    $("rpContinue").addEventListener("click", () => setView("recording"));
    $("rpSaveForm").addEventListener("submit", event => { void save(event); });
    $("rpName").addEventListener("input", () => {
      $("rpFormError").textContent = "";
      $("rpName").removeAttribute("aria-invalid");
    });
    $("rpDiscard").addEventListener("click", () => toggleConfirm($("rpConfirm").hidden));
    $("rpDiscardNo").addEventListener("click", () => toggleConfirm(false));
    $("rpDiscardYes").addEventListener("click", () => { void discard(); });
    $("rpOpenDocument").addEventListener("click", () =>
      openLibrary(`?openReview=${encodeURIComponent(completedId)}`));
    $("rpOpenLibrary").addEventListener("click", () => openLibrary());
    $("rpWordAction").addEventListener("click", () => { void exportWord(); });
    $("rpShareAction").addEventListener("click", () => {
      if ($("rpShare").hidden) showShareIntro(); else if (!shareBusy) closeShare();
    });
    $("rpTestAction").addEventListener("click", () => { void startTest(); });
    $("rpScriptAction").addEventListener("click", () => { void exportScript(); });
    $("rpCopyAction").addEventListener("click", () => { void copySteps(); });
    $("rpCopyMore").addEventListener("click", () => { copyExpanded = !copyExpanded; renderCopyList(); });
    $("rpCloseInfo").addEventListener("click", () => window.close());
    $("rpRetry").addEventListener("click", () => { void runStart(); });
    $("rpCloseDone").addEventListener("click", () => window.close());
    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && view === "form") {
        if (!$("rpConfirm").hidden) toggleConfirm(false);
        else setView("recording");
      }
    });
    setView(startingUntil > Date.now() ? "starting" : "idle");
    // The updates run on their own timer, so one slow answer never stops the next.
    setInterval(() => { void refresh(); }, REFRESH_MS);
    await refresh();
    if (!recordingSeen && claimStart()) void runStart();
  }

  // Connected before anything else, so the floating box steps aside even while the panel
  // is still loading its settings.
  if (disconnectedFromExtension() && reconnectPage()) return;
  connect();
  void start();
})();
