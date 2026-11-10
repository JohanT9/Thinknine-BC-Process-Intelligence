(() => {
  "use strict";
  // The test run as a protocol to print or save as PDF and sign: what was tested, where and
  // by whom, each step's result and comment, the screenshots and lines for the signatures.
  // The protocol is test documentation, so it reads in the document language; the toolbar
  // above it follows the interface language.
  const testRunId = new URLSearchParams(location.search).get("testRunId");
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

  function render(run, images) {
    const language = run.documentLanguage;
    const d = (key, values) => fill(i18n.translate(key, language), values);
    const date = value => {
      try {
        return new Intl.DateTimeFormat(language, { dateStyle: "medium", timeStyle: "short" })
          .format(new Date(value));
      } catch { return String(value || ""); }
    };
    const total = script.summary(run);
    target.lang = language.split("-")[0];
    const parts = [element("h1", "", `${d("test.protocolTitle")}: ${run.title}`)];

    const meta = element("table", "meta");
    const row = (label, value, className = "") => {
      const tr = element("tr");
      const th = element("th", "", label); th.scope = "row";
      tr.append(th, element("td", className, value));
      meta.append(tr);
    };
    row(d("test.outcome"), `${d("test.outcome." + total.outcome)} · ${script.countsText(total, d)}`,
      `result-${total.outcome}`);
    if (run.tester) row(d("test.tester"), run.tester);
    if (run.environment) row(d("test.environment"), run.environment);
    row(d("test.created"), date(run.createdAt));
    row(d("test.updated"), date(run.updatedAt || run.createdAt));
    parts.push(meta);

    if (run.prerequisites.trim()) {
      parts.push(element("h2", "", d("test.prerequisites")), element("p", "", run.prerequisites.trim()));
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
      parts.push(element("h2", "", d("test.testData")), table);
    }
    if (run.processExpectedResult.trim()) {
      parts.push(element("h2", "", d("test.processExpected")),
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
        element("td", `result-${step.status}`, d("test.status." + step.status)),
        element("td", "", step.comment));
      steps.append(tr);
    });
    const wrap = element("div", "table-wrap");
    wrap.append(steps);
    parts.push(element("h2", "", d("test.protocolSteps")), wrap);

    const shown = run.steps.flatMap(step => step.screenshots.map((shot, index) =>
      ({ step, index, source: images[shot.screenshotId] }))).filter(item => item.source);
    if (shown.length) {
      parts.push(element("h2", "", d("test.screenshots")));
      shown.forEach(({ step, index, source }) => {
        const figure = element("figure");
        const image = element("img");
        image.src = source;
        image.alt = d("test.screenshotAlt", { n: index + 1, step: step.number });
        figure.append(image, element("figcaption", "", d("test.screenshotAlt", { n: index + 1, step: step.number })));
        parts.push(figure);
      });
    }

    const signatures = element("div", "signatures");
    for (const role of ["test.testedBy", "test.approvedBy"]) {
      const block = element("section", "signature");
      block.append(element("h3", "", d(role)));
      for (const line of ["test.signName", "test.signDate", "test.signature"]) {
        const entry = element("p", "signature-line");
        entry.append(element("span", "", d(line)), element("span"));
        block.append(entry);
      }
      signatures.append(block);
    }
    parts.push(element("h2", "", d("test.signatures")), signatures);
    target.replaceChildren(...parts);
    document.title = `${d("test.protocolTitle")}: ${run.title}`;
  }

  async function start() {
    try {
      const response = await send({ type: "T9_GET_SETTINGS" });
      locale = i18n.apply(response?.settings?.uiLocale);
    } catch { locale = i18n.apply(locale); }
    if (!testRunId) throw new Error("test.runNotFound");
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
    const draw = () => render(run, include.checked ? images : {});
    include.addEventListener("change", draw);
    draw();
    document.getElementById("printProtocol").addEventListener("click", () => window.print());
  }
  start().catch(error => { status.textContent = t(String(error?.message || error)); });
})();
