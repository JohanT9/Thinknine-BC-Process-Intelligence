(() => {
  "use strict";
  // The test run as a protocol to print or save as PDF and sign: what was tested, where and
  // by whom, each step's result and comment, the screenshots and lines for the signatures.
  // The protocol is test documentation, so it reads in the document language; the toolbar
  // above it follows the interface language.
  //
  // With a suite (?suiteId=) the protocol covers the whole suite: the environment and version
  // tested, an overview of every test's result, then each test's own protocol, and one set of
  // signatures for the suite. Each test reads in the language of its own run.
  const query = new URLSearchParams(location.search);
  const testRunId = query.get("testRunId");
  const suiteId = query.get("suiteId");
  const script = globalThis.T9TestScript;
  const i18n = globalThis.T9UiI18n;
  const status = document.getElementById("protocolStatus");
  const target = document.getElementById("protocol");
  let locale = i18n.DEFAULT_LOCALE;
  const fill = (text, values = {}) => Object.entries(values).reduce((value, [name, item]) =>
    value.replaceAll(`{${name}}`, String(item)), text);
  const t = (key, values) => fill(i18n.translate(key, locale), values);
  const send = payload => new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(payload, response => {
      if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
      else if (!response?.ok) reject(new Error(response?.error || "test.runNotFound"));
      else resolve(response);
    });
  });
  const element = (tag, className = "", text = "") => {
    const value = document.createElement(tag);
    if (className) value.className = className;
    if (text !== "") value.textContent = text;
    return value;
  };
  const translator = language => (key, values) => fill(i18n.translate(key, language), values);
  const dateIn = language => value => {
    try {
      return new Intl.DateTimeFormat(language, { dateStyle: "medium", timeStyle: "short" })
        .format(new Date(value));
    } catch { return String(value || ""); }
  };
  function metaTable() {
    const table = element("table", "meta");
    const row = (label, value, className = "") => {
      const tr = element("tr");
      const th = element("th", "", label); th.scope = "row";
      tr.append(th, element("td", className, value));
      table.append(tr);
    };
    return { table, row };
  }

  // One run's protocol, without the signatures. level is the level of its title: 1 on its
  // own, 2 inside a suite.
  function runParts(run, images, title, level = 1) {
    const language = run.documentLanguage;
    const d = translator(language);
    const date = dateIn(language);
    const heading = `h${level}`;
    const section = `h${level + 1}`;
    const total = script.summary(run);
    const parts = [element(heading, "", title)];

    const meta = metaTable();
    meta.row(d("test.outcome"), `${d("test.outcome." + total.outcome)} · ${script.countsText(total, d)}`,
      `result-${total.outcome}`);
    if (run.tester) meta.row(d("test.tester"), run.tester);
    if (run.environment) meta.row(d("test.environment"), run.environment);
    meta.row(d("test.created"), date(run.createdAt));
    meta.row(d("test.updated"), date(run.updatedAt || run.createdAt));
    parts.push(meta.table);

    if (run.prerequisites.trim()) {
      parts.push(element(section, "", d("test.prerequisites")), element("p", "", run.prerequisites.trim()));
    }
    const data = script.filledTestData(run.testData);
    if (data.length) {
      const table = element("table");
      const head = element("tr");
      head.append(element("th", "", d("test.testDataName")), element("th", "", d("test.testDataValue")));
      table.append(head);
      data.forEach(item => {
        const tr = element("tr");
        tr.append(element("td", "", item.name), element("td", "", item.value));
        table.append(tr);
      });
      parts.push(element(section, "", d("test.testData")), table);
    }
    if (run.processExpectedResult.trim()) {
      parts.push(element(section, "", d("test.processExpected")),
        element("p", "", run.processExpectedResult.trim()));
    }

    const steps = element("table", "steps");
    const head = element("tr");
    for (const label of ["#", d("test.step"), d("test.expected"), d("test.result"), d("test.comment")]) {
      const th = element("th", "", label); th.scope = "col"; head.append(th);
    }
    steps.append(head);
    run.steps.forEach(step => {
      const tr = element("tr");
      const instruction = element("td");
      if (step.heading) instruction.append(element("span", "section", step.heading));
      instruction.append(document.createTextNode(step.instruction));
      tr.append(element("td", "", String(step.number)), instruction,
        element("td", "", script.resolveText(step.expected, run.testData)),
        element("td", `result-${step.status}`, d(script.statusKey(step))),
        element("td", "", step.comment));
      steps.append(tr);
    });
    const wrap = element("div", "table-wrap");
    wrap.append(steps);
    parts.push(element(section, "", d("test.protocolSteps")), wrap);

    const shown = run.steps.flatMap(step => step.screenshots.map((shot, index) =>
      ({ step, index, source: images[shot.screenshotId] }))).filter(item => item.source);
    if (shown.length) {
      parts.push(element(section, "", d("test.screenshots")));
      shown.forEach(({ step, index, source }) => {
        const figure = element("figure");
        const image = element("img");
        image.src = source;
        image.alt = d("test.screenshotAlt", { n: index + 1, step: step.number });
        figure.append(image, element("figcaption", "", d("test.screenshotAlt", { n: index + 1, step: step.number })));
        parts.push(figure);
      });
    }
    return parts;
  }

  function signatures(d) {
    const block = element("div", "signatures");
    for (const role of ["test.testedBy", "test.approvedBy"]) {
      const signature = element("section", "signature");
      signature.append(element("h3", "", d(role)));
      for (const line of ["test.signName", "test.signDate", "test.signature"]) {
        const entry = element("p", "signature-line");
        entry.append(element("span", "", d(line)), element("span"));
        signature.append(entry);
      }
      block.append(signature);
    }
    return [element("h2", "signatures-title", d("test.signatures")), block];
  }

  function renderRun(run, images) {
    const d = translator(run.documentLanguage);
    target.lang = run.documentLanguage.split("-")[0];
    const title = `${d("test.protocolTitle")}: ${run.title}`;
    target.replaceChildren(...runParts(run, images, title), ...signatures(d));
    document.title = title;
  }

  // The suite's protocol. runs maps a test run id to its normalized run; a test whose run is
  // gone is listed in the overview and has no protocol of its own.
  function renderSuite(suite, progress, runs, images) {
    const first = progress.items.map(item => runs[item.testRunId]).find(Boolean);
    const language = first?.documentLanguage || locale;
    const d = translator(language);
    const date = dateIn(language);
    target.lang = language.split("-")[0];
    const title = `${d("suite.protocolTitle")}: ${suite.title || d("suite.pageTitle")}`;
    const parts = [element("h1", "", title)];
    const meta = metaTable();
    const outcome = progress.outcome === "not-started" ? d("suite.outcome.not-started")
      : d(`test.outcome.${progress.outcome}`);
    meta.row(d("test.outcome"), `${outcome} · ${d("suite.progress", { done: progress.done,
      total: progress.total, failed: progress.failed })}`, `result-${progress.outcome}`);
    if (suite.environment) meta.row(d("suite.environment"), suite.environment);
    if (suite.version) meta.row(d("suite.version"), suite.version);
    meta.row(d("test.created"), date(suite.createdAt));
    parts.push(meta.table);

    const overview = element("table", "overview");
    const head = element("tr");
    for (const label of ["#", d("suite.protocolTest"), d("test.result"), d("test.protocolSteps")]) {
      const th = element("th", "", label); th.scope = "col"; head.append(th);
    }
    overview.append(head);
    progress.items.forEach((item, index) => {
      const tr = element("tr");
      const run = runs[item.testRunId];
      tr.append(element("td", "", String(index + 1)), element("td", "", run?.title || item.title),
        element("td", `result-${item.status}`, d(`suite.status.${item.status}`)),
        element("td", "", run ? script.countsText(script.summary(run), d) : ""));
      overview.append(tr);
    });
    const wrap = element("div", "table-wrap");
    wrap.append(overview);
    parts.push(element("h2", "", d("suite.protocolOverview")), wrap);

    progress.items.forEach((item, index) => {
      const run = runs[item.testRunId];
      if (!run) return;
      const block = element("section", "protocol-test");
      block.lang = run.documentLanguage.split("-")[0];
      block.append(...runParts(run, images[run.testRunId] || {}, `${index + 1}. ${run.title}`, 2));
      parts.push(block);
    });
    target.replaceChildren(...parts, ...signatures(d));
    document.title = title;
  }

  async function startRun() {
    const run = script.normalize((await send({ type: "T9_LOAD_TEST_RUN", testRunId })).run);
    let images = {};
    const ids = script.screenshotIds(run);
    if (ids.length) {
      try {
        images = (await send({ type: "T9_LOAD_TEST_SCREENSHOTS", testRunId, screenshotIds: ids })).screenshots;
      } catch { status.textContent = t("test.screenshotsUnavailable"); }
    }
    const include = document.getElementById("includeScreenshots");
    include.disabled = !ids.length;
    const draw = () => renderRun(run, include.checked ? images : {});
    include.addEventListener("change", draw);
    draw();
  }

  async function startSuite() {
    const { suite, progress } = await send({ type: "T9_LOAD_TEST_SUITE", suiteId });
    const runs = {};
    for (const item of progress.items) {
      if (!item.summary) continue;
      try {
        runs[item.testRunId] = script.normalize((await send({ type: "T9_LOAD_TEST_RUN",
          testRunId: item.testRunId })).run);
      } catch { /* Removed since the suite was read: shown without its own protocol. */ }
    }
    // A suite can hold many tests, so their screenshots are read only when asked for.
    const include = document.getElementById("includeScreenshots");
    const withShots = Object.values(runs).filter(run => script.screenshotIds(run).length);
    include.checked = false;
    include.disabled = !withShots.length;
    let images = null;
    const draw = async () => {
      if (include.checked && !images) {
        include.disabled = true;
        status.textContent = t("suite.protocolLoadingScreenshots");
        images = {};
        let failed = false;
        for (const run of withShots) {
          try {
            images[run.testRunId] = (await send({ type: "T9_LOAD_TEST_SCREENSHOTS", testRunId: run.testRunId,
              screenshotIds: script.screenshotIds(run) })).screenshots;
          } catch { failed = true; }
        }
        status.textContent = failed ? t("test.screenshotsUnavailable") : t("test.protocolHelp");
        include.disabled = false;
      }
      renderSuite(suite, progress, runs, include.checked ? images : {});
    };
    include.addEventListener("change", () => { void draw(); });
    await draw();
  }

  async function start() {
    try {
      const response = await send({ type: "T9_GET_SETTINGS" });
      locale = i18n.apply(response?.settings?.uiLocale);
    } catch { locale = i18n.apply(locale); }
    document.getElementById("printProtocol").addEventListener("click", () => window.print());
    if (suiteId) return startSuite();
    if (!testRunId) throw new Error("test.runNotFound");
    return startRun();
  }
  start().catch(error => {
    status.textContent = t(String(error?.message || error));
    document.getElementById("printProtocol").disabled = true;
  });
})();
