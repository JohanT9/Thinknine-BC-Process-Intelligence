(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9TestRecordingMatch = api;
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  "use strict";

  // Which steps of a test a recording shows as done. A test step and a recorded step are the
  // same kind of action on the same page and the same field or button; values may differ,
  // since a test often uses other data than the documented process. Page and control ids are
  // compared first, as they do not depend on the language Business Central is shown in, and
  // captions only when an id is missing. Steps are matched in order. The result only says
  // which steps the recording shows; it never says that a step passed.
  const MATCH_THRESHOLD = 0.6;
  const text = value => typeof value === "string" ? value : value == null ? "" : String(value);
  const caption = value => text(value).normalize("NFKC").trim().toLocaleLowerCase()
    .replace(/\s+/gu, " ");
  const id = value => value == null || value === "" ? "" : text(value).trim();

  // The parts of a recorded or documented step that say what was done, and where.
  function signature(task = {}) {
    const objectRef = task.knowledgeObjectRef || {};
    const controlRef = task.knowledgeControlRef || {};
    return {
      taskType: text(task.taskType || task.semanticAction),
      pageObjectId: id(task.pageObjectId || objectRef.objectId),
      pageCaption: caption(task.pageCaption),
      controlId: id(controlRef.fieldId || controlRef.controlId || controlRef.automationId),
      fieldCaption: caption(task.fieldCaption),
      actionCaption: caption(task.actionCaption)
    };
  }

  function hasSignature(value) {
    const sig = value || {};
    return Boolean(sig.taskType && (sig.controlId || sig.fieldCaption || sig.actionCaption));
  }

  // How well two steps agree, from 0 to 1. The field or button must agree and the page adds
  // to the score; a page that clearly differs rules the pair out. The kind of action is how
  // the step was interpreted, which can differ for the same click (for example a general
  // action or a known posting action), so another kind lowers the score without ruling the
  // pair out.
  const OTHER_KIND = 0.75;

  // Steps that choose a record, such as a vendor or an item. The same vendor can be chosen by
  // its number in one run and by its name in another; that is the same step, whichever field
  // was used. Types that choose an option or a value in general are not among them.
  const CHOSEN_RECORD = Object.freeze({ SelectVendor: "vendor", SelectCustomer: "customer",
    SelectServiceOrderCustomer: "customer", SelectItem: "item", SelectSalesLineItem: "item",
    SelectPurchaseLineItem: "item", SelectProductionItem: "item", SelectLocation: "location",
    SelectBin: "bin" });
  const SAME_RECORD = 0.85;
  // Opening a page: the same page is the same step, whatever was typed to find it.
  const OPENS_PAGE = new Set(["SearchAndOpenPage", "OpenPage", "NavigateToPage"]);
  const SAME_PAGE_OPENED = 0.9;

  // A field's caption without the word for number, name or code, so that "Vendor No." and
  // "Vendor Name", "Leverantörsnr" and "Leverantörsnamn", or "N° fournisseur" and "Nom
  // fournisseur" belong to one family. Empty when the caption has no such word.
  const MARKER_SUFFIX = /(?:^|[\s-])(?:no|nr|nro|number|nummer|numero|número|name|namn|navn|nimi|code|kode|koodi|tunnus)\.?$/u;
  const MARKER_COMPOUND = /(?:nr|nummer|namn|navn|name|kode)\.?$/u;
  // Captions are compared after NFKC, which writes "º" as "o".
  const MARKER_PREFIX = /^(?:n°|no|n\.o|no\.|numéro|número|nom|nombre|nummer)\s+(?:(?:del|des|de|du|d’|d')\s*)?/u;
  function fieldFamily(value) {
    const caption = text(value);
    let stem = caption;
    if (MARKER_PREFIX.test(caption)) stem = caption.replace(MARKER_PREFIX, "");
    else if (MARKER_SUFFIX.test(caption)) stem = caption.replace(MARKER_SUFFIX, "");
    else if (MARKER_COMPOUND.test(caption)) stem = caption.replace(MARKER_COMPOUND, "");
    const marked = stem !== caption;
    // A Swedish, Danish or Norwegian compound joins with -s ("leverantörs-").
    stem = stem.trim().replace(/[\s-]+$/u, "").replace(/s$/u, "");
    return stem.length >= 3 ? { stem, marked } : { stem: "", marked };
  }

  // How well the field or button agrees, from 0 to 1.
  function targetScore(expected, recorded) {
    if (expected.controlId && recorded.controlId && expected.controlId === recorded.controlId) return 1;
    const labels = [[expected.fieldCaption, recorded.fieldCaption],
      [expected.actionCaption, recorded.actionCaption]].filter(([a, b]) => a && b);
    if (!(expected.controlId && recorded.controlId) && labels.length &&
        labels.every(([a, b]) => a === b)) return 0.9;
    const chosen = CHOSEN_RECORD[expected.taskType];
    if (chosen && chosen === CHOSEN_RECORD[recorded.taskType]) return SAME_RECORD;
    if (OPENS_PAGE.has(expected.taskType) && OPENS_PAGE.has(recorded.taskType) &&
        expected.pageObjectId && expected.pageObjectId === recorded.pageObjectId) {
      return SAME_PAGE_OPENED;
    }
    // Number and name of the same thing: at least one caption names a number or a name.
    const family = [fieldFamily(expected.fieldCaption), fieldFamily(recorded.fieldCaption)];
    if (family[0].stem && family[0].stem === family[1].stem && (family[0].marked || family[1].marked)) {
      return 0.8;
    }
    return 0;
  }

  function score(expected, recorded) {
    if (!hasSignature(expected) || !hasSignature(recorded)) return 0;
    const sameRecord = CHOSEN_RECORD[expected.taskType] &&
      CHOSEN_RECORD[expected.taskType] === CHOSEN_RECORD[recorded.taskType];
    const kind = expected.taskType === recorded.taskType || sameRecord ? 1 : OTHER_KIND;
    const target = targetScore(expected, recorded);
    if (!target) return 0;
    let page = 0.5;
    if (expected.pageObjectId && recorded.pageObjectId) {
      if (expected.pageObjectId !== recorded.pageObjectId) return 0;
      page = 1;
    } else if (expected.pageCaption && recorded.pageCaption) {
      if (expected.pageCaption !== recorded.pageCaption) return 0;
      page = 0.9;
    }
    return Math.round((0.6 * target + 0.4 * page) * kind * 100) / 100;
  }

  // Test steps against recorded steps, in order: the pairing with the highest total score,
  // where each recorded step counts for at most one test step.
  function match(expectedSteps = [], recordedTasks = []) {
    const expected = expectedSteps.map(step => ({ stepId: text(step.stepId),
      signature: step.signature || null }));
    const recorded = recordedTasks.map(signature);
    const rows = expected.length;
    const cols = recorded.length;
    const best = Array.from({ length: rows + 1 }, () => new Float64Array(cols + 1));
    const pair = (i, j) => {
      const value = score(expected[i].signature, recorded[j]);
      return value >= MATCH_THRESHOLD ? value : 0;
    };
    for (let i = rows - 1; i >= 0; i -= 1) {
      for (let j = cols - 1; j >= 0; j -= 1) {
        const value = pair(i, j);
        best[i][j] = Math.max(best[i + 1][j], best[i][j + 1],
          value ? value + best[i + 1][j + 1] : 0);
      }
    }
    const matches = new Map();
    for (let i = 0, j = 0; i < rows && j < cols;) {
      const value = pair(i, j);
      if (value && Math.abs(best[i][j] - (value + best[i + 1][j + 1])) < 1e-9) {
        matches.set(i, { taskIndex: j, score: value });
        i += 1; j += 1;
      } else if (best[i + 1][j] >= best[i][j + 1]) {
        i += 1;
      } else {
        j += 1;
      }
    }
    const used = new Set([...matches.values()].map(item => item.taskIndex));
    return {
      steps: expected.map((step, index) => {
        if (!hasSignature(step.signature)) return { stepId: step.stepId, state: "unknown" };
        const found = matches.get(index);
        return found
          ? { stepId: step.stepId, state: "done", taskIndex: found.taskIndex, score: found.score }
          : { stepId: step.stepId, state: "not-found" };
      }),
      // Recorded steps that are not in the test, such as a detour or an extra check.
      additional: recorded.map((_, index) => index).filter(index => !used.has(index) &&
        hasSignature(recorded[index]))
    };
  }

  // What a recording shows for a test, kept with the run: for a step found in it, what was
  // recorded and when; and the recorded steps that are not in the test. Recorded tasks may
  // carry the time they were done as `at`, and `failed` with Business Central's message as
  // `error` when it showed an error after the step; such a step is suggested as failed.
  function check(expectedSteps = [], recordedTasks = []) {
    const result = match(expectedSteps, recordedTasks);
    const pairedWith = new Map(result.steps.filter(step => step.state === "done")
      .map(step => [step.taskIndex, step.stepId]));
    // The recorded instruction as plain text: the marks for captions (**) and values (__)
    // are for the document only.
    const said = task => text(task?.instruction || task?.displayText)
      .replace(/\*\*([^*]+)\*\*/gu, "$1").replace(/__([^_]+)__/gu, "$1").trim();
    return {
      recordedSteps: recordedTasks.filter(task => hasSignature(signature(task))).length,
      steps: result.steps.map(step => {
        if (step.state !== "done") return { stepId: step.stepId, state: step.state };
        const task = recordedTasks[step.taskIndex] || {};
        return { stepId: step.stepId, state: task.failed ? "failed" : "done",
          taskIndex: step.taskIndex, score: step.score, instruction: said(task), at: text(task.at),
          ...(task.failed ? { error: text(task.error).trim() } : {}) };
      }),
      additional: result.additional.map(index => said(recordedTasks[index])).filter(Boolean),
      // Every recorded step in order, with the test step it was paired with, so the tester
      // can see what the recording held.
      recorded: recordedTasks.map((task, index) => ({ instruction: said(task),
        stepId: pairedWith.get(index) || "", ...(task.failed ? { failed: true,
          error: text(task.error).trim() } : {}) })).filter(item => item.instruction)
    };
  }

  return { MATCH_THRESHOLD, signature, hasSignature, score, match, check, fieldFamily };
});
