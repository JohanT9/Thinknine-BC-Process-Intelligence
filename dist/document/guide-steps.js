// Visa mig: a document's steps as a guide beside Business Central. Each step keeps its text as
// the document reads it, and what the guide looks for in Business Central to outline it: the
// field by its AL name (the attribute controlname, the same in every language), or the action
// by its AL name, with the captions recorded as a fallback. Nothing is added that the recording
// did not show: a step without a known field or action is shown without an outline.
(function (root, factory) {
  const api = factory(typeof module === "object" && module.exports
    ? require("../engine/step-text") : root.T9StepText);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9GuideSteps = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (stepText) {
  "use strict";
  const SCHEMA_VERSION = 1;
  const text = value => typeof value === "string" ? value : "";
  const blockText = block => text(block?.text).trim();
  const ACTION_TASK = /Action|Dialog|SearchAndOpenPage/u;
  const SEARCH_TASK = /(^|\.)(SearchAndOpenPage|SearchPage|OpenPageFromSearch)$/u;
  // The kind of sentence Review wrote for the step (engine/step-text.js), which says what the
  // user did in every recording, also in one made before Business Central's AL names were kept.
  const ACTION_TEXT = new Set(["actionOnPage", "action", "create", "recordOnPage", "path", "pathOnPage", "choose", "confirm"]);
  const FIELD_TEXT = new Set(["enter", "fill", "select", "check", "uncheck", "choose-value"]);
  const SEARCH_TEXT = new Set(["searchOpen", "searchOpenList"]);
  // An AL name that is a number or a GUID names no field of its own (a list row, a system control).
  const usableName = value => {
    const name = text(value).trim();
    return name && !/^\d+$/u.test(name) && !/^\{?[0-9a-f]{8}-/iu.test(name) ? name : "";
  };
  // The page's name without the record: "Inköpsorder - 2600204 ∙ Vendor" is Inköpsorder.
  const pageName = value => {
    const name = text(value).split(" ∙ ")[0].trim();
    return name.replace(/\s+-\s+\S*\d\S*$/u, "").trim();
  };
  const unique = values => [...new Set(values.map(value => text(value).trim()).filter(Boolean))];

  // What to outline for a step's interaction: { kind: "field" | "action" | "search" | "none", ... }.
  function targetOf(interaction) {
    const task = interaction && typeof interaction === "object" ? interaction : {};
    const model = task.semanticActionModel || {};
    const keys = model.captionKeys || {};
    const actionKey = /^a\|([^|]*)\|(.+)$/u.exec(text(keys.action));
    const clientAction = /^c\|(\w+)$/u.exec(text(keys.action))?.[1] || "";
    const fieldKey = /^f\|([^|]*)\|(.+)$/u.exec(text(keys.field));
    const page = /^p\|(.+)$/u.exec(text(keys.page))?.[1] || actionKey?.[1] || fieldKey?.[1] || "";
    const taskType = text(task.taskType) || text(task.actionType) || text(task.semanticAction) ||
      text(model.actionType);
    const sentence = text(model.stepText?.kind || task.stepText?.kind);
    const actionCaption = text(task.actionCaption).trim();
    const fieldCaption = text(task.fieldCaption || task.targetField).trim();
    const pageCaption = pageName(task.pageCaption);
    const field = usableName(fieldKey?.[2]) || usableName(task.knowledgeControlRef?.alControlName);
    const common = { page, pageCaption };
    // A page opened by searching: the guide outlines Business Central's search, and the step is
    // done when the page opened (its AL name, from the recording) is shown.
    if ((SEARCH_TASK.test(taskType) || SEARCH_TEXT.has(sentence)) && !actionKey && !clientAction) {
      // The page's name in the results, and the search button's name as it was recorded.
      return { kind: "search", page, pageCaption: "", result: pageCaption,
        caption: actionCaption.length <= 40 ? actionCaption : "" };
    }
    if (actionKey || clientAction) {
      return { kind: "action", ...common, action: actionKey?.[2] || "",
        ...(clientAction ? { operation: clientAction } : {}), caption: actionCaption };
    }
    // A record chosen in a list: its link shows the value chosen, such as the order number.
    if (sentence === "recordOnPage") {
      const caption = text(task.selectedCaption || task.value).trim();
      return caption ? { kind: "action", ...common, action: "", caption } : { kind: "none", ...common };
    }
    const actionStep = ACTION_TEXT.has(sentence) ||
      (!FIELD_TEXT.has(sentence) && ACTION_TASK.test(taskType)) ||
      // A button recorded without a value has the same caption as its "field".
      (!sentence && !field && actionCaption && actionCaption === fieldCaption && !text(task.selectedCaption));
    if (actionStep && actionCaption) return { kind: "action", ...common, action: "", caption: actionCaption };
    if (!actionStep && (field || fieldCaption || actionCaption)) {
      // The step's name of the field ("Artikelnummer") and the column's own caption ("Nr").
      const captions = unique([fieldCaption, actionCaption]).filter(caption => caption.length <= 60);
      return { kind: "field", ...common, field, caption: captions[0] || "", captions };
    }
    return { kind: "none", ...common };
  }

  // The interaction of every step of the document as Review projected it, by its task. The
  // presented document keeps only the semantic action of a step, so the target comes from here.
  function interactionsOf(document) {
    const found = new Map();
    const visit = blocks => (blocks || []).forEach(block => {
      if (block?.kind === "step" && block.interaction) {
        const id = text(block.sourceRef?.taskId) || text(block.interaction.taskId);
        if (id) found.set(id, block.interaction);
      }
      visit(block?.blocks);
    });
    (document?.sections || []).forEach(section => visit(section.blocks));
    return found;
  }

  // The clicks of a step that chooses a path of menus or tabs, each with its sentence in the
  // document's language ("Välj Rad."). The captions are found in Business Central as the
  // recording saw them; the sentences use the document's captions. Only a step whose text still
  // names every part of the path is split, so a step the user rewrote is guided as written.
  function pathParts(interaction, presented, instruction, language) {
    const model = interaction?.semanticActionModel || interaction || {};
    const recorded = unique(Array.isArray(model.actionPath) ? model.actionPath
      : Array.isArray(model.stepText?.path) ? model.stepText.path : []);
    if (recorded.length < 2) return null;
    const shown = unique(Array.isArray(presented?.actionPath) ? presented.actionPath : []);
    const captions = shown.length === recorded.length ? shown : recorded;
    if (!captions.every(caption => instruction.includes(caption))) return null;
    return recorded.map((caption, index) => ({ caption,
      instruction: sentenceFor(captions[index], language) }));
  }
  function sentenceFor(caption, language) {
    try {
      const rendered = stepText?.render(stepText.describe("path", { path: [caption] }), language)?.text;
      if (rendered) return rendered;
    } catch {}
    return caption;
  }

  // The steps of the document's workflow, in order, with the heading they are under and the
  // first screenshot the document shows for them.
  function stepsFromDocument(document, sourceDocument = null) {
    const language = text(document?.metadata?.documentLanguage) || "en-US";
    const workflow = (document?.sections || []).find(section => section.kind === "workflow");
    const interactions = interactionsOf(sourceDocument || document);
    const steps = [];
    let heading = "";
    const visit = blocks => (blocks || []).forEach(block => {
      if (block.kind === "heading" && Number(block.level) >= 2) { heading = blockText(block); return; }
      if (block.kind !== "step") { visit(block.blocks); return; }
      const children = block.blocks || [];
      const instruction = blockText(children.find(child => child.kind === "paragraph" &&
        String(child.blockId || "").startsWith("block:instruction:")) ||
        children.find(child => child.kind === "paragraph"));
      const image = children.find(child => child.kind === "image" && text(child.sourceRef?.screenshotRef));
      const interaction = interactions.get(text(block.sourceRef?.taskId)) || block.interaction || block.semanticAction;
      const stepId = String(block.blockId || `step-${steps.length + 1}`);
      const target = targetOf(interaction);
      const shot = image ? { screenshot: text(image.sourceRef.screenshotRef) } : {};
      const parts = pathParts(interaction, block.semanticAction, instruction, language);
      if (target.kind === "action" && parts) {
        // A path the document writes as one step ("Rad → Tillämpat inköpspris och rabatt") is
        // guided one click at a time: each menu or tab first, then the action itself.
        parts.forEach((part, index) => steps.push({ stepId: `${stepId}:part:${index + 1}`,
          number: steps.length + 1, heading, instruction: part.instruction,
          target: index === parts.length - 1 ? target
            : { kind: "action", page: target.page, pageCaption: target.pageCaption, action: "", caption: part.caption },
          ...shot }));
        return;
      }
      steps.push({ stepId, number: steps.length + 1, heading, instruction, target, ...shot });
    });
    visit(workflow?.blocks);
    return steps;
  }

  // options.sourceDocument: the document as Review projected it (createPresentation's
  // sourceSemanticDocument), which still holds each step's interaction.
  function create(document, options = {}) {
    const metadata = document?.metadata || {};
    const steps = stepsFromDocument(document, options.sourceDocument);
    if (!steps.length) throw new TypeError("The document has no steps to guide.");
    return { schemaVersion: SCHEMA_VERSION, projectId: text(options.projectId),
      sessionId: text(options.sessionId) || text(metadata.sessionId),
      title: text(options.title).trim() || text(metadata.title).trim(),
      documentLanguage: text(metadata.documentLanguage) || "en-US", steps };
  }

  // Whether what the user did in Business Central (an AL identity from
  // recorder/al-identity-capture.js) is the step's action.
  function actionMatches(target, identity) {
    if (target?.kind !== "action" || !identity || typeof identity !== "object") return false;
    if (target.operation && identity.operation === target.operation) return true;
    return Boolean(target.action) && ["action", "menu"].includes(identity.kind) &&
      identity.action === target.action;
  }

  // Captions compared as Business Central shows them: without the access-key ampersand and
  // extra spaces, in any letter case.
  const sameCaption = (left, right) => {
    const clean = value => text(value).replace(/&/gu, "").replace(/\s+/gu, " ").trim().toLocaleLowerCase();
    return Boolean(clean(left)) && clean(left) === clean(right);
  };

  return { SCHEMA_VERSION, targetOf, stepsFromDocument, create, actionMatches, sameCaption };
});
