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
  // An instruction without the document's marks for captions (**) and values (__).
  const plain = value => text(value).replace(/\*\*([^*]+)\*\*/gu, "$1")
    .replace(/__([^_]+)__/gu, "$1");

  // Opening a page: the same page is the same step, whatever was typed to find it.
  const OPENS_PAGE = new Set(["SearchAndOpenPage", "OpenPage", "NavigateToPage"]);

  // A page's name without the record shown on it or the company: Business Central captions a
  // document page "Inköpsorder - 2600074 ∙ Exempelleverantören" and a list "Inköpsorder (RDG)",
  // and the browser adds " - Dynamics 365 Business Central". A test of the same process uses
  // another record, so only the name is the page.
  function pageName(value) {
    return pageNames(value)[0] || "";
  }
  // Every part of a caption that can be the page's name: a new record's page is captioned
  // "Ny - Inköpsorder", a saved one "Inköpsorder - 2600074 ∙ Exempelleverantören". The record
  // after "∙" and parts with digits (a number, or "Dynamics 365 Business Central") are not.
  function pageNames(value) {
    return caption(value).split(/\s+[-–]\s+/u)
      .map(part => part.split(/[∙·•]/u)[0].replace(/\s*\([^()]*\)\s*$/u, "").trim())
      .filter((part, index) => part && (index === 0 || !/\d/u.test(part)));
  }
  // Two captions of the same page share a name.
  const samePage = (a, b) => pageNames(a).some(name => pageNames(b).includes(name));

  // The page a step that searches for a page opened: the last page the recording showed.
  function openedPage(task) {
    const pages = ((task.resultVerification || {}).outcomes || [])
      .filter(item => item?.kind === "navigation" && item.pageCaption);
    return pages.length ? pageName(pages.at(-1).pageCaption) : "";
  }

  // The parts of a recorded or documented step that say what was done, and where. A
  // documented step the document's rules rewrote (such as "Välj Leverantörsnamn 11976") is
  // described by its semantic action: its kind (actionType) and its field (targetField).
  function signature(task = {}) {
    const objectRef = task.knowledgeObjectRef || {};
    const controlRef = task.knowledgeControlRef || {};
    const named = value => typeof value === "string" ? value : "";
    const taskType = named(task.taskType) || named(task.semanticAction) || named(task.actionType);
    const opened = OPENS_PAGE.has(taskType) ? openedPage(task) : "";
    return {
      taskType,
      pageObjectId: id(task.pageObjectId || objectRef.objectId),
      pageCaption: caption(task.pageCaption),
      controlId: id(controlRef.fieldId || controlRef.controlId || controlRef.automationId),
      // The field's AL name ("Sell-to Customer No."): the same in every language Business
      // Central is shown in, and in every session, unlike the captions.
      ...(id(controlRef.alControlName) ? { alControlName: id(controlRef.alControlName) } : {}),
      fieldCaption: caption(task.fieldCaption || task.targetField),
      actionCaption: caption(task.actionCaption),
      ...(opened ? { openedPage: opened } : {})
    };
  }

  function hasSignature(value) {
    const sig = value || {};
    return Boolean(sig.taskType && (sig.controlId || sig.alControlName || sig.fieldCaption ||
      sig.actionCaption));
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

  // Steps that choose something, and steps that enter a value.
  const chooses = taskType => /^(?:Select|SearchAndSelect)/u.test(text(taskType)) ||
    Boolean(CHOSEN_RECORD[taskType]);
  const enters = taskType => /^(?:Enter|Fill|Change)/u.test(text(taskType));
  // Numbers of three or more digits in an instruction, written without spaces or separators,
  // leaving out the page the step names ("på sidan Inköpsorder - 2600074"): that is the
  // record shown, not what was chosen.
  const numbers = sig => (text(sig.instruction).split(sig.pageCaption || "\u0000").join(" ")
    .match(/\d[\d\s.,]*\d/gu) || [])
    .map(item => item.replace(/[\s.,]/gu, "")).filter(item => item.length >= 3);
  const word = (value, name) => Boolean(name) && new RegExp(`(?:^|[^\\p{L}\\p{N}])${
    name.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}(?:$|[^\\p{L}\\p{N}])`, "u").test(text(value));
  // A step that searched for a page and opened it: the page it opened is what matters, not
  // where the search started or what was typed. The page can also be named in the other
  // step's instruction: an older document's search may end at the search dialog.
  function opensSamePage(expected, recorded) {
    if (!OPENS_PAGE.has(expected.taskType) || !OPENS_PAGE.has(recorded.taskType)) return false;
    const pairs = [[expected, recorded], [recorded, expected]];
    return pairs.some(([opening, other]) => opening.destination &&
      (other.destination === opening.destination || word(other.instruction, opening.destination)));
  }
  // Where a step that opens a page went: the page the recording showed, or else the last
  // caption its instruction names ("… öppna listan **Inköpsorder**", "… och välj
  // **Inköpsorder**").
  function destination(sig, instruction) {
    if (!OPENS_PAGE.has(sig.taskType)) return "";
    const named = [...text(instruction).matchAll(/\*\*([^*]+)\*\*/gu)].map(item => item[1]);
    return sig.openedPage || (named.length ? pageName(named.at(-1)) : "");
  }

  // Older documents wrote a search as three steps: the search, the text typed in Business
  // Central's search box, and the result chosen in the list of results ("Välj posten
  // Inköpsorder Listor"). A recording now shows it as one step that opens the page. The two
  // parts after a found search are done with it.
  function partOfSearch(sig, opened) {
    if (!sig || !opened) return false;
    const searchBox = globalThis.T9BCClientCaptions ||
      (typeof require === "function" ? require("../engine/bc-client-captions") : null);
    if (enters(sig.taskType) && searchBox?.matches("tellMe", sig.fieldCaption)) return true;
    return (chooses(sig.taskType) && word(sig.instruction, opened)) ||
      /^(?:RunAction|Select)/u.test(sig.taskType) && ["listor", "lists"]
        .some(results => word(sig.instruction, `${opened} ${results}`));
  }

  // How well the field or button agrees, from 0 to 1.
  function targetScore(expected, recorded) {
    if (expected.controlId && recorded.controlId && expected.controlId === recorded.controlId) return 1;
    if (expected.alControlName && recorded.alControlName &&
        expected.alControlName === recorded.alControlName) return 1;
    const labels = [[expected.fieldCaption, recorded.fieldCaption],
      [expected.actionCaption, recorded.actionCaption]].filter(([a, b]) => a && b);
    if (labels.length && labels.every(([a, b]) => a === b)) {
      // Control ids come from the Business Central knowledge and can name the same field
      // differently from one version of it to another; the same captions still count.
      return expected.controlId && recorded.controlId ? 0.8 : 0.9;
    }
    const chosen = CHOSEN_RECORD[expected.taskType];
    if (chosen && chosen === CHOSEN_RECORD[recorded.taskType]) return SAME_RECORD;
    if (OPENS_PAGE.has(expected.taskType) && OPENS_PAGE.has(recorded.taskType) &&
        expected.pageObjectId && expected.pageObjectId === recorded.pageObjectId) {
      return SAME_PAGE_OPENED;
    }
    if (opensSamePage(expected, recorded)) return SAME_PAGE_OPENED;
    // The same number chosen on both sides, such as item 30043 picked from a list one time and
    // searched for the other: a step that chooses something and a step that chooses or enters
    // something, with the same number in them.
    const valueSteps = [expected.taskType, recorded.taskType];
    if (valueSteps.some(type => chooses(type) || enters(type)) &&
        !valueSteps.some(type => OPENS_PAGE.has(type)) &&
        numbers(expected).some(value => numbers(recorded).includes(value))) {
      return 0.8;
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
    if (opensSamePage(expected, recorded)) {
      // The search starts wherever the user was; the page it opened has been compared.
      page = 1;
    } else if (expected.pageObjectId && recorded.pageObjectId) {
      if (expected.pageObjectId === recorded.pageObjectId) page = 1;
      // Page ids, too, come from the knowledge: a page captioned with the same name is the
      // same page, with a lower score.
      else if (expected.pageCaption && samePage(expected.pageCaption, recorded.pageCaption)) page = 0.8;
      else return 0;
    } else if (expected.pageCaption && recorded.pageCaption) {
      if (!samePage(expected.pageCaption, recorded.pageCaption)) return 0;
      page = 0.9;
    }
    return Math.round((0.6 * target + 0.4 * page) * kind * 100) / 100;
  }

  // Test steps against recorded steps, in order: the pairing with the highest total score,
  // where each recorded step counts for at most one test step.
  function match(expectedSteps = [], recordedTasks = []) {
    // The instructions as plain text: a few comparisons look for a page or a number in them.
    const prepared = (sig, instruction) => ({ ...sig, instruction: caption(plain(instruction)),
      destination: destination(sig, instruction) });
    const expected = expectedSteps.map(step => ({ stepId: text(step.stepId),
      signature: step.signature ? prepared(step.signature, step.instruction) : null }));
    const recorded = recordedTasks.map(task => prepared(signature(task), task.instruction || task.displayText));
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
    // The parts of a search right after a search found in the recording.
    for (const [index, found] of [...matches]) {
      const opened = recorded[found.taskIndex].destination;
      if (!OPENS_PAGE.has(recorded[found.taskIndex].taskType)) continue;
      for (let next = index + 1; next < Math.min(rows, index + 3) && !matches.has(next) &&
          partOfSearch(expected[next].signature, opened); next += 1) {
        matches.set(next, found);
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

  // Business Central's Page Scripting plays a script back without clicks or typing on the
  // page, so nothing of it becomes a recorded step. It announces each step it starts in a
  // status message, a localized prefix and the step's text: "Pågående steg: Mata in 10000 i
  // Leverantörsnr". The step texts are worded as page-script-export.js writes them, in the
  // language Business Central is shown in; the captions and values in them are the page's.
  const pageScripting = () => globalThis.T9PageScriptExport ||
    (typeof require === "function" ? require("./page-script-export") : null);
  const escape = value => value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const PLAYBACK_KINDS = ["input", "operation", "row", "choose", "open", "invoke"];
  let playbackPatterns = null;
  function patterns() {
    if (playbackPatterns) return playbackPatterns;
    const phrases = pageScripting()?.PHRASES || {};
    playbackPatterns = Object.values(phrases).flatMap(words => PLAYBACK_KINDS.map(kind => {
      const names = [];
      const source = escape(words[kind]).replace(/\\\{(page|caption|value|operation)\\\}/gu, (_, name) => {
        names.push(name);
        return "(.+?)";
      });
      return { kind, words, names, pattern: new RegExp(`^${source}$`, "u") };
    }));
    return playbackPatterns;
  }
  // The step a Page Scripting announcement names, or null for any other status message.
  function playbackStep(message) {
    const said = text(message).replace(/\s+/gu, " ").trim();
    const colon = said.indexOf(": ");
    if (colon < 1 || colon > 60) return null;
    const step = said.slice(colon + 2).trim();
    for (const { kind, words, names, pattern } of patterns()) {
      const found = step.match(pattern);
      if (!found) continue;
      const parts = Object.fromEntries(names.map((name, index) => [name, found[index + 1].trim()]));
      const operation = parts.operation ? Object.keys(words).find(key => /^[A-Z]/u.test(key) &&
        words[key] === parts.operation) || parts.operation : "";
      return { kind, instruction: step, caption: parts.caption || parts.page || "",
        value: parts.value || "", ...(operation ? { operation, operationText: parts.operation } : {}) };
    }
    return null;
  }
  // The steps a recording shows Page Scripting playing back, in order, from canonical events.
  // Each has the number of its event (eventNo) and of the next step's (endEventNo, none for
  // the last), so that what was captured while it ran, such as a screenshot, goes with it.
  // A step opening a page is given the page shown before the next step started. An error
  // Business Central showed before the next step started is the step's (`errorEventId`).
  function playbackSteps(events = []) {
    const steps = [];
    for (const event of Array.isArray(events) ? events : []) {
      const raw = event?.raw || event || {};
      const step = raw.type === "status-message" ? playbackStep(raw.label) : null;
      if (step) {
        const eventNo = Number(raw.eventNo) || 0;
        if (steps.length) steps.at(-1).endEventNo = eventNo;
        steps.push({ ...step, at: text(raw.timestamp || event.timestamp), eventId: text(event.id), eventNo });
        continue;
      }
      const current = steps.at(-1);
      if (!current) continue;
      if (raw.type === "bc-error" && !current.errorEventId) current.errorEventId = text(event.id);
      const shown = raw.pageCaption || event.page?.caption;
      if (current.kind === "open" && shown) current.openedPage = text(shown);
    }
    return steps;
  }

  // The screenshot for each step Page Scripting played back: the one taken for the step when it
  // was announced, with its field or button outlined; otherwise by when it was taken, not by the
  // event it was saved with, which can be an earlier click or field: the last one taken while the
  // step ran, before the next step began; for a step that opens a page, the first one taken
  // after, which shows the page. Screenshots are queued, and one capture can be saved for
  // several events: a capture (its time) goes with one step only. Null where there is none.
  function playbackScreenshots(assets = [], played = []) {
    const shots = (Array.isArray(assets) ? assets : []).map(asset => ({ asset, at: Date.parse(asset?.createdAt || "") }))
      .filter(item => Number.isFinite(item.at)).sort((a, b) => a.at - b.at);
    const starts = played.map(item => Date.parse(item?.at || ""));
    const used = new Set();
    const between = (from, to) => shots.filter(item => !used.has(item.at) &&
      Number.isFinite(from) && item.at >= from && (!Number.isFinite(to) || item.at < to));
    const take = found => {
      if (found) used.add(found.at);
      return found?.asset || null;
    };
    // A screenshot taken for the step itself, when it was played (the step's event), comes first.
    const own = played.map(item => {
      const found = item?.eventNo ? shots.find(shot => Number(shot.asset?.metadata?.legacyEventNo) === item.eventNo) : null;
      return found && !used.has(found.at) ? take(found) : null;
    });
    // The last step first: the screen after it is what the whole script left.
    const lastIndex = played.length - 1;
    const last = played.length && !own[lastIndex] ? take(between(starts.at(-1), Infinity).at(-1)) : null;
    return played.map((item, index) => {
      if (own[index]) return own[index];
      if (index === lastIndex) return last;
      const [start, next, after] = [starts[index], starts[index + 1], starts[index + 2]];
      // A page opened shows once the next step has begun; any other step is shown only by a
      // screenshot taken while it ran, never by one of a later step.
      return take((item?.kind === "open" ? between(next, after)[0] : null) || between(start, next).at(-1));
    });
  }

  // Without a trailing "…" or "...", which Business Central adds to an action that opens a page.
  const bare = value => caption(value).replace(/(?:\.\.\.|…)$/u, "").trim();
  // How well a played-back step agrees with a test step: 1 or 0.9, or 0.
  function playbackScore(expected, played) {
    if (!expected) return 0;
    // A step without a signature, such as an older document's search for a page, can only
    // be the page it names opening.
    if (!hasSignature(expected) && !(played.kind === "open" && expected.unsigned)) return 0;
    const target = bare(played.caption);
    const field = bare(expected.fieldCaption);
    const action = bare(expected.actionCaption);
    let found = false;
    if (played.kind === "open") {
      const pages = [played.openedPage, played.caption].filter(Boolean);
      found = (expected.unsigned || OPENS_PAGE.has(expected.taskType)) && (expected.destination
        ? pages.some(page => samePage(page, expected.destination))
        // An instruction saved as plain text names the page in its words.
        : expected.unsigned && pages.some(page => word(expected.instruction, pageName(page))));
    } else if (played.kind === "input") {
      const family = [fieldFamily(field), fieldFamily(target)];
      // A record the test chose from a list, such as item 10244 picked in Item No., is
      // entered by Page Scripting in the field, which may be captioned otherwise (No.): the
      // same value in the step's instruction is the same choice.
      const value = caption(played.value);
      found = field === target || (Boolean(family[0].stem) && family[0].stem === family[1].stem &&
        (family[0].marked || family[1].marked)) ||
        (chooses(expected.taskType) && value.length >= 3 && word(expected.instruction, value));
    } else if (played.kind === "operation") {
      // An operation on a page, such as OK in a lookup, is named by its own words; a dialog's
      // button is the last word of them ("Bekräfta med Ja", "Sökning OK").
      const words = bare(played.operationText);
      found = [target, words, words.split(" ").at(-1)].some(name => name && (name === action || name === field));
    } else {
      found = Boolean(target) && (target === action || target === field);
    }
    if (!found) return 0;
    return played.value && word(expected.instruction, caption(played.value)) ? 1 : 0.9;
  }
  // Test steps against played-back steps, in order, as match() pairs recorded steps.
  function matchPlayback(expectedSteps = [], played = []) {
    const named = instruction => [...text(instruction).matchAll(/\*\*([^*]+)\*\*/gu)].map(item => item[1]);
    const expected = expectedSteps.map(step => step.signature ? { ...step.signature,
      instruction: caption(plain(step.instruction)),
      destination: destination(step.signature, step.instruction) }
      : text(step.instruction).trim() ? { unsigned: true, instruction: caption(plain(step.instruction)),
        destination: named(step.instruction).length ? pageName(named(step.instruction).at(-1)) : "" } : null);
    const rows = expected.length;
    const cols = played.length;
    const best = Array.from({ length: rows + 1 }, () => new Float64Array(cols + 1));
    const pair = (i, j) => playbackScore(expected[i], played[j]);
    for (let i = rows - 1; i >= 0; i -= 1) {
      for (let j = cols - 1; j >= 0; j -= 1) {
        const value = pair(i, j);
        best[i][j] = Math.max(best[i + 1][j], best[i][j + 1], value ? value + best[i + 1][j + 1] : 0);
      }
    }
    const matches = new Map();
    for (let i = 0, j = 0; i < rows && j < cols;) {
      const value = pair(i, j);
      if (value && Math.abs(best[i][j] - (value + best[i + 1][j + 1])) < 1e-9) {
        matches.set(i, j);
        i += 1; j += 1;
      } else if (best[i + 1][j] >= best[i][j + 1]) {
        i += 1;
      } else {
        j += 1;
      }
    }
    return matches;
  }

  // What a recording shows for a test, kept with the run: for a step found in it, what was
  // recorded and when; and the recorded steps that are not in the test. Recorded tasks may
  // carry the time they were done as `at`, and `failed` with Business Central's message as
  // `error` when it showed an error after the step; such a step is suggested as failed.
  // Steps Page Scripting played back (playbackSteps(), with `error` for a step that failed)
  // count for test steps no recorded step was found for.
  function check(expectedSteps = [], recordedTasks = [], played = []) {
    const result = match(expectedSteps, recordedTasks);
    const playedFor = matchPlayback(expectedSteps, played);
    result.steps = result.steps.map((step, index) => {
      if (!["not-found", "unknown"].includes(step.state) || !playedFor.has(index)) return step;
      return { stepId: step.stepId, state: "played", playedIndex: playedFor.get(index) };
    });
    // Page Scripting runs an action directly, without opening the menu or the group it sits
    // in (Manage, Show more options, the arrow of a split button). A plain action step of the
    // test that Page Scripting did not play, right before a step it played, is that way to the
    // next step and counts with it. A step before a step not played is not: an action left out
    // of the script, such as Delete line, and the menu it was in stay not done.
    result.steps = result.steps.map((step, index) => {
      const next = result.steps[index + 1];
      const signatureOf = expectedSteps[index]?.signature;
      if (!["not-found", "unknown"].includes(step.state) || next?.state !== "played" ||
          signatureOf?.taskType !== "RunAction") return step;
      return { stepId: step.stepId, state: "played", playedIndex: next.playedIndex, onTheWay: true };
    });
    const playedWith = new Map(result.steps.filter(step => step.state === "played" && !step.onTheWay)
      .map(step => [step.playedIndex, step.stepId]));
    // A recorded search can stand for several steps of an older test; it is shown with the first.
    const pairedWith = new Map();
    for (const step of result.steps) {
      if (step.state === "done" && !pairedWith.has(step.taskIndex)) pairedWith.set(step.taskIndex, step.stepId);
    }
    // The recorded instruction as plain text: the marks for captions (**) and values (__)
    // are for the document only.
    const said = task => plain(task?.instruction || task?.displayText).trim();
    const failedPlay = item => Boolean(item?.failed || item?.errorEventId || item?.error);
    const playedItem = (item, stepId = "") => ({ instruction: text(item.instruction).trim(), stepId,
      playback: true, ...(failedPlay(item) ? { failed: true, error: text(item.error).trim() } : {}) });
    return {
      recordedSteps: recordedTasks.filter(task => hasSignature(signature(task))).length + played.length,
      steps: result.steps.map(step => {
        if (step.state === "played") {
          const item = played[step.playedIndex] || {};
          // The way to a step that failed was still taken.
          const failed = failedPlay(item) && !step.onTheWay;
          return { stepId: step.stepId, state: failed ? "failed" : "done", playback: true,
            playedIndex: step.playedIndex, ...(step.onTheWay ? { onTheWay: true } : {}),
            instruction: text(item.instruction).trim(), at: text(item.at),
            ...(failed ? { error: text(item.error).trim() } : {}) };
        }
        if (step.state !== "done") return { stepId: step.stepId, state: step.state };
        const task = recordedTasks[step.taskIndex] || {};
        return { stepId: step.stepId, state: task.failed ? "failed" : "done",
          taskIndex: step.taskIndex, score: step.score, instruction: said(task), at: text(task.at),
          ...(task.failed ? { error: text(task.error).trim() } : {}) };
      }),
      additional: [...result.additional.map(index => said(recordedTasks[index])),
        ...played.filter((_, index) => !playedWith.has(index)).map(item => text(item.instruction).trim())]
        .filter(Boolean),
      // Every recorded step in order, with the test step it was paired with, so the tester
      // can see what the recording held; then the steps Page Scripting played back.
      recorded: [...recordedTasks.map((task, index) => ({ instruction: said(task),
        stepId: pairedWith.get(index) || "", ...(task.failed ? { failed: true,
          error: text(task.error).trim() } : {}) })),
        ...played.map((item, index) => playedItem(item, playedWith.get(index) || ""))]
        .filter(item => item.instruction)
    };
  }

  return { MATCH_THRESHOLD, signature, hasSignature, score, match, check, fieldFamily, pageName,
    playbackStep, playbackSteps, playbackScreenshots };
});
