// Every email made from a bug report is recorded with the version of the report it held,
// so the report and the library show when it was sent, to whom, and whether the report has
// changed since. Only Microsoft's confirmation counts as sent.
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
globalThis.T9TextFormat = require("../src/engine/text-format");
const languages = require("../src/engine/language-registry");
const canonical = require("../src/engine/canonical-recording");
const model = require("../src/bug-report/bug-report-model");
const service = require("../src/bug-report/bug-report-service");
const workspaceModule = require("../src/bug-report/technical-report-workspace");
const read = file => fs.readFileSync(path.join(__dirname, "..", file), "utf8");

let recording = canonical.create({ id: "delivery", startedAt: "2026-11-06T10:00:00Z",
  recordingPurpose: "bug-report" });
recording = canonical.finish(recording, "2026-11-06T10:01:00Z");
const steps = [{ taskId: "t1", instruction: "Välj **Bokför**.", sourceEventIds: ["e1"] }];
const report = service.createBugReportFromRecording(recording, steps,
  { documentLanguage: "sv-SE", now: "2026-11-06T10:02:00Z" });

// Older reports have no history and keep working.
assert.deepStrictEqual(report.deliveries, []);
assert.deepStrictEqual(model.normalize({ ...report, deliveries: undefined }).deliveries, []);

// A delivery is kept with its recipients and does not change when the report was edited.
const sent = model.recordDelivery(report, { deliveryId: "d1", at: "2026-11-06T11:00:00Z",
  method: "direct", outcome: "sent", to: ["support@example.com"], cc: "a@example.com; b@example.com",
  reportRevision: model.contentRevision(report), futureField: { kept: true } });
assert.strictEqual(sent.updatedAt, report.updatedAt);
assert.deepStrictEqual(sent.deliveries[0].to, ["support@example.com"]);
assert.deepStrictEqual(sent.deliveries[0].cc, ["a@example.com", "b@example.com"]);
assert.deepStrictEqual(sent.deliveries[0].futureField, { kept: true }, "unknown fields are kept");
assert.strictEqual(model.recordDelivery(sent, sent.deliveries[0]).deliveries.length, 1,
  "the same delivery is recorded once");
assert.throws(() => model.recordDelivery(report, { outcome: "sent" }), TypeError);
// The history, status and save time are not part of what the report says.
assert.strictEqual(model.contentRevision(sent), model.contentRevision(report));
assert.strictEqual(model.contentRevision(model.updateHumanContent(sent, { status: "ready" },
  "2026-11-07T08:00:00Z")), model.contentRevision(report));
assert.notStrictEqual(model.contentRevision(model.updateHumanContent(sent,
  { expectedResult: "Ordern bokförs." })), model.contentRevision(report));

// Regenerating from the recording keeps what was sent.
assert.deepStrictEqual(service.regenerate(sent, recording, steps).deliveries, sent.deliveries);

(async () => {
  // The workspace records the version it held; undoing an edit keeps the delivery, and an
  // edit afterwards marks the report as changed since.
  const saved = [];
  const workspace = workspaceModule.create({ report, store: { save: async value => {
    saved.push(value); return value; } } });
  workspace.edit({ expectedResult: "Ordern bokförs." });
  workspace.recordDelivery({ deliveryId: "d2", at: "2026-11-06T12:00:00Z", method: "direct",
    outcome: "sent", to: ["support@example.com"] });
  let state = workspace.state();
  assert.strictEqual(state.report.deliveries.length, 1);
  assert.strictEqual(state.report.deliveries[0].reportRevision, state.contentRevision);
  assert.strictEqual(state.saveState, "unsaved", "the delivery is saved with the report");
  workspace.undo();
  state = workspace.state();
  assert.strictEqual(state.report.deliveries.length, 1, "undo keeps the delivery");
  assert.notStrictEqual(state.report.deliveries[0].reportRevision, state.contentRevision);
  workspace.redo();
  assert.strictEqual(workspace.state().report.deliveries[0].reportRevision,
    workspace.state().contentRevision);
  await workspace.flush();
  assert.strictEqual(saved.at(-1).deliveries[0].deliveryId, "d2");

  // The report shows the history newest first in every interface language.
  const ui = vm.createContext({ T9LanguageRegistry: languages, console });
  vm.runInContext(read("src/ui/i18n.js"), ui);
  globalThis.T9UiI18n = ui.T9UiI18n;
  const view = require("../src/ui/technical-report-workspace-view");
  const keys = ["technical.deliveriesTitle", "technical.deliverySent", "technical.deliveryUncertain",
    "technical.deliveryDraft", "technical.deliveryFile", "technical.deliveryCc",
    "technical.deliveryChanged", "technical.deliveryCurrent"];
  for (const { locale } of languages.supported("ui")) {
    for (const key of keys) {
      const value = ui.T9UiI18n.translate(key, locale);
      assert.notStrictEqual(value, key, `${locale} ${key}`);
      if (locale !== "en-US") assert.notStrictEqual(value, ui.T9UiI18n.translate(key, "en-US"),
        `${locale} ${key}`);
      for (const placeholder of ui.T9UiI18n.translate(key, "en-US").match(/\{\w+\}/gu) || []) {
        assert.ok(value.includes(placeholder), `${locale} ${key} ${placeholder}`);
      }
    }
  }
  {
    // A small element model: enough for the view, which builds its content with elements.
    class Element {
      constructor(tag) { this.tagName = tag; this.children = []; this.dataset = {};
        this.attributes = {}; this._text = ""; this.className = ""; this.value = ""; this.style = {}; }
      get textContent() { return this._text + this.children.map(child =>
        typeof child === "string" ? child : child.textContent).join(""); }
      set textContent(value) { this._text = String(value); this.children = []; }
      appendChild(child) { this.children.push(child); return child; }
      append(...children) { children.forEach(child => this.appendChild(child)); }
      replaceChildren(...children) { this.children = []; this.append(...children); }
      setAttribute(name, value) { this.attributes[name] = String(value); }
      removeAttribute(name) { delete this.attributes[name]; }
      addEventListener() {}
      all() { return this.children.filter(child => typeof child !== "string")
        .flatMap(child => [child, ...child.all()]); }
      querySelectorAll(selector) {
        const [parent, tag] = selector.split(" ");
        const scope = parent ? this.all().filter(item => item.className.split(" ")
          .includes(parent.slice(1))) : [this];
        return scope.flatMap(item => item.all()).filter(item => tag ? item.tagName === tag
          : item.className.split(" ").includes(selector.slice(1)));
      }
      querySelector(selector) {
        return this.all().find(item => item.className.split(" ").includes(selector.slice(1))) || null;
      }
    }
    const doc = { createElement: tag => new Element(tag) };
    const container = new Element("main");
    workspace.edit({ expectedResult: "Ordern bokförs utan fel." });
    workspace.recordDelivery({ deliveryId: "d3", at: "2026-11-06T13:00:00Z", method: "direct",
      outcome: "uncertain", to: ["support@example.com"], cc: ["kollega@example.com"] });
    workspace.recordDelivery({ deliveryId: "d4", at: "2026-11-06T14:00:00Z",
      method: "outlook-draft", outcome: "draft", to: ["support@example.com"] });
    view.render(container, workspace.state(), { locale: "sv-SE" }, doc);
    const items = [...container.querySelectorAll(".report-delivery-list li")];
    assert.deepStrictEqual(items.map(item => item.dataset.outcome), ["draft", "uncertain", "sent"]);
    assert.match(items[1].textContent, /^Kanske skickad .* till support@example\.com\. .*Kopia: kollega@example\.com\./u);
    assert.strictEqual(container.querySelector(".report-delivery-note").dataset.state, "current");
    workspace.edit({ expectedResult: "Ändrat efter mejlet." });
    view.render(container, workspace.state(), { locale: "fi-FI" }, doc);
    const note = container.querySelector(".report-delivery-note");
    assert.strictEqual(note.dataset.state, "changed");
    assert.strictEqual(note.textContent, ui.T9UiI18n.translate("technical.deliveryChanged", "fi-FI"));
    // The report's accessible name is in the interface language.
    for (const { locale } of languages.supported("ui")) {
      view.render(container, workspace.state(), { locale }, doc);
      const name = container.attributes["aria-label"];
      assert.ok(name.endsWith(`: ${workspace.state().document.title}`), `${locale} ${name}`);
      assert.strictEqual(name.split(": ")[0], ui.T9UiI18n.translateStaticText("Technical Bug Report", locale));
      if (locale !== "en-US") assert.ok(!name.startsWith("Technical Bug Report"), `${locale} ${name}`);
    }
    // A report without history shows no history section.
    view.render(container, { ...workspace.state(), report: { ...workspace.state().report,
      deliveries: [] } }, { locale: "sv-SE" }, doc);
    assert.strictEqual(container.querySelector(".report-deliveries"), null);
  }

  // The library card shows the latest email in every interface language.
  const libraryView = require("../src/ui/document-library-view");
  const record = { projectId: "delivery", title: "Fel", tags: [], documentLanguage: "sv-SE",
    metadata: { recordingPurpose: "bug-report" }, modifiedAt: "2026-11-06T10:00:00Z" };
  const html = (locale, delivery) => {
    const target = { innerHTML: "" };
    libraryView.renderList(target, [record], { locale, deliveries: new Map(delivery
      ? [["delivery", delivery]] : []) });
    return target.innerHTML;
  };
  assert.ok(!html("sv-SE", null).includes("library-delivery"));
  assert.match(html("sv-SE", { outcome: "sent", at: "2026-11-06T11:00:00Z" }), /Skickad 6 nov\. 2026/u);
  assert.match(html("sv-SE", { outcome: "uncertain", at: "2026-11-06T11:00:00Z" }), /Kanske skickad/u);
  assert.match(html("sv-SE", { outcome: "draft", at: "2026-11-06T11:00:00Z" }), /E-post förberedd/u);
  for (const { locale } of languages.supported("ui")) {
    for (const english of ["Sent {date}", "Possibly sent {date}", "Email prepared {date}"]) {
      const value = languages.translate(english, locale, locale === "sv-SE" ? "x {date}" : english);
      assert.ok(value.includes("{date}"), `${locale} ${english}`);
      if (!["en-US", "sv-SE"].includes(locale)) assert.notStrictEqual(value, english, `${locale} ${english}`);
    }
  }

  // The page records each email: a confirmed or uncertain direct send, an Outlook draft and
  // a saved email file, and the library reads the latest one.
  const page = read("src/ui/technical-report.js");
  assert.match(page, /recordDelivery\("direct", "sent", to\.valid, cc\.valid\)/u);
  assert.match(page, /recordDelivery\("direct", "uncertain", to\.valid, cc\.valid\)/u);
  assert.match(page, /recordDelivery\("outlook-draft", "draft"/u);
  assert.match(page, /"message\/rfc822;charset=utf-8", true\);\s+recordDelivery\("eml", "file"/u);
  const dashboard = read("src/ui/dashboard.js");
  assert.match(dashboard, /deliveries: documentLibraryDeliveries/u);
  assert.match(dashboard, /findLast\(item => \["sent", "uncertain"\]\.includes\(item\.outcome\)\)/u);
  {
    // A report emailed from its own tab updates an open library without a reload.
    const start = dashboard.indexOf("function libraryDelivery(");
    const end = dashboard.indexOf("chrome.storage?.onChanged?.addListener(updateLibraryDeliveries);");
    assert.ok(start > 0 && end > start, "the library listens for email history changes");
    assert.match(read("src/ui/dashboard.html"), /<script src="engine\/storage-keys\.js"><\/script>/u);
    const renders = [];
    const context = vm.createContext({ globalThis: {}, JSON, Array, Object, clearTimeout() {},
      setTimeout: callback => callback(), renderDocumentLibrary: () => renders.push(1) });
    context.globalThis.T9StorageKeys = require("../src/engine/storage-keys");
    vm.runInContext(`let documentLibraryDeliveries = new Map(); let documentLibraryRecords = [{}];
      ${dashboard.slice(start, end)}`, context);
    const update = (changes, area = "local") => vm.runInContext("updateLibraryDeliveries",
      context)(changes, area);
    const deliveries = () => vm.runInContext("documentLibraryDeliveries", context);
    const key = "t9_bug_report_r1";
    const sentReport = { recordingId: "rec-1", deliveries: [
      { deliveryId: "a", outcome: "sent", at: "2026-11-06T11:00:00Z" }] };
    update({ [key]: { newValue: sentReport } });
    assert.strictEqual(deliveries().get("rec-1").deliveryId, "a");
    assert.strictEqual(renders.length, 1);
    // Saving the report without a new email does not redraw the library.
    update({ [key]: { oldValue: sentReport, newValue: { ...sentReport, title: "Ändrad" } } });
    assert.strictEqual(renders.length, 1);
    // A later draft does not hide that the report was sent.
    update({ [key]: { newValue: { ...sentReport, deliveries: [...sentReport.deliveries,
      { deliveryId: "b", outcome: "draft", at: "2026-11-06T12:00:00Z" }] } } });
    assert.strictEqual(deliveries().get("rec-1").deliveryId, "a");
    update({ [key]: { oldValue: sentReport } });
    assert.strictEqual(deliveries().has("rec-1"), false, "a deleted report shows no email");
    assert.strictEqual(renders.length, 2);
    update({ t9_session_x: { newValue: {} } });
    update({ [key]: { newValue: sentReport } }, "sync");
    assert.strictEqual(renders.length, 2, "other storage changes are ignored");
  }
  console.log("Bug report delivery history tests passed.");
})().catch(error => { console.error(error); process.exitCode = 1; });
