// Which steps of a test a recording shows as done: the same kind of action on the same page
// and field or button, in order, with values free to differ.
const assert = require("assert");
const matcher = require("../src/document/test-recording-match");

const task = (taskType, pageObjectId, fieldId, extra = {}) => ({ taskType, pageObjectId,
  knowledgeObjectRef: { objectId: pageObjectId }, knowledgeControlRef: { fieldId },
  pageCaption: extra.pageCaption || "", fieldCaption: extra.fieldCaption || "",
  actionCaption: extra.actionCaption || "", ...extra });
const documented = [
  task("SearchAndOpenPage", "9307", "", { actionCaption: "Inköpsorder" }),
  task("CreateRecord", "50", "Control-New", { actionCaption: "Ny" }),
  task("FillField", "50", "Field-Buy-from Vendor No.", { fieldCaption: "Leverantörsnr" }),
  task("FillField", "54", "Field-Quantity", { fieldCaption: "Antal" }),
  task("RunAction", "50", "Control-Post", { actionCaption: "Bokför" })
];
const steps = documented.map((value, index) => ({ stepId: `block:step:${index + 1}`,
  signature: matcher.signature(value) }));

// The same process with other values, and in English: ids decide, so captions may differ.
const english = [
  task("SearchAndOpenPage", "9307", "", { actionCaption: "Purchase Orders" }),
  task("CreateRecord", "50", "Control-New", { actionCaption: "New" }),
  task("FillField", "50", "Field-Buy-from Vendor No.", { fieldCaption: "Vendor No.", value: "20000" }),
  task("FillField", "54", "Field-Quantity", { fieldCaption: "Quantity", value: "7" }),
  task("RunAction", "50", "Control-Post", { actionCaption: "Post" })
];
let result = matcher.match(steps, english);
assert.deepStrictEqual(result.steps.map(step => step.state),
  ["done", "done", "done", "done", "done"],
  "opening the same page is the same step, whatever was typed to find it");
assert.deepStrictEqual(result.steps.map(step => step.taskIndex), [0, 1, 2, 3, 4]);
assert.strictEqual(result.steps[0].score, 0.94);
assert.ok(result.steps.slice(1).every(step => step.score === 1));
assert.deepStrictEqual(result.additional, []);

// A skipped step is not found; a detour is additional; order is kept.
const detour = [english[1], task("FillField", "50", "Field-Posting Date", { fieldCaption: "Posting Date" }),
  english[2], english[4]];
result = matcher.match(steps, detour);
assert.deepStrictEqual(result.steps.map(step => step.state),
  ["not-found", "done", "done", "not-found", "done"]);
assert.deepStrictEqual(result.additional, [1]);

// Steps done in another order: the pairing keeps the order, so the best in-order pairing wins.
result = matcher.match(steps.slice(1, 4), [english[3], english[1], english[2]]);
assert.deepStrictEqual(result.steps.map(step => step.state), ["done", "done", "not-found"]);

// A repeated action is paired once; a recorded step counts for one test step only.
result = matcher.match([steps[2], steps[2]], [english[2]]);
assert.deepStrictEqual(result.steps.map(step => step.state), ["done", "not-found"]);

// Without ids, captions decide, and a page that differs rules a pair out.
const byCaption = value => ({ taskType: value.taskType, pageCaption: value.page, fieldCaption: value.field });
const captionStep = { stepId: "s", signature: matcher.signature(byCaption({ taskType: "FillField",
  page: "Inköpsorder", field: "Antal" })) };
assert.strictEqual(matcher.match([captionStep], [byCaption({ taskType: "FillField", page: " inköpsorder ",
  field: "ANTAL" })]).steps[0].state, "done", "captions are compared without case and spacing");
assert.strictEqual(matcher.match([captionStep], [byCaption({ taskType: "FillField", page: "Försäljningsorder",
  field: "Antal" })]).steps[0].state, "not-found");
// The same field on the same page interpreted as another kind of action is still the step,
// with a lower score; with neither page nor control known it is not enough.
assert.strictEqual(matcher.match([captionStep], [byCaption({ taskType: "SelectOption", page: "Inköpsorder",
  field: "Antal" })]).steps[0].score, 0.68, "another kind of action on the same field and page");
assert.strictEqual(matcher.match([{ stepId: "s", signature: matcher.signature({ taskType: "FillField",
  fieldCaption: "Antal" }) }], [{ taskType: "SelectOption", fieldCaption: "Antal" }]).steps[0].state,
  "not-found", "another kind of action on a field without a known page");
assert.strictEqual(matcher.score(matcher.signature(task("RunAction", "99000831", "Control-Change Status")),
  matcher.signature(task("ChangeProductionOrderStatus", "99000831", "Control-Change Status"))), 0.75,
  "the same button on the same page, interpreted more precisely");

// A step made before signatures were kept cannot be compared and says so.
result = matcher.match([{ stepId: "old" }], english);
assert.deepStrictEqual(result.steps, [{ stepId: "old", state: "unknown" }]);
assert.deepStrictEqual(matcher.match([], []), { steps: [], additional: [] });

// Larger inputs stay quick: 200 steps against 400 recorded steps.
const many = Array.from({ length: 400 }, (_, index) => task("FillField", "50", `Field-${index % 37}`));
const started = Date.now();
matcher.match(Array.from({ length: 200 }, (_, index) => ({ stepId: `s${index}`,
  signature: matcher.signature(many[index * 2]) })), many);
assert.ok(Date.now() - started < 1000);
console.log("Test recording match tests passed.");

// A test made from a document keeps each step's signature, so a later recording can be
// compared with it; a step without one is kept as before.
const script = require("../src/document/test-script");
const documentWith = interactions => ({ metadata: { title: "Inköp", documentLanguage: "sv-SE" },
  sections: [{ kind: "workflow", blocks: interactions.map((interaction, index) => ({ kind: "step",
    blockId: `block:step:${index + 1}`, interaction, blocks: [{ kind: "paragraph",
      blockId: `block:instruction:${index + 1}`, text: `Steg ${index + 1}` }] })) }] });
const created = script.create(documentWith([documented[2], { taskType: "Unclassified" }]),
  { testRunId: "run", sessionId: "rec" });
assert.deepStrictEqual(created.steps[0].signature, matcher.signature(documented[2]));
assert.ok(!("signature" in created.steps[1]), "a step that cannot be compared has no signature");
const again = script.rerun(script.normalize(created), { testRunId: "run-2" });
assert.deepStrictEqual(again.steps[0].signature, created.steps[0].signature, "a new run keeps it");
assert.deepStrictEqual(matcher.match(again.steps, english).steps.map(step => step.state),
  ["done", "unknown"]);
console.log("Test recording match: signatures in test runs passed.");

// What the run keeps: a suggestion per step, with what was recorded for a step found in the
// recording. It never sets a result; approving the suggested steps passes only steps without
// one. A new run starts without suggestions.
const NOW = "2026-11-10T10:00:00.000Z";
const timed = english.map((value, index) => ({ ...value, instruction: `Recorded ${index + 1}`,
  at: `2026-11-10T09:0${index}:00.000Z` }));
const check = matcher.check(created.steps, [timed[2], task("FillField", "50", "Field-Posting Date",
  { instruction: "Set Posting Date" })]);
assert.deepStrictEqual(check, { recordedSteps: 2, steps: [{ stepId: "block:step:1", state: "done",
  taskIndex: 0, score: 1, instruction: "Recorded 3", at: "2026-11-10T09:02:00.000Z" },
  { stepId: "block:step:2", state: "unknown" }], additional: ["Set Posting Date"],
  recorded: [{ instruction: "Recorded 3", stepId: "block:step:1" },
    { instruction: "Set Posting Date", stepId: "" }] });
let checked = script.applyRecordingCheck(created, check, NOW);
assert.deepStrictEqual(checked.steps[0].recordingSuggestion, { state: "done",
  instruction: "Recorded 3", at: "2026-11-10T09:02:00.000Z" });
assert.deepStrictEqual(checked.steps[1].recordingSuggestion, { state: "unknown" });
assert.deepStrictEqual(checked.recordingCheck, { checkedAt: NOW, recordedSteps: 2,
  additional: ["Set Posting Date"], recorded: check.recorded });
assert.ok(checked.steps.every(step => step.status === "not-run"), "a suggestion is not a result");
assert.deepStrictEqual(script.suggestedPasses(checked), ["block:step:1"]);
const decided = script.updateStep(checked, "block:step:1", { status: "failed" }, NOW);
assert.deepStrictEqual(script.suggestedPasses(decided), [], "the tester's own result is kept");
// A later check replaces the earlier one, step by step.
checked = script.applyRecordingCheck(checked, { steps: [{ stepId: "block:step:1", state: "not-found" }] }, NOW);
assert.deepStrictEqual(checked.steps[0].recordingSuggestion, { state: "not-found" });
assert.ok(!("recordingSuggestion" in checked.steps[1]));
assert.deepStrictEqual(script.suggestedPasses(checked), []);
// A failed comparison keeps the recording's id and the earlier suggestions.
const failed = script.recordingCheckFailed(checked, "rec-test", NOW);
assert.deepStrictEqual(failed.recordingCheck, { checkedAt: NOW, recordedSteps: 0, additional: [],
  recorded: [], failed: true, recordingId: "rec-test", failedAt: NOW });
assert.deepStrictEqual(failed.steps[0].recordingSuggestion, { state: "not-found" });
const next = script.rerun(failed, { testRunId: "run-3", now: NOW });
assert.ok(!("recordingCheck" in next) && next.steps.every(step => !("recordingSuggestion" in step)),
  "a new run starts without the earlier recording's suggestions");
assert.deepStrictEqual(next.steps[0].signature, created.steps[0].signature);
// A step after which Business Central showed an error is suggested as failed, with the
// message as Business Central wrote it; it is not among the steps to approve, and failing it
// adds the message to the tester's comment once.
const failedCheck = matcher.check(created.steps, [{ ...timed[2], failed: true,
  error: "Leverantören 20000 är spärrad." }]);
assert.deepStrictEqual(failedCheck.steps[0], { stepId: "block:step:1", state: "failed", taskIndex: 0,
  score: 1, instruction: "Recorded 3", at: "2026-11-10T09:02:00.000Z", error: "Leverantören 20000 är spärrad." });
assert.deepStrictEqual(failedCheck.recorded, [{ instruction: "Recorded 3", stepId: "block:step:1",
  failed: true, error: "Leverantören 20000 är spärrad." }]);
let withError = script.applyRecordingCheck(created, failedCheck, NOW);
assert.deepStrictEqual(withError.steps[0].recordingSuggestion, { state: "failed",
  instruction: "Recorded 3", at: "2026-11-10T09:02:00.000Z", error: "Leverantören 20000 är spärrad." });
assert.strictEqual(withError.steps[0].status, "not-run", "an error is a suggestion, not a result");
assert.deepStrictEqual(script.suggestedPasses(withError), [], "a step with an error is not approved with the rest");
assert.deepStrictEqual(script.failureFromSuggestion(withError.steps[0]),
  { status: "failed", comment: "Leverantören 20000 är spärrad." });
withError = script.updateStep(withError, "block:step:1", { comment: "Spärrad." }, NOW);
assert.deepStrictEqual(script.failureFromSuggestion(withError.steps[0]),
  { status: "failed", comment: "Spärrad.\nLeverantören 20000 är spärrad." });
withError = script.updateStep(withError, "block:step:1", script.failureFromSuggestion(withError.steps[0]), NOW);
assert.strictEqual(script.failureFromSuggestion(withError.steps[0]).comment, withError.steps[0].comment,
  "the message is added only once");
// A screenshot from a recording says so; the tester's own do not.
let shot = script.addScreenshot(created, "block:step:1", { screenshotId: "shot-rec", capturedAt: NOW,
  source: "recording" }, NOW);
shot = script.addScreenshot(shot, "block:step:1", { screenshotId: "shot-own", capturedAt: NOW, source: "other" }, NOW);
assert.deepStrictEqual(script.normalize(shot).steps[0].screenshots, [
  { screenshotId: "shot-rec", capturedAt: NOW, source: "recording" }, { screenshotId: "shot-own", capturedAt: NOW }]);
console.log("Test recording match: suggestions in test runs passed.");

// The whole way, with events captured by the real content script: the recording is
// interpreted, made into a document and a test, and a later recording of the same process
// with other values, interpreted in another document language, is compared with the test.
const fs = require("fs");
const path = require("path");
const readJson = file => JSON.parse(fs.readFileSync(path.join(__dirname, "..", file), "utf8"));
const canonical = require("../src/engine/canonical-recording");
const identify = require("../src/engine/bc-ui-identification");
const normalization = require("../src/engine/event-normalization");
const grouping = require("../src/engine/event-step-grouping");
const pipeline = require("../src/engine/session-interpretation-pipeline");
const projector = require("../src/document/review-document-projector");
const knowledgePacks = readJson("src/knowledge-packs/index.json").packs.filter(pack => pack.enabled)
  .map(pack => readJson(`src/${pack.file}`));
function interpreted(events, locale) {
  let recording = canonical.create({ id: "lab", name: "Lab" });
  const sourceEvents = [];
  events.forEach((raw, index) => {
    recording = canonical.addEvent(recording, raw, identify.identify(raw, { eventId: `lab:event:${index}` }));
    sourceEvents.push({ ...raw, eventNo: index + 1, canonicalSourceEventId: recording.events.at(-1).id });
  });
  const normalized = normalization.normalizeRecording(recording);
  const grouped = grouping.group(normalized);
  return pipeline.interpret({ session: { id: "lab", name: "Lab", settings: { documentLanguage: locale } },
    events: sourceEvents, normalizedEvents: normalized.events, stepGroups: grouped.groups,
    supportingEvents: grouped.supportingEvents, groupingDiagnostics: grouped.diagnostics,
    imagePaths: {}, knowledgePacks }).businessTasks;
}
const labEvents = readJson("tests/fixtures/capture-lab/sales-order-typeahead.json").events;
const documentedTasks = interpreted(labEvents, "sv-SE");
const labDocument = projector.project({ sessionId: "lab", sessionName: "Lab", tasks: documentedTasks },
  { session: { id: "lab", settings: { documentLanguage: "sv-SE" } } }).document;
const labRun = script.create(labDocument, { testRunId: "lab-run", sessionId: "lab" });
assert.ok(labRun.steps.length >= 8 && labRun.steps.every(step => step.signature),
  "every step of the recorded process can be compared");
const retested = interpreted(labEvents.map(event => typeof event.value === "string" && event.value
  ? { ...event, value: `${event.value}9` } : event), "en-US");
let labCheck = matcher.check(labRun.steps, retested);
assert.ok(labCheck.steps.every(step => step.state === "done"), "the same process with other values");
assert.deepStrictEqual(labCheck.additional, []);
// A step left out of the test session is not found; the others still are.
labCheck = matcher.check(labRun.steps, retested.filter((_, index) => index !== 2));
assert.deepStrictEqual(labCheck.steps.map(step => step.state).filter(state => state !== "done"), ["not-found"]);
assert.strictEqual(labCheck.steps[2].state, "not-found");
console.log("Test recording match: captured process passed.");
// The recorded instruction is kept as plain text, without the document's marks.
assert.strictEqual(matcher.check(created.steps, [{ ...documented[2],
  instruction: "Ange __20000__ i **Leverantörsnr**." }]).steps[0].instruction, "Ange 20000 i Leverantörsnr.");

// A Business Central error captured after a recorded action belongs to that action: the
// step it was paired with is suggested as failed. The background reads the message from the
// error evidence the event names (testRecordingErrors).
const withBcError = labEvents.slice();
const postClick = withBcError[38];
withBcError.splice(39, 0, { type: "bc-error", category: "diagnostic", label: "Business Central error",
  errorEvidenceId: "err-1", interactionId: postClick.interactionId, timestamp: postClick.timestamp,
  frameId: postClick.frameId });
const erroredTasks = interpreted(withBcError, "sv-SE");
const erroredIndex = erroredTasks.findIndex(item => item.resultVerification?.status === "error");
assert.strictEqual(erroredIndex, erroredTasks.length - 1, "the error belongs to the posting step");
const errorEvent = erroredTasks[erroredIndex].resultVerification.outcomes
  .find(item => item.kind === "error-outcome").sourceEventIds;
assert.deepStrictEqual(errorEvent.length, 1);
const markedTasks = erroredTasks.map((item, index) => index === erroredIndex
  ? { ...item, failed: true, error: "Det finns inget att bokföra." } : item);
labCheck = matcher.check(labRun.steps, markedTasks);
assert.deepStrictEqual(labCheck.steps.map(step => step.state),
  [...Array(labRun.steps.length - 1).fill("done"), "failed"]);
assert.strictEqual(labCheck.steps.at(-1).error, "Det finns inget att bokföra.");
console.log("Test recording match: Business Central errors passed.");

// The same record chosen another way. In the captured process the customer is chosen by name;
// in the test it is chosen by number, in another field. That is the same step.
const byNumber = interpreted(JSON.parse(JSON.stringify(labEvents).split("Customer Name")
  .join("Customer No.").split("Adatum Corporation").join("10000")), "sv-SE");
assert.strictEqual(byNumber[1].fieldCaption, "Customer No.");
labCheck = matcher.check(labRun.steps, byNumber);
assert.ok(labCheck.steps.every(step => step.state === "done"), "customer chosen by number instead of name");
assert.strictEqual(labCheck.steps[1].score, 0.87);

// Choosing a record: the kind of record decides, not the field it was typed in.
const vendorBy = (taskType, controlId, fieldCaption) => ({ taskType, pageObjectId: "50",
  knowledgeControlRef: { controlId }, fieldCaption, actionCaption: fieldCaption });
const vendorStep = [{ stepId: "v", signature: matcher.signature(vendorBy("SelectVendor",
  "Control-Buy-from Vendor No.", "Leverantörsnr.")) }];
assert.strictEqual(matcher.match(vendorStep, [vendorBy("SelectVendor", "Control-Buy-from Vendor Name",
  "Leverantörsnamn")]).steps[0].score, 0.91, "vendor by name instead of number");
assert.strictEqual(matcher.match(vendorStep, [vendorBy("SelectItem", "Control-No.", "Nr")]).steps[0].state,
  "not-found", "an item is not a vendor");
assert.strictEqual(matcher.match(vendorStep, [vendorBy("SelectVendor", "Control-x", "Leverantörsnamn")
  ].map(item => ({ ...item, pageObjectId: "51" }))).steps[0].state, "not-found", "on another page");
// The same field family without a known kind: number and name of the same thing, in every
// language's way of writing it; other fields are not of the family.
for (const [a, b] of [["Vendor No.", "Vendor Name"], ["Buy-from Vendor No.", "Buy-from Vendor Name"],
  ["Leverantörsnr.", "Leverantörsnamn"], ["Leverantörsnr.", "Leverantör"], ["Kreditorennr.", "Kreditorenname"],
  ["Kreditornr.", "Kreditornavn"], ["Leverandørnr.", "Leverandørnavn"], ["Toimittajan nro", "Toimittajan nimi"],
  ["N° fournisseur", "Nom fournisseur"], ["N.º de proveedor", "Nombre del proveedor"]]) {
  const field = caption => ({ taskType: "EnterFieldValue", pageObjectId: "50", fieldCaption: caption });
  assert.strictEqual(matcher.match([{ stepId: "f", signature: matcher.signature(field(a)) }],
    [field(b)]).steps[0].score, 0.88, `${a} / ${b}`);
}
for (const [a, b] of [["Document No.", "Posting Date"], ["No.", "Name"], ["Buy-from Vendor No.",
  "Pay-to Vendor No."], ["Quantity", "Unit Price"], ["Description", "Description 2"]]) {
  const field = caption => ({ taskType: "EnterFieldValue", pageObjectId: "50", fieldCaption: caption });
  assert.strictEqual(matcher.match([{ stepId: "f", signature: matcher.signature(field(a)) }],
    [field(b)]).steps[0].state, "not-found", `${a} / ${b}`);
}
console.log("Test recording match: records chosen another way passed.");

// A real test of a purchase order (Swedish Business Central) and the recording made while it
// was run. The test was made from an older document that wrote the search as three steps;
// the order page is captioned with the order shown on it, which is another order in the test;
// the item was picked from the list in the document and searched for in the test.
const order = "Inköpsorder - 2600074 ∙ Exempelleverantören";
const testedOrder = "Inköpsorder - 2600078 ∙ Exempelleverantören";
const realStep = (taskType, fields, instruction) => ({ stepId: `real:${instruction.slice(0, 12)}`,
  instruction, signature: matcher.signature({ taskType, ...fields }) });
const realTest = [
  realStep("SearchAndOpenPage", { pageCaption: "Inköpsorder", actionCaption: "Sök", fieldCaption: "Sök" },
    "Välj **Sök**, ange söktext i **Sök** och välj **Inköpsorder**."),
  realStep("EnterFieldValue", { pageCaption: "Rhloqw RDG", fieldCaption: "Berätta vad du vill göra." },
    "Ange __ink ord__ i **Berätta vad du vill göra.**."),
  realStep("SelectRecord", { pageCaption: "Inköpsorder", actionCaption: "Inköpsorder Listor" },
    "Välj posten **Inköpsorder Listor** på sidan **Inköpsorder**."),
  realStep("CreateRecord", { pageCaption: "Inköpsorder", actionCaption: "Ny" },
    "Börja skapa en ny inköpsorder genom att välja **Ny** på sidan **Inköpsorder**."),
  realStep("SelectLookupValue", { pageCaption: order, fieldCaption: "Leverantörsnamn" },
    "Välj **Leverantörsnamn** __11976__."),
  realStep("SelectLookupValue", { pageCaption: order, fieldCaption: "Sortera efter Nr" },
    `Välj __30043__ i **Sortera efter Nr** på sidan **${order}**.`),
  realStep("EnterQuantity", { pageCaption: order, fieldCaption: "Antal" }, "Ange __5000__ i **Antal**."),
  realStep("ReleaseDocument", { pageCaption: order, actionCaption: "Släpp" },
    `Välj **Släpp** på sidan **${order}**.`)
];
const realRecording = [
  { taskType: "SearchAndOpenPage", pageCaption: "Rhloqw RDG", actionCaption: "Alt+Q",
    selectedCaption: "ink ord", instruction: "Sök efter __ink ord__ och öppna listan **Inköpsorder**.",
    resultVerification: { outcomes: [{ kind: "navigation", pageCaption: "Inköpsorder (RDG)" }] } },
  { taskType: "CreateRecord", pageCaption: "Inköpsorder", actionCaption: "Ny",
    instruction: "Börja skapa en ny inköpsorder genom att välja **Ny** på sidan **Inköpsorder**." },
  { taskType: "SelectVendor", pageCaption: testedOrder, fieldCaption: "Leverantörsnamn",
    instruction: "Välj __11976__ i **Leverantörsnamn**." },
  { taskType: "SelectItem", pageCaption: testedOrder, fieldCaption: "Artikelnr.",
    instruction: "Sök efter __30043__ i **Artikelnr.** och välj den filtrerade posten." },
  { taskType: "EnterQuantity", pageCaption: testedOrder, fieldCaption: "Antal",
    instruction: "Ange __5 000__ i **Antal**." },
  { taskType: "ReleaseDocument", pageCaption: testedOrder, actionCaption: "Släpp",
    instruction: `Välj **Släpp** på sidan **${testedOrder}**.` }
];
assert.strictEqual(matcher.pageName(order), "inköpsorder");
assert.strictEqual(matcher.pageName("Inköpsorder (RDG)"), "inköpsorder");
assert.strictEqual(matcher.pageName("Sales Order - Dynamics 365 Business Central"), "sales order");
assert.strictEqual(matcher.signature(realRecording[0]).openedPage, "inköpsorder");
assert.strictEqual(matcher.signature(realRecording[1]).openedPage, undefined, "only a search opens a page");
const realCheck = matcher.check(realTest, realRecording);
assert.deepStrictEqual(realCheck.steps.map(step => step.state), Array(8).fill("done"));
assert.deepStrictEqual(realCheck.steps.map(step => step.taskIndex), [0, 0, 0, 1, 2, 3, 4, 5],
  "the three steps of the old search are the one recorded search");
assert.deepStrictEqual(realCheck.additional, []);
assert.deepStrictEqual(realCheck.recorded.map(item => item.stepId),
  realTest.filter((_, index) => index !== 1 && index !== 2).map(step => step.stepId));
// A search that opened another page is not the test's search, and its parts stay with it.
const otherPage = [{ ...realRecording[0], instruction: "Sök efter __förs__ och öppna listan **Försäljningsorder**.",
  resultVerification: { outcomes: [{ kind: "navigation", pageCaption: "Försäljningsorder (RDG)" }] } }];
assert.deepStrictEqual(matcher.check(realTest.slice(0, 3), otherPage).steps.map(step => step.state),
  ["not-found", "not-found", "not-found"]);
// A number in the page caption is the record shown, not what was chosen; another item is
// another step.
const otherItem = [{ ...realRecording[3], instruction: `Sök efter __1896__ i **Artikelnr.** på sidan **${order}**.`,
  pageCaption: order }];
assert.strictEqual(matcher.check([realTest[5]], otherItem).steps[0].state, "not-found");
// Another order on the page is the same page; another page is not.
assert.ok(matcher.score(realTest[6].signature, matcher.signature(realRecording[4])) > matcher.MATCH_THRESHOLD);
assert.strictEqual(matcher.score(realTest[6].signature, matcher.signature({ ...realRecording[4],
  pageCaption: "Försäljningsorder - 1001 ∙ Adatum" })), 0);
console.log("Test recording match: a real purchase order test passed.");

// The same test where the knowledge named pages and fields differently when the document was
// made than when the test was recorded, the recorded search kept no page it opened, and the
// chosen search result was interpreted as an action: the captions still decide.
const idsOf = (sig, pageObjectId, controlId) => ({ ...sig, pageObjectId, controlId });
const knowledgeTest = realTest.map((step, index) => index === 2
  ? realStep("RunAction", { pageCaption: "Inköpsorder", actionCaption: "Inköpsorder Listor" }, step.instruction)
  : index === 4 || index === 6 ? { ...step, signature: idsOf(step.signature, "50", `Control-${index}`) } : step);
const knowledgeRecording = realRecording.map((task, index) => index === 0
  ? { ...task, resultVerification: { outcomes: [] } }
  : index === 2 || index === 4 ? { ...task, pageObjectId: "54", knowledgeControlRef: { controlId: `Field-${index}` } }
    : task);
const knowledgeCheck = matcher.check(knowledgeTest, knowledgeRecording);
assert.deepStrictEqual(knowledgeCheck.steps.map(step => step.state), Array(8).fill("done"));
assert.deepStrictEqual(knowledgeCheck.steps.map(step => step.taskIndex), [0, 0, 0, 1, 2, 3, 4, 5]);
// Ids that differ on pages with other names still rule a pair out.
assert.strictEqual(matcher.score(idsOf(realTest[6].signature, "50", "Control-6"), matcher.signature({
  ...knowledgeRecording[4], pageCaption: "Försäljningsorder - 1001 ∙ Adatum" })), 0);
console.log("Test recording match: ids from another knowledge passed.");

// The steps of the real test as the document gives them. Steps the document's rules rewrote
// ("Välj Leverantörsnamn 11976") have no interaction, only their semantic action, and are
// still compared. The recording is what the test recording held: one search step, the vendor
// by number, the item searched for, the quantity twice and the release on another order.
const purchaseRun = readJson("tests/fixtures/test-recording/purchase-order-run.json").steps;
assert.ok(purchaseRun.every(step => matcher.hasSignature(step.signature)), "every step can be compared");
const testedPage = "Inköpsorder - 2600082 ∙ Exempelleverantören";
const purchaseRecording = [
  { taskType: "SearchAndOpenPage", pageCaption: "Rhloqw RDG", actionCaption: "Alt+Q",
    instruction: "Sök efter __ink ord__ och öppna listan **Inköpsorder**.",
    resultVerification: { outcomes: [{ kind: "navigation", pageCaption: "Inköpsorder (RDG)" }] } },
  { taskType: "CreatePurchaseOrder", pageObjectId: "9307", pageCaption: "Inköpsorder", fieldCaption: "Ny",
    actionCaption: "Ny", instruction: "Börja skapa en ny **inköpsorder** genom att välja **Ny** på sidan **Inköpsorder**." },
  { taskType: "SelectVendor", pageObjectId: "50", pageCaption: "Ny - Inköpsorder", fieldCaption: "Leverantörsnamn",
    actionCaption: "Leverantörsnamn", instruction: "Välj **11976** i **Leverantörsnamn**." },
  { taskType: "SelectRecord", pageObjectId: "50", pageCaption: "Inköpsorder", fieldCaption: "Artikel Nr",
    actionCaption: "Nr, sorterade i Stigande order Välj posten \"30043\"",
    instruction: "Sök efter __30043__ i **Artikelnr.** och välj den filtrerade posten." },
  { taskType: "EnterQuantity", pageObjectId: "50", pageCaption: testedPage, fieldCaption: "Antal",
    actionCaption: "Antal", instruction: "Ange __5000__ i **Antal**." },
  { taskType: "EnterQuantity", pageObjectId: "50", pageCaption: testedPage, fieldCaption: "Antal",
    actionCaption: "Antal", instruction: "Ange __5 000__ i **Antal**." },
  { taskType: "ReleasePurchaseDocument", pageObjectId: "50", pageCaption: "Inköpsorder", actionCaption: "Släpp",
    instruction: `Välj **Släpp** på sidan **${testedPage}**.` }
];
const purchaseCheck = matcher.check(purchaseRun, purchaseRecording);
assert.deepStrictEqual(purchaseCheck.steps.map(step => step.state), Array(8).fill("done"));
assert.deepStrictEqual(purchaseCheck.steps.map(step => step.taskIndex), [0, 0, 0, 1, 2, 3, 4, 6]);
assert.deepStrictEqual(purchaseCheck.additional, ["Ange 5 000 i Antal."], "the quantity entered again");
// A page captioned for a new record ("Ny - Inköpsorder") and for a saved one are the same page;
// the number of a record is not a page name.
assert.ok(matcher.score(purchaseRun[6].signature, matcher.signature({ ...purchaseRecording[4],
  pageObjectId: "", pageCaption: "Ny - Inköpsorder" })) >= matcher.MATCH_THRESHOLD);
assert.strictEqual(matcher.score(purchaseRun[6].signature, matcher.signature({ ...purchaseRecording[4],
  pageObjectId: "", pageCaption: "Leverantörskort - 2600074 ∙ Exempelleverantören" })), 0);

// A test made from a document: a step the document's rules rewrote has a semantic action
// instead of an interaction, and gets its signature from it.
const rewritten = script.create({ metadata: { title: "Inköp", documentLanguage: "sv-SE" }, sections: [
  { kind: "workflow", blocks: [{ kind: "step", blockId: "block:step:v", semanticAction: { actionType: "SelectVendor",
    pageObjectId: "50", pageCaption: "Ny - Inköpsorder", targetField: "Leverantörsnamn", selectedValue: "11976" },
  blocks: [{ kind: "paragraph", blockId: "block:instruction:v", text: "Välj Leverantörsnamn 11976." }] }] }] },
{ testRunId: "rewritten", sessionId: "s" });
assert.deepStrictEqual(rewritten.steps[0].signature, { taskType: "SelectVendor", pageObjectId: "50",
  pageCaption: "ny - inköpsorder", controlId: "", fieldCaption: "leverantörsnamn", actionCaption: "" });
console.log("Test recording match: a test from a rewritten document passed.");

// The field's AL name from the web client (controlname) is the same in Swedish and English and
// in every session: a test and a recording that only share it still match, step by step.
{
  const named = (taskType, alControlName, fieldCaption) => ({ taskType, pageObjectId: "4",
    knowledgeObjectRef: { objectId: "4" }, knowledgeControlRef: { alControlName },
    pageCaption: "", fieldCaption, actionCaption: "" });
  const expected = [named("FillField", "Code", "Kod"),
    named("FillField", "Due Date Calculation", "Förfallodatumformel")];
  const alSteps = expected.map((value, index) => ({ stepId: `block:step:al-${index + 1}`,
    signature: matcher.signature(value) }));
  assert.strictEqual(alSteps[0].signature.alControlName, "Code");
  const run = matcher.match(alSteps, [named("FillField", "Code", "Code"),
    named("FillField", "Due Date Calculation", "Due Date Calculation")]);
  assert.deepStrictEqual(run.steps.map(step => step.state), ["done", "done"]);
  const other = matcher.match(alSteps, [named("FillField", "Description", "Description"),
    named("FillField", "Discount %", "Discount %")]);
  assert.ok(other.steps.every(step => step.state !== "done"),
    "other AL names and other captions do not match");
  assert.strictEqual(matcher.signature(task("FillField", "4", "Field-Code")).alControlName,
    undefined, "a step without an AL name keeps its signature as before");
  console.log("Test recording match: AL names match across languages passed.");
}

// Page Scripting plays a test back without clicks or typing: the steps it announces in a
// status message ("Pågående steg: Mata in 10000 i Leverantörsnr") count for the test's steps.
{
  const status = (label, extra = {}) => ({ id: `e-${label}`, raw: { type: "status-message", label,
    timestamp: "2026-11-16T10:00:00.000Z", ...extra } });
  const page = caption => ({ id: `p-${caption}`, raw: { type: "page-state", pageCaption: caption } });
  assert.strictEqual(matcher.playbackStep("Lista med rubriken Inköpsorder har nu 147 objekt"), null);
  assert.strictEqual(matcher.playbackStep("Sparad"), null);
  assert.deepStrictEqual(matcher.playbackStep("Pågående steg: Mata in 10000 i Leverantörsnr"),
    { kind: "input", instruction: "Mata in 10000 i Leverantörsnr", caption: "Leverantörsnr", value: "10000" });
  assert.strictEqual(matcher.playbackStep("Pågående steg: Anropa Skapa ny på Ny").operation, "New");
  assert.strictEqual(matcher.playbackStep("Pågående steg: Anropa Släpp").kind, "invoke");
  // In every language Page Scripting writes its steps in, whatever the words before the colon.
  assert.deepStrictEqual(["Current step: Enter 75 in Quantity", "Aktueller Schritt: 75 in Menge eingeben",
    "Étape en cours : Saisir 75 dans Quantité", "Paso actual: Introducir 75 en Cantidad",
    "Aktuelt trin: Indtast 75 i Antal", "Nykyinen vaihe: Syötä 75 kenttään Määrä",
    "Gjeldende trinn: Angi 75 i Antall"].map(said => matcher.playbackStep(said)?.value), Array(7).fill("75"));

  const played = matcher.playbackSteps([
    status("Pågående steg: Öppna Purchase Order List"), page("Inköpsorder"),
    status("Pågående steg: Anropa Skapa ny på Ny"),
    status("Pågående steg: Mata in 10000 i Leverantörsnr"),
    status("Pågående steg: Mata in 75 i Antal"),
    status("Pågående steg: Anropa Bokför"), { id: "err", raw: { type: "bc-error" } }]);
  assert.strictEqual(played.length, 5);
  assert.strictEqual(played[0].openedPage, "Inköpsorder");
  assert.strictEqual(played[4].errorEventId, "err", "an error before the next step is the step's");
  const named = documented.map((value, index) => ({ stepId: `block:step:${index + 1}`,
    instruction: index === 0 ? "Sök efter och öppna **Inköpsorder**" : "",
    signature: matcher.signature(value) }));
  const check = matcher.check(named, [], played.map((step, index) => index === 4
    ? { ...step, error: "Det finns inget att bokföra." } : step));
  assert.deepStrictEqual(check.steps.map(step => step.state), ["done", "done", "done", "done", "failed"]);
  assert.strictEqual(check.steps[2].instruction, "Mata in 10000 i Leverantörsnr");
  assert.strictEqual(check.steps[4].error, "Det finns inget att bokföra.");
  assert.strictEqual(check.recordedSteps, 5);
  assert.deepStrictEqual(check.additional, []);

  // Another script: its steps are not the test's and are listed as additional.
  const other = matcher.check(named, [], matcher.playbackSteps([
    status("Pågående steg: Mata in 5 i Rabattprocent")]));
  assert.ok(other.steps.every(step => step.state !== "done"));
  assert.deepStrictEqual(other.additional, ["Mata in 5 i Rabattprocent"]);
  console.log("Test recording match: Page Scripting playback passed.");
}

// The test from a real run: a step without a signature that opens a page, and records the test
// chose from a list that Page Scripting enters in a field captioned otherwise.
{
  const status = label => ({ id: `e-${label}`, raw: { type: "status-message", label: `Pågående steg: ${label}` } });
  const step = (stepId, instruction, signature) => ({ stepId, instruction, ...(signature ? { signature } : {}) });
  const sig = (taskType, fieldCaption = "", actionCaption = "") => ({ taskType, pageObjectId: "", pageCaption: "",
    controlId: "", fieldCaption, actionCaption });
  const run = [
    step("s1", "Välj Huvudnavigering på sidan Tillgängliga funktioner.", sig("RunAction", "huvudnavigering")),
    step("s2", "Sök efter ink ord och öppna listan Inköpsorder."),
    step("s3", "Börja skapa en ny inköpsorder genom att välja Ny.", sig("CreatePurchaseOrder", "ny", "ny")),
    step("s4", "Välj posten 10000 på sidan Inköpsorder.", sig("SelectRecord", "", "nr, sorterade i stigande order välj posten")),
    step("s5", "Ange isbergs i Nr och välj 30043.", sig("SearchAndSelectRecord", "artikel nr", "nr")),
    step("s6", "Ange 4 500 i Antal.", sig("EnterQuantity", "antal")),
    step("s10", "Välj Hantera på sidan Inköpsorder.", sig("RunAction", "hantera")),
    step("s12", "Välj Artikelnummer 10244.", sig("SelectItem", "artikelnummer")),
    step("s13", "Ange 75 i Antal.", sig("EnterQuantity", "antal")),
    step("s17", "Välj Släpp på sidan Inköpsorder.", sig("ReleasePurchaseDocument", "", "släpp"))];
  const played = matcher.playbackSteps([status("Öppna Purchase Order List"),
    { id: "p", raw: { type: "page-state", pageCaption: "Inköpsorder" } },
    status("Anropa Skapa ny på Ny"), status("Mata in 10000 i Leverantörsnr"), status("Mata in 30043 i Nr"),
    status("Mata in 4500 i Antal"), status("Anropa Skapa ny på Ny rad"), status("Mata in 10244 i Nr"),
    status("Mata in 75 i Antal"), status("Anropa Släpp")]);
  const result = matcher.check(run, [], played);
  // Menus Page Scripting does not open (Main navigation, Manage) count with the step after them.
  assert.deepStrictEqual(result.steps.map(item => item.state), ["done", "done", "done", "done", "done",
    "done", "done", "done", "done", "done"]);
  assert.strictEqual(result.recorded.find(item => item.instruction === "Mata in 10244 i Nr").stepId, "s12",
    "a played step is listed with its own test step, not the menu before it");

  // An action left out of the script, and the menu it sits in, stay not done; the arrow of a
  // split button before a step that failed was still opened.
  const tail = [step("s14", "Välj Visa fler alternativ på sidan Inköpsorder.", sig("RunAction", "visa fler alternativ")),
    step("s15", "Välj Ta bort rad på sidan Inköpsorder.", sig("RunAction", "ta bort rad")),
    step("s16", "Välj Relaterade åtgärder för Släpp på sidan Inköpsorder.", sig("RunAction", "relaterade åtgärder för släpp")),
    step("s17", "Välj Släpp på sidan Inköpsorder.", sig("ReleasePurchaseDocument", "", "släpp")),
    step("s18", "Ange 5 i Rabattprocent.", sig("EnterValue", "rabattprocent")),
    step("s19", "Välj Bokför.", sig("PostDocument", "", "bokför"))];
  const ending = matcher.check(tail, [], [{ ...matcher.playbackStep("Pågående steg: Anropa Släpp"),
    error: "Det finns inget att släppa." }, matcher.playbackStep("Pågående steg: Anropa Bokför")]);
  assert.deepStrictEqual(ending.steps.map(item => item.state),
    ["not-found", "not-found", "done", "failed", "not-found", "done"],
    "only a plain action right before a played step counts with it");
  console.log("Test recording match: a Page Scripting run of a real test passed.");
}

// What was captured while a played step ran goes with it: its event and the next step's.
{
  const at = (eventNo, label) => ({ id: `e${eventNo}`, raw: { type: "status-message", eventNo,
    label: `Pågående steg: ${label}` } });
  const played = matcher.playbackSteps([at(4, "Mata in 75 i Antal"),
    { id: "e5", raw: { type: "page-state", eventNo: 5 } }, at(7, "Anropa Släpp")]);
  assert.deepStrictEqual(played.map(item => [item.eventNo, item.endEventNo]), [[4, 7], [7, undefined]]);
  const result = matcher.check([{ stepId: "a", instruction: "Ange 75 i Antal.", signature: {
    taskType: "EnterQuantity", fieldCaption: "antal" } }], [], played);
  assert.strictEqual(result.steps[0].playedIndex, 0, "the check says which played step it was");
  console.log("Test recording match: Page Scripting screenshots passed.");
}

// A played step's screenshot goes by when it was taken: one taken while the step ran, never one
// of a later step; a page opened shows once the next step began. One capture saved for several
// events goes with one step only.
{
  const time = seconds => new Date(Date.UTC(2026, 10, 16, 15, 0, seconds)).toISOString();
  const played = [{ at: time(0), kind: "open" }, { at: time(10) }, { at: time(20) }, { at: time(30) }];
  const shot = (id, seconds, eventNo) => ({ id, createdAt: time(seconds), metadata: { legacyEventNo: eventNo } });
  const chosen = matcher.playbackScreenshots([
    shot("list", 11, 2), // the list, taken as step 2 began: step 1 opened it
    shot("card", 25, 3), // taken while step 3 ran: step 3's, not step 2's
    shot("end-a", 40, 9), shot("end-b", 40, 12) // one capture saved for two earlier events
  ], played).map(asset => asset?.id.replace(/-[ab]$/u, "") || null);
  assert.deepStrictEqual(chosen, ["list", null, "card", "end"], "the end goes with the last step");
  console.log("Test recording match: Page Scripting screenshots by time passed.");
}

// A screenshot taken for a played step itself, with its control outlined, comes before one
// found by time, and is not used again for another step.
{
  const time = seconds => new Date(Date.UTC(2026, 10, 16, 15, 0, seconds)).toISOString();
  const played = [{ at: time(0), eventNo: 5 }, { at: time(10), eventNo: 8 }];
  const chosen = matcher.playbackScreenshots([
    { id: "own-1", createdAt: time(2), metadata: { legacyEventNo: 5 }, highlight: { x: 0.1, y: 0.2, width: 0.1, height: 0.03 } },
    { id: "other", createdAt: time(11), metadata: { legacyEventNo: 6 } },
    { id: "own-2", createdAt: time(12), metadata: { legacyEventNo: 8 } }
  ], played).map(asset => asset?.id || null);
  assert.deepStrictEqual(chosen, ["own-1", "own-2"]);
  console.log("Test recording match: a played step's own screenshot passed.");
}
