// Masking values is chosen in each bug report: the recording keeps the values (apart from
// secrets), the report holds a masked version of its recorded steps, and the choice applies
// to the report, PDF, email and summary alike.
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
globalThis.T9TextFormat = require("../src/engine/text-format");
const languages = require("../src/engine/language-registry");
const privacy = require("../src/engine/privacy-mask");
const canonical = require("../src/engine/canonical-recording");
const model = require("../src/bug-report/bug-report-model");
const service = require("../src/bug-report/bug-report-service");
const generator = require("../src/bug-report/bug-report-generator");
const exporter = require("../src/bug-report/bug-report-text-export");
const issuePackage = require("../src/bug-report/issue-package");
const read = file => fs.readFileSync(path.join(__dirname, "..", file), "utf8");

// A bug report recording masks secrets only; other recordings mask as before.
assert.strictEqual(privacy.mask("Amount", "1 250,00", { maskValues: "secrets" }), "1 250,00");
assert.strictEqual(privacy.mask("E-mail", "anna@example.com", { maskValues: "secrets" }),
  "anna@example.com");
assert.strictEqual(privacy.mask("Password", "hunter2", { maskValues: "secrets" }), "[maskerat]");
assert.strictEqual(privacy.mask("Amount", "1 250,00", {}), "[belopp]");
assert.strictEqual(privacy.mask("Amount", "1 250,00", { maskValues: false }), "1 250,00");
// Placeholders can follow a report's document language.
assert.strictEqual(privacy.mask("Amount", "5", { labels: { amount: "[Betrag]" } }), "[Betrag]");
const recorded = { id: "e1", value: "1 250,00", previousValue: "0", control: { name: "Amount" },
  raw: { fieldName: "Amount", value: "1 250,00", enteredValue: "1250" } };
const maskedEvent = privacy.maskRecordedEvent(recorded, { maskValues: true });
assert.deepStrictEqual([maskedEvent.value, maskedEvent.previousValue, maskedEvent.raw.value,
  maskedEvent.raw.enteredValue], ["[belopp]", "[belopp]", "[belopp]", "[belopp]"]);
assert.strictEqual(recorded.raw.value, "1 250,00", "the recording is not changed");

// Masked step texts. Interpretation can drop a step whose value is a placeholder, so a
// masked step counts only when it comes from the same events, and the step's own values are
// replaced either way; nothing the mask hides may remain.
const events = [
  { id: "a", value: "1 250,00", raw: { fieldName: "Belopp", value: "1 250,00" } },
  { id: "b", value: "PO-1001", raw: { fieldName: "External Document No.", value: "PO-1001" } },
  { id: "c", value: "5", raw: { fieldName: "Amount", value: "5" } },
  { id: "d", value: "anna@example.com", raw: { fieldName: "Contact", value: "anna@example.com" } }];
const hide = event => privacy.maskRecordedEvent(event, { maskValues: true });
const realTasks = [
  { taskId: "t1", instruction: "Välj **1 250,00** i **Customer Name**.", sourceEventIds: ["a"] },
  { taskId: "t2", instruction: "Ange __PO-1001__ i **External Document No.**.", sourceEventIds: ["b"] },
  { taskId: "t3", instruction: "Ange __5__ i **Amount** på rad 5.", sourceEventIds: ["c"] },
  { taskId: "t4", instruction: "Ange __anna@example.com__ i **Contact**.", sourceEventIds: ["d"] }];
// The masked derivation dropped the first step, so its ids no longer line up.
const shifted = [
  { taskId: "t1", instruction: "Ange __PO-1001__ i **External Document No.**.", sourceEventIds: ["b"] },
  { taskId: "t2", instruction: "Ange __[belopp]__ i **Amount** på rad 5.", sourceEventIds: ["c"] }];
const texts = privacy.maskedStepTexts(realTasks, shifted, events, hide);
assert.deepStrictEqual(texts.map(item => item.taskId), ["t1", "t2", "t3", "t4"]);
assert.deepStrictEqual(texts.map(item => item.instruction), [
  "Välj **[belopp]** i **Customer Name**.",
  "Ange __PO-1001__ i **External Document No.**.",
  "Ange __[belopp]__ i **Amount** på rad 5.",
  "Ange __[e-postadress]__ i **Contact**."]);
assert.ok(!texts.some(item => /1 250,00|anna@example\.com/u.test(item.instruction)));
assert.deepStrictEqual(privacy.maskedStepTexts(realTasks.slice(2, 3), [], events, hide)
  .map(item => item.instruction), ["Ange __[belopp]__ i **Amount** på rad 5."],
  "a short value is replaced where it is marked, not in other text");

// Every document language has its own placeholders.
for (const { locale } of languages.supported("document")) {
  const amount = languages.translate("[amount]", locale, "[belopp]");
  assert.ok(/^\[.+\]$/u.test(amount), locale);
  if (!["en-US"].includes(locale)) assert.notStrictEqual(amount, "[amount]", locale);
  for (const english of ["[masked]", "[email address]", "[current customer]",
    "[current vendor]", "[current item]", "[ID]"]) {
    assert.ok(/^\[.+\]$/u.test(languages.translate(english, locale, english)), locale + english);
  }
}

// A new report holds the masked step text beside the captured one and masks by default.
let recording = canonical.create({ id: "masking", startedAt: "2026-11-06T10:00:00Z",
  recordingPurpose: "bug-report" });
recording = canonical.finish(recording, "2026-11-06T10:01:00Z");
const steps = [
  { taskId: "t1", instruction: "Ange __1 250,00__ i **Belopp**.", sourceEventIds: ["e1"] },
  { taskId: "t2", instruction: "Välj **Bokför**.", sourceEventIds: ["e2"] }];
const maskedSteps = [
  { taskId: "t1", instruction: "Ange __[belopp]__ i **Belopp**." },
  { taskId: "t2", instruction: "Välj **Bokför**." }];
const created = service.createBugReportFromRecording(recording, steps, {
  documentLanguage: "sv-SE", maskedSteps, now: "2026-11-06T10:02:00Z" });
assert.deepStrictEqual(created.privacy, { maskValues: true });
assert.strictEqual(created.reproduction.steps[0].instruction, "Ange __1 250,00__ i **Belopp**.");
assert.strictEqual(created.reproduction.steps[0].maskedInstruction, "Ange __[belopp]__ i **Belopp**.");
assert.ok(!("maskedInstruction" in created.reproduction.steps[1]), "kept only where it differs");
// Steps are matched by position when the derivations have no shared task ids.
const byPosition = service.createBugReportFromRecording(recording,
  steps.map(({ taskId, ...step }) => step), { maskedSteps: maskedSteps.map(({ taskId, ...step }) => step) });
assert.strictEqual(byPosition.reproduction.steps[0].maskedInstruction, "Ange __[belopp]__ i **Belopp**.");
assert.strictEqual(generator.hasMaskableValues(created), true);

// The choice decides what the report, the summary and the issue package (PDF, email) show.
const shown = report => generator.project(report).sections
  .find(section => section.id === "reproduction").content.map(step => step.instruction);
assert.deepStrictEqual(shown(created), ["Ange __[belopp]__ i **Belopp**.", "Välj **Bokför**."]);
assert.ok(exporter.summary(generator.project(created)).text.includes("Ange [belopp] i"));
assert.ok(!JSON.stringify(issuePackage.build(created).reproduction).includes("1 250,00"));
const unmasked = model.updateHumanContent(created, { privacy: { maskValues: false } });
assert.deepStrictEqual(unmasked.privacy, { maskValues: false });
assert.deepStrictEqual(shown(unmasked), ["Ange __1 250,00__ i **Belopp**.", "Välj **Bokför**."]);
assert.ok(JSON.stringify(issuePackage.build(unmasked).reproduction).includes("1 250,00"));
// Text the user wrote is shown as written whichever is chosen.
const edited = model.updateReproductionStep(created, created.reproduction.steps[0].reproductionStepId,
  { instruction: "Ange beloppet i **Belopp**." });
assert.strictEqual(shown(edited)[0], "Ange beloppet i **Belopp**.");
assert.strictEqual(shown(model.updateHumanContent(edited, { privacy: { maskValues: false } }))[0],
  "Ange beloppet i **Belopp**.");
// Older reports, recorded with values already masked, keep showing what they had.
const older = model.normalize({ ...created, privacy: undefined,
  reproduction: { steps: [{ reproductionStepId: "s1", instruction: "Ange __[belopp]__." }] } });
assert.deepStrictEqual(shown(older), ["Ange __[belopp]__."]);
assert.strictEqual(generator.hasMaskableValues(older), false);
// Regenerating keeps the choice.
const regenerated = service.regenerate(unmasked, recording, steps, { maskedSteps });
assert.deepStrictEqual(regenerated.privacy, { maskValues: false });
assert.strictEqual(regenerated.reproduction.steps[0].maskedInstruction, "Ange __[belopp]__ i **Belopp**.");

// The recorder keeps values for bug reports and derives the masked steps when a report is made.
const background = read("src/recorder/background.js");
assert.match(background, /session\.recordingPurpose === "bug-report" &&\s+settings\.maskValues !== false \? \{ \.\.\.settings, maskValues: "secrets" \}/);
assert.match(background, /const tasks = await deriveBugReportTasks\(kept, screenshotManifest\);/);
assert.match(background, /const maskedSteps = globalThis\.T9PrivacyMask\.maskedStepTexts\(tasks,\s+await deriveBugReportTasks\(masked\(true\), screenshotManifest\), kept\.events,/);
assert.match(background, /errorEvidence: errors, maskedSteps,\s+documentLanguage/);

// The report offers the choice, described in every interface language.
const view = read("src/ui/technical-report-workspace-view.js");
assert.match(view, /onEdit\("privacy", \{ maskValues: mask\.checked \}\)/);
assert.match(view, /generator\.displayInstruction\(step, workspaceState\.report\)/);
const ui = vm.createContext({ T9LanguageRegistry: languages });
vm.runInContext(read("src/ui/i18n.js"), ui);
for (const { locale } of languages.supported("ui")) {
  for (const key of ["technical.maskValues", "technical.maskValuesHelp", "technical.maskValuesNone"]) {
    const value = ui.T9UiI18n.translate(key, locale);
    assert.notStrictEqual(value, key, locale + " " + key);
    if (locale !== "en-US") assert.notStrictEqual(value, ui.T9UiI18n.translate(key, "en-US"), locale + key);
  }
}
console.log("Bug report value masking tests passed.");
