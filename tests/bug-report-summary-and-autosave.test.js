// The copied bug report summary and the autosave updates that must leave the report fields
// the user is working in untouched.
const assert = require("assert");
const fs = require("fs");
const path = require("path");
globalThis.T9TextFormat = require("../src/engine/text-format");
const languages = require("../src/engine/language-registry");
const model = require("../src/bug-report/bug-report-model");
const generator = require("../src/bug-report/bug-report-generator");
const exporter = require("../src/bug-report/bug-report-text-export");
const workspace = require("../src/bug-report/technical-report-workspace");
const view = require("../src/ui/technical-report-workspace-view");

const evidence = [{ errorEvidenceId: "error-1", recordingId: "recording-1",
  capturedAt: "2026-08-24T10:00:00Z",
  rawMessage: "Antal att leverera (5) får inte vara större än <3>.",
  diagnosticsStatus: "diagnostics-unavailable" }];
const report = locale => model.normalize({ schemaVersion: 1, bugReportId: "bug-report:1",
  recordingId: "recording-1", status: "draft", documentLanguage: locale,
  createdAt: evidence[0].capturedAt, updatedAt: evidence[0].capturedAt,
  summary: { title: "Bokföring & leverans misslyckas", severity: "High" },
  expectedResult: { text: "Ordern ska bokföras." },
  actualResult: { human: { text: "Knappen gör ingenting först." } },
  reproduction: { steps: [
    { reproductionStepId: "s1", instruction: "Ange __5__ i **Antal att leverera**." },
    { reproductionStepId: "s2", instruction: "Välj **Bokför**.", visibility: "hidden" },
    { reproductionStepId: "s3", instruction: "Välj **Leverera**." }] } });

// The summary lists the title, severity, visible steps, expected and actual result in order.
const swedish = generator.project(report("sv-SE"), { errorEvidence: evidence });
const summary = exporter.summary(swedish);
const sectionTitle = (document, id) => document.sections.find(section => section.id === id).title;
assert.strictEqual(summary.text, [
  "Bokföring & leverans misslyckas", "Allvarlighetsgrad: Hög", "",
  sectionTitle(swedish, "reproduction"), "1. Ange 5 i \"Antal att leverera\".",
  "2. Välj \"Leverera\".", "",
  sectionTitle(swedish, "expected-result"), "Ordern ska bokföras.", "",
  sectionTitle(swedish, "actual-result"), "Knappen gör ingenting först.",
  "Antal att leverera (5) får inte vara större än <3>.", ""].join("\n"));
assert.ok(summary.html.startsWith("<p><strong>Bokföring &amp; leverans misslyckas</strong></p>"));
assert.ok(summary.html.includes("<li>Ange <strong>5</strong> i <em>Antal att leverera</em>.</li>"));
assert.ok(summary.html.includes("större än &lt;3&gt;.</p>"), "captured text is escaped, not altered");
assert.ok(!summary.html.includes("Bokför</em>"), "hidden steps are left out");

// Every document language gets its own headings and severity; captured and typed text stays.
for (const { locale } of languages.supported("document")) {
  const document = generator.project(report(locale), { errorEvidence: evidence });
  const { text } = exporter.summary(document);
  for (const id of ["reproduction", "expected-result", "actual-result"]) {
    assert.ok(text.includes(`\n${sectionTitle(document, id)}\n`), `${locale} ${id}`);
  }
  const severity = text.split("\n")[1];
  assert.match(severity, /^[^:]+: \S/u, locale);
  if (locale !== "en-US") assert.notStrictEqual(severity, "Severity: High", locale);
  assert.ok(text.includes("Ordern ska bokföras.") && text.includes("(5) får inte"), locale);
  assert.doesNotMatch(text, /undefined|\*\*|__/u, locale);
}

// A report without severity, expected result or steps leaves those parts out.
const bare = generator.project(model.normalize({ schemaVersion: 1, bugReportId: "bug-report:2",
  recordingId: "recording-2", status: "draft", documentLanguage: "en-US",
  createdAt: evidence[0].capturedAt, updatedAt: evidence[0].capturedAt,
  summary: { title: "Only a title" } }), { errorEvidence: [] });
assert.strictEqual(exporter.summary(bare).text, "Only a title\n");

// Saving does not change the revision; edits, undo and redo do.
(async () => {
  const controller = workspace.create({ report: report("en-US"), errorEvidence: evidence,
    store: { save: async value => model.normalize(value) } });
  const first = controller.state().revision;
  controller.edit({ expectedResult: "Posted." });
  const edited = controller.state().revision;
  assert.ok(edited > first);
  await controller.save();
  assert.strictEqual(controller.state().saveState, "saved");
  assert.strictEqual(controller.state().revision, edited, "a save is not a new revision");
  controller.undo();
  assert.ok(controller.state().revision > edited);

  // A save that changes what the report says records when it was edited, so the library shows
  // the edit; an email recorded on an unchanged report does not move the time.
  const times = ["2026-11-09T08:00:00.000Z", "2026-11-09T09:00:00.000Z", "2026-11-09T10:00:00.000Z"];
  const saved = [];
  const timed = workspace.create({ report: report("en-US"), errorEvidence: evidence,
    now: () => times.shift(), store: { save: async value => { saved.push(value);
      return model.normalize(value); } } });
  await timed.save();
  assert.strictEqual(saved.at(-1).updatedAt, evidence[0].capturedAt, "an unchanged report keeps its time");
  timed.edit({ summary: { title: "Posting fails" } });
  await timed.save();
  assert.strictEqual(saved.at(-1).updatedAt, "2026-11-09T08:00:00.000Z");
  assert.strictEqual(timed.state().report.updatedAt, "2026-11-09T08:00:00.000Z");
  timed.recordDelivery({ deliveryId: "d1", method: "outlook-send", outcome: "sent",
    at: "2026-11-09T08:30:00.000Z", to: ["support@example.com"] });
  await timed.save();
  assert.strictEqual(saved.at(-1).updatedAt, "2026-11-09T08:00:00.000Z", "an email is not an edit");
  timed.undo();
  await timed.save();
  assert.strictEqual(saved.at(-1).updatedAt, "2026-11-09T09:00:00.000Z", "undo is an edit");

  // The library shows the later of the recording's and the report's edit time, also while open.
  const dashboard = fs.readFileSync(path.join(__dirname, "../src/ui/dashboard.js"), "utf8");
  assert.match(dashboard, /modifiedAt: latestTimestamp\(sessionRecord\.modifiedAt, report\?\.updatedAt\)/);
  assert.match(dashboard, /refreshLibraryReportRecord\(recordingId, change\.newValue\)/);
  const latest = new Function(`${dashboard.match(/function latestTimestamp[\s\S]*?\n}\n/)[0]}return latestTimestamp;`)();
  assert.strictEqual(latest("2026-11-06T10:00:00Z", "2026-11-09T08:00:00Z"), "2026-11-09T08:00:00Z");
  assert.strictEqual(latest("2026-11-06T10:00:00Z", undefined), "2026-11-06T10:00:00Z");

  // The view updates the save status in place and leaves the fields alone.
  class Element {
    constructor(tag) { this.tagName = tag; this.children = []; this.dataset = {};
      this.attributes = {}; this._text = ""; this.className = ""; this.value = ""; }
    get textContent() { return this._text; }
    set textContent(value) { this._text = String(value); this.children = []; }
    appendChild(child) { this.children.push(child); return child; }
    append(...children) { children.forEach(child => this.appendChild(child)); }
    replaceChildren(...children) { this.children = []; this.append(...children); }
    setAttribute(name, value) { this.attributes[name] = String(value); }
    addEventListener() {}
    querySelector(selector) {
      const name = selector.replace(/^\./u, "");
      for (const child of this.children) {
        if (child.className.split(" ").includes(name)) return child;
        const found = child.querySelector(selector);
        if (found) return found;
      }
      return null;
    }
  }
  const doc = { createElement: tag => new Element(tag) };
  const container = new Element("main");
  view.render(container, controller.state(), {}, doc);
  const status = container.querySelector(".save-state");
  const fields = container.children.find(child => child.className === "report-core-fields");
  assert.ok(status && fields);
  assert.strictEqual(view.renderSaveState(container, { ...controller.state(),
    saveState: "failed" }, { onRetrySave() {} }, doc), true);
  assert.strictEqual(container.querySelector(".save-state"), status, "same status element");
  assert.strictEqual(status.className, "save-state save-state-failed");
  assert.strictEqual(status.children[0].dataset.focusKey, "retry-save");
  assert.ok(container.children.includes(fields), "fields are not rebuilt");
  assert.strictEqual(view.renderSaveState(new Element("main"), controller.state(), {}, doc), false);

  // The page draws a save on the status only, keeps focus and typed text across rebuilds and
  // reports a file as saved only once the download has completed.
  const page = fs.readFileSync(path.join(__dirname, "../src/ui/technical-report.js"), "utf8");
  const html = fs.readFileSync(path.join(__dirname, "../src/ui/technical-report.html"), "utf8");
  assert.match(page, /state\.revision === renderedRevision && globalThis\.T9TechnicalReportWorkspaceView\s+\.renderSaveState/);
  assert.match(page, /restoreFocus\(focus\);/);
  assert.match(page, /await downloadCompleted\(result\.downloadId\);/);
  assert.doesNotMatch(page, /felrapport\.pdf|includeTechnicalPackage|JSON\.stringify\(offline/);
  assert.match(html, /<main id="technicalReport"><\/main>/, "the report is not one live region");
  assert.match(html, /id="copySummary"[^>]*data-i18n="technical\.copySummary"/);
  // Copying the summary is a secondary action, next to Markdown export under More options.
  assert.match(html, /class="report-options"[\s\S]*id="downloadMarkdown"[\s\S]*id="copySummary"[\s\S]*<\/details>/);
  assert.doesNotMatch(html.slice(html.indexOf('class="primary-actions"'), html.indexOf('class="report-options"')), /copySummary/);

  // The new messages exist in every interface language.
  globalThis.T9LanguageRegistry = languages;
  globalThis.T9LocaleCatalogs = require("../src/engine/locale-catalogs");
  require("../src/ui/i18n");
  const keys = ["technical.creatingPdf", "technical.creatingEmail",
    "technical.waitingForDownload", "technical.downloadNotSaved", "technical.copied",
    "technical.copyFailed", "technical.copySummary", "technical.copySummaryHelp",
    "technical.summaryCopied", "technical.regenerateTitle", "technical.regenerateAction",
    "technical.cancel", "technical.regenerateConfirm"];
  const english = Object.fromEntries(keys.map(key => [key,
    globalThis.T9UiI18n.translate(key, "en-US")]));
  for (const { locale } of languages.supported("ui")) {
    for (const key of keys) {
      const value = globalThis.T9UiI18n.translate(key, locale);
      assert.ok(value && value !== key, `${locale} ${key}`);
      if (locale !== "en-US" && key !== "technical.copied") {
        assert.notStrictEqual(value, english[key], `${locale} ${key} is translated`);
      }
    }
  }
  console.log("Bug report summary and autosave tests passed.");
})().catch(error => { console.error(error); process.exit(1); });
