(() => {
  "use strict";
  // A test suite: the tests of several documents run together, with the environment and
  // version tested. Each test is opened and run on its own page; this page counts the
  // progress from the runs and follows them as they change.
  const query = new URLSearchParams(location.search);
  const suiteId = query.get("suiteId");
  const i18n = globalThis.T9UiI18n;
  const keys = globalThis.T9StorageKeys;
  const message = document.getElementById("suiteMessage");
  const SAVE_DELAY_MS = 600;
  let locale = i18n.DEFAULT_LOCALE;
  let suite = null;
  let progress = null;
  let pending = {};
  let timer = null;
  const t = (key, values = {}) => Object.entries(values).reduce((value, [name, item]) =>
    value.replaceAll(`{${name}}`, String(item)), i18n.translate(key, locale));
  const send = payload => new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(payload, response => {
      if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
      else if (!response?.ok) reject(new Error(response?.error || "suite.notFound"));
      else resolve(response);
    });
  });
  const errorText = error => t(String(error?.message || error));
  const date = value => {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? "" : parsed.toLocaleDateString(locale);
  };
  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  function showSaveState(state) {
    const status = document.getElementById("saveState");
    status.dataset.state = state;
    status.textContent = t({ saved: "test.saved", saving: "test.saving",
      unsaved: "test.unsaved", failed: "test.saveFailed" }[state]);
    if (state === "failed") {
      const retry = element("button", "", t("test.retry"));
      retry.type = "button";
      retry.addEventListener("click", () => { void save(); });
      status.append(" ", retry);
    }
  }

  function showTitle() {
    const title = suite.title || t("suite.pageTitle");
    document.getElementById("suiteTitle").textContent = title;
    document.title = `${t("suite.pageTitle")}: ${title}`;
  }

  function showMeta() {
    const meta = document.getElementById("suiteMeta");
    const parts = [element("span", "", t("suite.created", { date: date(suite.createdAt) }))];
    if (suite.previousSuiteId) {
      const previous = element("button", "", t("suite.previous"));
      previous.type = "button";
      previous.addEventListener("click", () => openPage(`test-suite.html?suiteId=${
        encodeURIComponent(suite.previousSuiteId)}`));
      parts.push(previous);
    }
    meta.replaceChildren(...parts);
  }

  function showProgress() {
    const summary = document.getElementById("suiteSummary");
    const outcome = element("strong");
    outcome.dataset.outcome = progress.outcome;
    outcome.textContent = `${t("test.outcome")}: ${progress.outcome === "not-started"
      ? t("suite.outcome.not-started") : t(`test.outcome.${progress.outcome}`)}`;
    summary.replaceChildren(outcome, document.createTextNode(" "), element("span", "",
      t("suite.progress", { done: progress.done, total: progress.total, failed: progress.failed })));
    const list = document.getElementById("suiteTests");
    const focused = document.activeElement?.dataset?.testRunId;
    list.replaceChildren(...progress.items.map(item => {
      const row = element("li", "suite-test");
      row.dataset.status = item.status;
      const textBox = element("div", "suite-test-text");
      const title = element("p", "suite-test-title", item.title);
      const status = element("p", "suite-test-status");
      status.append(element("strong", "", t(`suite.status.${item.status}`)));
      if (item.summary) {
        const tested = item.summary.total - item.summary.notRun;
        status.append(document.createTextNode(" · " + t("suite.steps", { done: tested,
          total: item.summary.total })));
      }
      textBox.append(title, status);
      row.append(textBox);
      if (item.summary) {
        const open = element("button", "", t("suite.openTest"));
        open.type = "button";
        open.dataset.testRunId = item.testRunId;
        open.setAttribute("aria-label", `${t("suite.openTest")}: ${item.title}`);
        open.addEventListener("click", () => openPage(`test-run.html?testRunId=${
          encodeURIComponent(item.testRunId)}`));
        row.append(open);
      }
      return row;
    }));
    if (focused) list.querySelector(`[data-test-run-id="${CSS.escape(focused)}"]`)?.focus();
    document.getElementById("nextRound").disabled = !progress.items.some(item => item.summary);
  }

  function show(response) {
    suite = response.suite;
    progress = response.progress;
    showTitle(); showMeta(); showProgress();
  }

  async function reload() {
    try { show(await send({ type: "T9_LOAD_TEST_SUITE", suiteId })); }
    catch (error) { message.textContent = errorText(error); }
  }

  async function save() {
    clearTimeout(timer);
    const patch = pending;
    if (!Object.keys(patch).length) return;
    pending = {};
    showSaveState("saving");
    try {
      show(await send({ type: "T9_UPDATE_TEST_SUITE", suiteId, patch }));
      showSaveState(Object.keys(pending).length ? "unsaved" : "saved");
    } catch {
      // The edits are kept and saved again with the next change or on retry.
      pending = { ...patch, ...pending };
      showSaveState("failed");
    }
  }
  function change(field, value) {
    pending[field] = value;
    suite = { ...suite, [field]: value };
    if (field === "title") showTitle();
    showSaveState("unsaved");
    clearTimeout(timer);
    timer = setTimeout(() => { void save(); }, SAVE_DELAY_MS);
  }
  window.addEventListener("beforeunload", event => {
    if (Object.keys(pending).length) { event.preventDefault(); event.returnValue = ""; }
  });

  function openPage(path) {
    void chrome.tabs.create({ url: chrome.runtime.getURL(path) });
  }

  async function nextRound() {
    const button = document.getElementById("nextRound");
    button.disabled = true;
    message.textContent = t("suite.creatingRound");
    try {
      await save();
      await send({ type: "T9_NEXT_TEST_SUITE_ROUND", suiteId });
      message.textContent = "";
    } catch (error) {
      message.textContent = errorText(error);
    } finally { button.disabled = !progress?.items.some(item => item.summary); }
  }

  function showDeleteConfirm(open) {
    const toggle = document.getElementById("deleteSuite");
    document.getElementById("deleteConfirm").hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
    (open ? document.getElementById("deleteCancel") : toggle).focus();
  }
  async function deleteSuite() {
    try {
      clearTimeout(timer);
      pending = {};
      await send({ type: "T9_DELETE_TEST_SUITE", suiteId });
      window.close();
      // Pages opened by the user cannot always be closed by script.
      document.getElementById("testSuite").replaceChildren(element("p", "", t("suite.deleted")));
      document.querySelector("header .actions").hidden = true;
    } catch (error) { message.textContent = errorText(error); }
  }

  async function start() {
    try {
      const response = await send({ type: "T9_GET_SETTINGS" });
      locale = i18n.apply(response?.settings?.uiLocale);
    } catch { locale = i18n.apply(locale); }
    document.title = t("suite.pageTitle");
    if (!suiteId) throw new Error("suite.notFound");
    const response = await send({ type: "T9_LOAD_TEST_SUITE", suiteId });
    show(response);
    showSaveState("saved");
    for (const [id, field] of [["suiteName", "title"], ["suiteEnvironment", "environment"],
      ["suiteVersion", "version"]]) {
      const input = document.getElementById(id);
      input.value = suite[field];
      input.addEventListener("input", () => change(field, input.value));
    }
    // The runs change on their own pages; the suite follows them.
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "local") return;
      const runKeys = new Set((suite?.items || []).filter(item => item.testRunId)
        .map(item => keys.TEST_RUN_PREFIX + item.testRunId));
      if (Object.keys(changes).some(key => runKeys.has(key)) && !Object.keys(pending).length) void reload();
    });
    document.getElementById("nextRound").addEventListener("click", nextRound);
    document.getElementById("deleteSuite").addEventListener("click", () => showDeleteConfirm(
      document.getElementById("deleteConfirm").hidden));
    document.getElementById("deleteCancel").addEventListener("click", () => showDeleteConfirm(false));
    document.getElementById("deleteConfirmButton").addEventListener("click", deleteSuite);
    document.getElementById("closeSuite").addEventListener("click", async () => {
      await save().catch(() => {});
      window.close();
    });
  }
  start().catch(error => {
    message.textContent = errorText(error);
    document.getElementById("saveState").textContent = "";
  });
})();
