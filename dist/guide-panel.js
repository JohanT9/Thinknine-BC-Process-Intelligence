(() => {
  "use strict";
  // Visa mig: a document worked through beside Business Central, one step at a time. The panel
  // names the step's field or button to the Business Central tab shown in this window
  // (recorder/guide-overlay.js), which outlines it and says when the user has done the step;
  // the guide then moves on by itself. The user can always move on or back themselves.
  // The panel never takes the keyboard from Business Central when it moves on: the user may
  // be typing in the next field already.
  const projectId = new URLSearchParams(location.search).get("projectId") || "";
  const i18n = globalThis.T9UiI18n;
  const $ = id => document.getElementById(id);
  let locale = i18n.DEFAULT_LOCALE;
  let guide = null;
  let index = 0;
  let token = "";
  let counter = 0;
  let port = null;
  let tab = null;           // the Business Central tab shown in this window, or null
  let connectedAt = 0;
  let lastDone = 0;         // the number of the step done last, for the note
  const frames = new Map(); // what each frame of the tab last said about the step
  const t = (key, values = {}) => Object.entries(values).reduce((value, [name, item]) =>
    value.replaceAll(`{${name}}`, String(item)), i18n.translate(key, locale));
  const send = payload => new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(payload, response => {
      if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
      else if (!response?.ok) reject(new Error(response?.error || ""));
      else resolve(response);
    });
  });
  const isBusinessCentral = url => /^https:\/\/([\w-]+\.)*businesscentral\.dynamics\.com\//u.test(String(url || ""));

  // The guide is made by the library page, in a hidden frame, as the document is exported.
  const jobs = new Map();
  window.addEventListener("message", event => {
    if (event.origin !== location.origin || event.data?.type !== "T9_PANEL_JOB") return;
    jobs.get(event.data.jobId)?.(event.data);
  });
  function libraryJob(kind, timeout) {
    const jobId = crypto.randomUUID();
    const frame = document.createElement("iframe");
    frame.hidden = true;
    frame.setAttribute("aria-hidden", "true");
    frame.tabIndex = -1;
    frame.src = `dashboard.html?panelJob=${kind}&projectId=${encodeURIComponent(projectId)}&jobId=${jobId}`;
    const done = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(t("guide.loadFailed"))), timeout);
      jobs.set(jobId, data => {
        if (data.progress) return;
        clearTimeout(timer);
        if (data.ok) resolve(data);
        else reject(new Error(data.error || t("guide.loadFailed")));
      });
    });
    document.body.append(frame);
    return { done, remove: () => { jobs.delete(jobId); frame.remove(); } };
  }

  const step = () => guide?.steps[index] || null;
  const finished = () => Boolean(guide) && index >= guide.steps.length;

  // What the user should do now, from what the Business Central tab reports.
  function hint() {
    const current = step();
    const target = current?.target || { kind: "none" };
    if (!tab) return { kind: "warn", text: t("guide.openBusinessCentral") };
    const now = Date.now();
    const heard = [...frames.values()].filter(entry => now - entry.at < 2500);
    if (target.kind === "none") return { kind: "", text: t("guide.noTarget") };
    if (!heard.length) {
      return now - connectedAt > 4000 ? { kind: "warn", text: t("guide.reload") }
        : { kind: "", text: t("guide.looking") };
    }
    if (target.kind === "search") {
      // Without the page's name the guide cannot see the page open, so the user moves on.
      const then = target.page || target.result ? "" : ` ${t("guide.thenManual")}`;
      const stages = heard.filter(entry => entry.found).map(entry => entry.stage);
      // The page already in the list (among the latest pages, before anything is typed) is
      // one click away; otherwise the user types in the search box, or first opens the search.
      if (stages.includes("result") && target.result) {
        return { kind: "found", text: t("guide.searchResult", { page: target.result }) };
      }
      if (stages.includes("box")) return { kind: "found", text: `${t("guide.searchBox")}${then}` };
      return stages.length ? { kind: "found", text: `${t("guide.foundSearch")}${then}` }
        : { kind: "", text: `${t("guide.missingSearch")}${then}` };
    }
    if (heard.some(entry => entry.found)) {
      return { kind: "found", text: t(target.kind === "field" ? "guide.foundField" : "guide.foundAction") };
    }
    // On the page, beneath a window still open on top of it.
    if (heard.some(entry => entry.beneath)) {
      return { kind: "warn", text: t(target.kind === "field" ? "guide.beneathField" : "guide.beneathAction") };
    }
    const where = target.pageCaption && !heard.some(entry => entry.onPage)
      ? ` ${t("guide.onPage", { page: target.pageCaption })}` : "";
    return { kind: "warn", text: `${t(target.kind === "field" ? "guide.missingField" : "guide.missingAction")}${where}` };
  }
  function showHint() {
    if (!guide || finished()) return;
    const { kind, text } = hint();
    const box = $("guideHint");
    // Only a change is announced.
    if (box.dataset.kind === kind && $("guideHintText").textContent === text) return;
    box.dataset.kind = kind;
    $("guideHintText").textContent = text;
  }

  async function showScreenshot() {
    const current = step();
    const content = $("guideShotContent");
    if (!current?.screenshot || content.dataset.for === current.stepId) return;
    content.dataset.for = current.stepId;
    content.replaceChildren(Object.assign(document.createElement("p"), { textContent: t("guide.screenshotLoading") }));
    try {
      const response = await send({ type: "T9_GET_SCREENSHOT_ASSETS", sessionId: guide.sessionId,
        paths: [current.screenshot] });
      const source = response.screenshots?.[current.screenshot];
      if (content.dataset.for !== current.stepId) return;
      if (!source) throw new Error("missing");
      const image = document.createElement("img");
      image.src = source;
      image.alt = t("guide.screenshotAlt", { n: current.number });
      content.replaceChildren(image);
    } catch {
      if (content.dataset.for === current.stepId) {
        content.replaceChildren(Object.assign(document.createElement("p"), { textContent: t("guide.screenshotMissing") }));
      }
    }
  }

  function render(focus = false) {
    $("guideLoading").hidden = true;
    $("guideProgress").hidden = false;
    $("guideTitle").textContent = guide.title || t("guide.kicker");
    $("guideTitle").lang = guide.documentLanguage.split("-")[0];
    const total = guide.steps.length;
    $("guideBar").style.width = `${Math.min(index, total) / total * 100}%`;
    const done = finished();
    $("guideStepView").hidden = done;
    $("guideStepFoot").hidden = done;
    $("guideFinished").hidden = !done;
    $("guideFinishedFoot").hidden = !done;
    if (done) {
      $("guideCount").textContent = t("guide.stepOf", { n: total, total });
      $("guideFinishedTitle").textContent = t("guide.finished", { count: total });
      if (focus) $("guideFinishedTitle").focus();
      return;
    }
    const current = step();
    const language = guide.documentLanguage.split("-")[0];
    $("guideCount").textContent = t("guide.stepOf", { n: index + 1, total });
    $("guideSection").textContent = current.heading;
    $("guideSection").hidden = !current.heading;
    $("guideSection").lang = language;
    $("guideStep").textContent = current.instruction || t("guide.stepNumber", { n: current.number });
    $("guideStep").lang = language;
    $("guideDoneNote").textContent = lastDone ? t("guide.stepDone", { n: lastDone }) : "";
    $("guideBack").disabled = index === 0;
    $("guideShot").hidden = !current.screenshot;
    $("guideShotContent").dataset.for = "";
    $("guideShotContent").replaceChildren();
    if ($("guideShot").open) void showScreenshot();
    $("guideList").replaceChildren(...guide.steps.map((item, position) => {
      const entry = document.createElement("li");
      entry.dataset.state = position < index ? "done" : position === index ? "now" : "";
      const button = document.createElement("button");
      button.type = "button";
      button.lang = language;
      button.textContent = item.instruction || t("guide.stepNumber", { n: item.number });
      if (position === index) button.setAttribute("aria-current", "step");
      button.addEventListener("click", () => jump(position));
      entry.append(button);
      return entry;
    }));
    showHint();
    if (focus) $("guideStep").focus();
  }

  // The step is named to every frame of the tab; a new token keeps late answers about an
  // earlier step out.
  function sendStep() {
    frames.clear();
    const current = finished() ? null : step();
    token = `${projectId}:${counter += 1}`;
    try {
      port?.postMessage(current ? { type: "show", token, target: current.target } : { type: "clear" });
    } catch {}
  }

  // A move the user makes in the panel keeps the focus in the panel; the guide's own move does not.
  function go(position, focus = false) {
    index = Math.max(0, Math.min(position, guide.steps.length));
    sendStep();
    render(focus);
  }
  const jump = position => { lastDone = 0; go(position, true); };

  function onFrameMessage(message) {
    if (!message || message.token !== token) return;
    if (message.type === "status") {
      frames.set(String(message.frame || ""), { found: Boolean(message.found), onPage: Boolean(message.onPage),
        stage: String(message.stage || ""), beneath: Boolean(message.beneath), at: Date.now() });
      showHint();
    } else if (message.type === "done" && !finished()) {
      lastDone = step().number;
      go(index + 1);
      // The last step leaves the guide open on its finished view, without taking focus.
    }
  }

  function disconnect() {
    const old = port;
    port = null;
    try { old?.disconnect(); } catch {}
  }
  // Connects to the tab shown in this window, when it is Business Central.
  let connecting = false;
  async function connect() {
    if (connecting) return;
    connecting = true;
    try {
      const windowId = (await chrome.windows.getCurrent()).id;
      const [shown] = await chrome.tabs.query({ active: true, windowId });
      disconnect();
      frames.clear();
      tab = shown && isBusinessCentral(shown.url) ? shown : null;
      connectedAt = Date.now();
      if (tab) {
        const next = chrome.tabs.connect(tab.id, { name: "t9-guide" });
        port = next;
        next.onMessage.addListener(onFrameMessage);
        next.onDisconnect.addListener(() => {
          void chrome.runtime.lastError;
          if (port === next) port = null;
        });
        sendStep();
      }
    } catch { tab = null; }
    finally { connecting = false; }
    showHint();
  }

  // A tab opened before the extension was installed or updated has no guide script yet: it is
  // loaded once into the tab's frames, as a recording does, instead of asking for a reload.
  const loaded = new Set();
  async function loadInto(tabId) {
    if (loaded.has(tabId)) return;
    loaded.add(tabId);
    try {
      await chrome.scripting.executeScript({ target: { tabId, allFrames: true }, files: ["al-identity-capture.js"],
        world: "MAIN" });
      await chrome.scripting.executeScript({ target: { tabId, allFrames: true }, files: ["guide-overlay.js"] });
    } catch { /* The hint asks for a reload. */ }
  }

  // Business Central reloads its frames as the user works, so the tab is asked again when no
  // frame has answered for a while.
  setInterval(() => {
    if (!guide || finished()) return;
    const now = Date.now();
    for (const [key, entry] of frames) if (now - entry.at > 2500) frames.delete(key);
    if (tab && !frames.size && now - connectedAt > 2000) {
      const tabId = tab.id;
      void loadInto(tabId).then(connect);
    } else showHint();
  }, 1000);
  chrome.tabs.onActivated.addListener(() => { void connect(); });
  chrome.tabs.onUpdated.addListener((tabId, change) => {
    if ((change.status === "complete" || change.url) && (!tab || tabId === tab.id)) void connect();
  });

  async function load() {
    $("guideLoading").hidden = false;
    $("guideRetry").hidden = true;
    $("guideMessage").textContent = t("guide.loading");
    if (!projectId) {
      $("guideMessage").textContent = t("guide.loadFailed");
      return;
    }
    const job = libraryJob("show-me", 120000);
    try {
      guide = (await job.done).guide;
      if (!guide?.steps?.length) throw new Error(t("guide.noSteps"));
      index = 0;
      lastDone = 0;
      render(true);
      await connect();
    } catch (error) {
      guide = null;
      $("guideMessage").textContent = String(error?.message || t("guide.loadFailed"));
      $("guideRetry").hidden = false;
      $("guideRetry").focus();
    } finally { job.remove(); }
  }

  // The same steps as a test, in this panel.
  async function startTest() {
    const button = $("guideTest");
    button.disabled = true;
    $("guideFinishedTitle").textContent = t("guide.testCreating");
    const job = libraryJob("run-test", 120000);
    try {
      const { testRunId } = await job.done;
      const path = `test-panel.html?testRunId=${encodeURIComponent(testRunId)}`;
      await chrome.sidePanel?.setOptions?.({ enabled: true, path }).catch(() => {});
      location.href = path;
    } catch (error) {
      $("guideFinishedTitle").textContent = t("guide.testFailed", { detail: String(error?.message || "") }).trim();
      button.disabled = false;
    } finally { job.remove(); }
  }

  $("guideNext").addEventListener("click", () => { lastDone = step()?.number || 0; go(index + 1, true); });
  $("guideBack").addEventListener("click", () => jump(index - 1));
  $("guideAgain").addEventListener("click", () => jump(0));
  $("guideTest").addEventListener("click", () => { void startTest(); });
  $("guideRetry").addEventListener("click", () => { void load(); });
  $("guideShot").addEventListener("toggle", () => { if ($("guideShot").open) void showScreenshot(); });
  $("guideEnd").addEventListener("click", () => {
    try { port?.postMessage({ type: "clear" }); } catch {}
    disconnect();
    window.close();
  });
  window.addEventListener("pagehide", disconnect);

  (async () => {
    try {
      const response = await send({ type: "T9_GET_SETTINGS" });
      locale = i18n.apply(response?.settings?.uiLocale);
    } catch { locale = i18n.apply(locale); }
    document.title = t("guide.kicker");
    await load();
  })();
})();
