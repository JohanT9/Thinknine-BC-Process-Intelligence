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
  let comparison = null;
  let pending = {};
  let me = null;
  let people = [];
  let onlyMine = false;
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
    showComparison();
    const changes = new Map((comparison?.items || []).map(item => [item.sessionId, item]));
    const list = document.getElementById("suiteTests");
    const focused = document.activeElement?.dataset?.testRunId;
    const model = globalThis.T9TestSuite;
    const anyMine = Boolean(me && progress.items.some(item => model.samePerson(item.assignee, me)));
    document.getElementById("onlyMineLabel").hidden = !anyMine;
    if (!anyMine) onlyMine = false;
    document.getElementById("onlyMine").checked = onlyMine;
    const shown = onlyMine ? progress.items.filter(item => model.samePerson(item.assignee, me))
      : progress.items;
    list.replaceChildren(...shown.map(item => {
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
      const change = changes.get(item.sessionId);
      if (change?.change) {
        status.append(document.createTextNode(" · "),
          element("span", "suite-test-change", t(`suite.compare.${change.change}`)));
        if (change.newFailureSteps.length) {
          status.append(document.createTextNode(" · " + t("suite.compare.newFailureSteps",
            { steps: change.newFailureSteps.join(", ") })));
        }
        row.dataset.change = change.change;
      }
      // Who the test is assigned to, and who does it once it is begun.
      const who = element("p", "suite-test-people");
      const assigned = element("span", "", item.assignee
        ? t("suite.assignedTo", { name: item.assignee.name }) : t("suite.notAssigned"));
      assigned.dataset.mine = String(Boolean(me && model.samePerson(item.assignee, me)));
      who.append(assigned);
      const tester = String(item.summary?.tester || "").trim();
      const begun = item.summary && item.summary.notRun < item.summary.total;
      if (begun && tester) {
        who.append(element("span", "", t(item.summary.notRun ? "suite.doingBy" : "suite.doneBy",
          { name: tester })));
      }
      textBox.append(title, status, who);
      row.append(textBox);
      const actions = element("div", "suite-test-actions");
      row.append(actions);
      if (item.status !== "missing") {
        const assign = element("button", "", t("suite.assignOne"));
        assign.type = "button";
        assign.dataset.assignSessionId = item.sessionId;
        assign.setAttribute("aria-label", t("suite.assignLabel", { title: item.title }));
        assign.addEventListener("click", () => openAssign([item.sessionId], assign));
        actions.append(assign);
      }
      if (item.summary) {
        const open = element("button", "", t("suite.openTest"));
        open.type = "button";
        open.dataset.testRunId = item.testRunId;
        open.setAttribute("aria-label", `${t("suite.openTest")}: ${item.title}`);
        open.addEventListener("click", () => openPage(`test-run.html?testRunId=${
          encodeURIComponent(item.testRunId)}`));
        actions.append(open);
      }
      return row;
    }));
    if (focused) list.querySelector(`[data-test-run-id="${CSS.escape(focused)}"]`)?.focus();
    const canRunAgain = globalThis.T9TestSuite.hasResults(progress);
    document.getElementById("nextRound").hidden = !canRunAgain;
    document.getElementById("nextRoundHelp").hidden = !canRunAgain;
  }

  // This round compared with the previous one, above the tests: how many fail anew, are
  // fixed or unchanged. Shown only for a suite made as the next round of another.
  function showComparison() {
    const box = document.getElementById("suiteComparison");
    box.hidden = !comparison;
    if (!comparison) return;
    const label = element("strong", "", t("suite.compare.label"));
    const previous = comparison.previous || {};
    const where = [previous.environment, previous.version].filter(Boolean).join(" · ") ||
      date(previous.createdAt);
    const counts = comparison.counts;
    const parts = [["countNewFailure", counts.newFailure], ["countFixed", counts.fixed],
      ["countUnchanged", counts.unchanged], ["countUntested", counts.untested],
      ["countNew", counts.new]].filter(([, count]) => count)
      .map(([key, count]) => t(`suite.compare.${key}`, { count }));
    const compared = counts.newFailure + counts.fixed + counts.unchanged + counts.untested;
    const text = element("span", "", compared ? parts.join(" · ")
      : [t("suite.compare.nothingYet"), ...parts].join(" · "));
    box.dataset.newFailures = String(counts.newFailure);
    box.replaceChildren(label, document.createTextNode(where ? ` (${where}) ` : " "), text);
  }

  // Assigning tests: the tests to assign, ticked, and the person, chosen among the person
  // signed in and everyone assigned before, or a new person by name and email. Nobody takes
  // the assignment away.
  let assignOpener = null;
  async function openAssign(sessionIds, opener) {
    assignOpener = opener;
    try { ({ me, people } = await send({ type: "T9_TEST_PEOPLE" })); }
    catch { people = me ? [me] : []; }
    const box = document.getElementById("assignTestsList");
    box.replaceChildren(box.querySelector("legend"), ...progress.items
      .filter(item => item.status !== "missing").map(item => {
        const label = element("label", "assign-test");
        const check = element("input");
        check.type = "checkbox";
        check.value = item.sessionId;
        check.checked = sessionIds.includes(item.sessionId);
        label.append(check, element("span", "", item.assignee
          ? `${item.title} – ${item.assignee.name}` : item.title));
        return label;
      }));
    const select = document.getElementById("assignPerson");
    const options = people.map(who => new Option(who.email && me && globalThis.T9TestSuite.samePerson(who, me)
      ? t("suite.assignMe", { name: who.name }) : `${who.name} (${who.email})`, who.email));
    select.replaceChildren(...options, new Option(t("suite.assignNew"), "new"),
      new Option(t("suite.assignNone"), "none"));
    const current = progress.items.find(item => item.sessionId === sessionIds[0])?.assignee;
    select.value = current?.email && people.some(who => who.email === current.email) ? current.email
      : people.length ? people[0].email : "new";
    document.getElementById("assignName").value = "";
    document.getElementById("assignEmail").value = "";
    document.getElementById("assignError").textContent = "";
    document.getElementById("assignNotify").checked = true;
    showNewPerson();
    document.getElementById("assignDialog").showModal();
    select.focus();
  }
  function showNewPerson() {
    const choice = document.getElementById("assignPerson").value;
    const isNew = choice === "new";
    document.getElementById("assignNew").hidden = !isNew;
    // An email to the person, offered for anyone but yourself, and ticked from the start.
    document.getElementById("assignNotifyLabel").hidden = choice === "none" ||
      Boolean(me?.email && choice === me.email);
    closeSuggestions();
    // Before Microsoft 365 is allowed, the button to search it is offered at once.
    if (isNew && peopleState === "unknown") {
      chrome.permissions.contains(GRAPH).then(allowed => {
        if (!allowed) document.getElementById("assignPeopleSearch").hidden = false;
      }, () => {});
    }
  }

  // One Outlook client for the page: drafts of the assignments and people from Microsoft 365.
  let outlookClient = null;
  const outlook = () => outlookClient ||= globalThis.T9OutlookDraft.create({ identity: chrome.identity,
    storage: chrome.storage.local, sessionStorage: chrome.storage.session, fetcher: fetch,
    getAccount: async () => me?.email ? { email: me.email } : {},
    clientId: globalThis.T9TenantLicenseConfig.consultant.clientId });
  const GRAPH = { origins: ["https://graph.microsoft.com/*"] };

  // Suggestions for a new person while typing a name or an address: people assigned before,
  // people bug reports were sent to, and people from Microsoft 365 once the user has allowed
  // it. Typing never opens a sign-in window; the button below the fields does.
  const nameField = () => document.getElementById("assignName");
  const emailField = () => document.getElementById("assignEmail");
  let peopleState = "unknown"; // unknown, ready, signIn or unavailable
  let suggestions = [], activeSuggestion = -1, suggestionField = null, suggestionTimer = 0;
  async function recentPeople() {
    let recent = [];
    try {
      const stored = (await chrome.storage.local.get("t9RecentRecipientsV1")).t9RecentRecipientsV1;
      recent = Array.isArray(stored) ? stored : [];
    } catch { /* Suggestions are a convenience. */ }
    return [...people.map(who => ({ name: who.name, address: who.email })),
      ...recent.filter(item => typeof item?.address === "string").map(item => ({ name: "", address: item.address }))];
  }
  function closeSuggestions() {
    clearTimeout(suggestionTimer);
    suggestions = []; activeSuggestion = -1;
    const list = document.getElementById("assignSuggestions");
    list.hidden = true;
    list.replaceChildren();
    for (const field of [nameField(), emailField()]) {
      field.setAttribute("aria-expanded", "false");
      field.removeAttribute("aria-activedescendant");
    }
  }
  function showSuggestions(field, items) {
    suggestions = items; activeSuggestion = -1;
    if (!items.length) { closeSuggestions(); return; }
    suggestionField = field;
    const list = document.getElementById("assignSuggestions");
    field.after(list);
    list.style.top = `${field.offsetTop + field.offsetHeight}px`;
    list.replaceChildren(...items.map((item, index) => {
      const option = element("li");
      option.id = "assignSuggestion" + index;
      option.setAttribute("role", "option");
      option.setAttribute("aria-selected", "false");
      if (item.name && item.name.toLowerCase() !== item.address.toLowerCase()) {
        option.append(element("span", "", item.name), element("span", "suggestion-address", item.address));
      } else option.textContent = item.address;
      // Keep focus in the field so that the choice does not close the list first.
      option.addEventListener("mousedown", event => event.preventDefault());
      option.addEventListener("click", () => chooseSuggestion(index));
      return option;
    }));
    list.hidden = false;
    field.setAttribute("aria-expanded", "true");
  }
  function markSuggestion(index) {
    activeSuggestion = index;
    const list = document.getElementById("assignSuggestions");
    [...list.children].forEach((option, position) => option.setAttribute("aria-selected", String(position === index)));
    suggestionField.setAttribute("aria-activedescendant", list.children[index].id);
    list.children[index].scrollIntoView({ block: "nearest" });
  }
  function chooseSuggestion(index) {
    const item = suggestions[index];
    if (!item) return;
    emailField().value = item.address;
    if (item.name || !nameField().value.trim()) nameField().value = item.name || "";
    document.getElementById("assignError").textContent = "";
    closeSuggestions();
    document.getElementById("assignSubmit").focus();
  }
  async function suggestPeople(field) {
    const term = field.value.trim().toLowerCase();
    if (!term) { closeSuggestions(); return; }
    const fits = item => item.address.toLowerCase().includes(term) || item.name?.toLowerCase().includes(term);
    const seen = new Set();
    const recent = (await recentPeople()).filter(item => fits(item) && !seen.has(item.address.toLowerCase()) &&
      seen.add(item.address.toLowerCase())).slice(0, 5);
    if (field.value.trim().toLowerCase() !== term) return;
    showSuggestions(field, recent);
    if (term.length < 2 || ["signIn", "unavailable"].includes(peopleState)) return;
    clearTimeout(suggestionTimer);
    suggestionTimer = setTimeout(async () => {
      let found;
      try {
        found = await chrome.permissions.contains(GRAPH) ? await outlook().people(term) : null;
      } catch { peopleState = "unavailable"; return; }
      if (found === null) { peopleState = "signIn"; document.getElementById("assignPeopleSearch").hidden = false; return; }
      peopleState = "ready";
      if (document.activeElement !== field || field.value.trim().toLowerCase() !== term) return;
      showSuggestions(field, [...recent, ...found.filter(item => !seen.has(item.address.toLowerCase()))].slice(0, 8));
    }, 250);
  }
  function suggestionKeys(event) {
    const list = document.getElementById("assignSuggestions");
    if (list.hidden || suggestionField !== event.target) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      markSuggestion((activeSuggestion + step + suggestions.length) % suggestions.length);
    } else if (event.key === "Enter" && activeSuggestion >= 0) {
      event.preventDefault();
      chooseSuggestion(activeSuggestion);
    } else if (event.key === "Escape") {
      // Close only the list; the dialog stays open.
      event.preventDefault();
      event.stopPropagation();
      closeSuggestions();
    }
  }
  // Signing in for People.Read happens only from this button, never while typing.
  async function searchPeople() {
    const button = document.getElementById("assignSearchPeople");
    const error = document.getElementById("assignError");
    button.disabled = true;
    try {
      if (!await chrome.permissions.request(GRAPH)) throw new Error("consent");
      if (await outlook().people("", { interactive: true }) === null) throw new Error("consent");
      peopleState = "ready";
      document.getElementById("assignPeopleSearch").hidden = true;
      error.textContent = "";
      const field = [nameField(), emailField()].find(input => input.value.trim()) || nameField();
      field.focus();
      void suggestPeople(field);
    } catch {
      error.textContent = t("outlook.peopleFailed");
    } finally { button.disabled = false; }
  }
  async function assign() {
    const error = document.getElementById("assignError");
    const sessionIds = [...document.querySelectorAll("#assignTestsList input:checked")].map(box => box.value);
    if (!sessionIds.length) { error.textContent = t("suite.assignNeedTests"); return; }
    const choice = document.getElementById("assignPerson").value;
    let assignee = null;
    if (choice === "new") {
      assignee = globalThis.T9TestSuite.person({ name: document.getElementById("assignName").value,
        email: document.getElementById("assignEmail").value });
      if (!assignee) { error.textContent = t("suite.assignNeedEmail"); document.getElementById("assignEmail").focus(); return; }
    } else if (choice !== "none") {
      assignee = people.find(who => who.email === choice) || null;
    }
    const notifyBox = document.getElementById("assignNotify");
    const notify = Boolean(assignee && !document.getElementById("assignNotifyLabel").hidden && notifyBox.checked);
    // Asked for while the click still counts: the browser allows the request only then.
    const permission = notify ? chrome.permissions.request(GRAPH).catch(() => false) : null;
    // Each test in the email links to the page that opens it in BC Process Studio.
    const linkBase = globalThis.T9TenantLicenseConfig?.openLink || "";
    const titles = progress.items.filter(item => sessionIds.includes(item.sessionId)).map(item => ({ title: item.title,
      link: linkBase && item.testRunId ? `${linkBase}?${new URLSearchParams({ suite: suiteId, test: item.testRunId })}` : "" }));
    const button = document.getElementById("assignSubmit");
    button.disabled = true;
    try {
      await save();
      show(await send({ type: "T9_UPDATE_TEST_SUITE", suiteId,
        patch: { assign: { sessionIds, assignee } } }));
      document.getElementById("assignDialog").close();
      message.textContent = assignee
        ? t(sessionIds.length === 1 ? "suite.assignedOne" : "suite.assigned", { count: sessionIds.length, name: assignee.name })
        : t("suite.unassigned", { count: sessionIds.length });
    } catch (failure) {
      error.textContent = errorText(failure);
      return;
    } finally { button.disabled = false; }
    document.getElementById("suiteEmail").hidden = true;
    if (notify) void notifyAssignee(globalThis.T9TestSuite.assignmentEmail(suite, assignee, titles, t), permission);
  }

  // The email to the person just assigned, sent straight from the user's own Outlook. The
  // assignment is saved whatever happens here; a failure offers to try again or to open the
  // same email in the email program on the computer.
  async function notifyAssignee(email, permission) {
    if (!email) return;
    const box = document.getElementById("suiteEmail");
    const mailto = `mailto:${encodeURIComponent(email.to).replace(/%40/gu, "@")}?subject=${
      encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.text)}`;
    box.hidden = false;
    box.dataset.state = "working";
    box.replaceChildren(element("span", "", t("suite.notifySending", { email: email.to })));
    try {
      if (!await (permission || chrome.permissions.request(GRAPH))) throw { outlookCode: "consent" };
      await outlook().send({ reportKey: `assign:${suiteId}:${email.to}:${Date.now()}`,
        email: { to: email.to, subject: email.subject, htmlBody: email.html, attachments: [],
          withoutAttachments: true } });
      box.dataset.state = "sent";
      box.replaceChildren(element("span", "", t("suite.notifySent", { email: email.to })));
    } catch (failure) {
      const uncertain = failure?.outlookCode === "uncertain";
      box.dataset.state = "failed";
      const retry = element("button", "", t("suite.notifyRetry"));
      retry.type = "button";
      retry.addEventListener("click", () => { void notifyAssignee(email, null); });
      const fallback = element("a", "", t("suite.emailFallback"));
      fallback.href = mailto;
      box.replaceChildren(element("span", "", t(uncertain ? "suite.notifyUncertain" : "suite.notifyFailed",
        { email: email.to })), retry, fallback);
      retry.focus();
    }
  }

  function show(response) {
    if ("me" in response) me = response.me || null;
    suite = response.suite;
    progress = response.progress;
    comparison = response.comparison || null;
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
    document.getElementById("assignTests").addEventListener("click", event => openAssign(
      progress.items.filter(item => !item.assignee && item.status !== "missing").map(item => item.sessionId),
      event.currentTarget));
    document.getElementById("assignPerson").addEventListener("change", showNewPerson);
    for (const field of [nameField(), emailField()]) {
      field.addEventListener("input", () => { void suggestPeople(field); });
      field.addEventListener("blur", closeSuggestions);
      field.addEventListener("keydown", suggestionKeys);
    }
    document.getElementById("assignSearchPeople").addEventListener("click", () => { void searchPeople(); });
    document.getElementById("assignForm").addEventListener("submit", event => { event.preventDefault(); void assign(); });
    document.getElementById("assignCancel").addEventListener("click", () => document.getElementById("assignDialog").close());
    document.getElementById("assignDialog").addEventListener("close", () => {
      // The rows are drawn again after assigning; the same row's button takes the focus.
      const id = assignOpener?.dataset?.assignSessionId;
      (assignOpener?.isConnected ? assignOpener : id && document.querySelector(
        `[data-assign-session-id="${CSS.escape(id)}"]`) || document.getElementById("assignTests")).focus();
    });
    document.getElementById("onlyMine").addEventListener("change", event => {
      onlyMine = event.target.checked;
      showProgress();
    });
    document.getElementById("openSuiteProtocol").addEventListener("click", async () => {
      await save().catch(() => {});
      openPage(`test-protocol.html?suiteId=${encodeURIComponent(suiteId)}`);
    });
    document.getElementById("deleteSuite").addEventListener("click", () => showDeleteConfirm(
      document.getElementById("deleteConfirm").hidden));
    document.getElementById("deleteCancel").addEventListener("click", () => showDeleteConfirm(false));
    document.getElementById("deleteConfirmButton").addEventListener("click", deleteSuite);
    document.getElementById("closeSuite").addEventListener("click", async () => {
      await save().catch(() => {});
      closeTab();
    });
  }
  // A tab the email link opened was not opened by a script and may not close itself, so the
  // page is closed as a tab.
  function closeTab() {
    chrome.tabs.getCurrent(tab => { if (tab?.id) chrome.tabs.remove(tab.id); else window.close(); });
  }
  start().catch(error => {
    message.textContent = errorText(error);
    document.getElementById("saveState").textContent = "";
    // Without a suite there is nothing to show or change; only Close stays.
    if (!suite) {
      document.getElementById("testSuite").hidden = true;
      for (const id of ["nextRound", "assignTests", "openSuiteProtocol", "deleteSuite"]) {
        document.getElementById(id).hidden = true;
      }
      document.getElementById("closeSuite").addEventListener("click", closeTab);
    }
    // Opened from a link in an email before the suite has reached this computer through the
    // shared folder: say so, and open the suite as soon as it arrives.
    if (suiteId && query.get("from") === "link" && String(error?.message) === "suite.notFound") {
      message.textContent = t("suite.notSynced");
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === "local" && changes[keys.TEST_SUITE_PREFIX + suiteId]?.newValue) location.reload();
      });
    }
  });
})();
