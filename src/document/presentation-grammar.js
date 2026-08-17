(function (root, factory) {
  const semantic = typeof module === "object" && module.exports
    ? require("./semantic-document")
    : root.T9DocumentModel;
  const api = factory(semantic);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9PresentationGrammar = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (semantic) {
  const GRAMMAR_VERSION = "1.0.0";
  const cache = new WeakMap();

  function clone(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  }

  function run(text, role = "text") {
    return {
      text: String(text ?? ""),
      role,
      ...(role === "value" ? { bold: true } : {}),
      ...(["shortcut", "identifier"].includes(role) ? { monospace: true } : {})
    };
  }

  function quoted(value) {
    return run(`"${String(value ?? "").replace(/^['"“]|['"”]$/gu, "")}"`,
      "interface");
  }

  function sentence(...runs) {
    const filtered = runs.flat().filter(value => value?.text !== "");
    return { text: filtered.map(value => value.text).join(""), runs: filtered };
  }

  function legacyRuns(value) {
    const source = String(value ?? "");
    const result = [];
    const pattern = /(__([\s\S]+?)__|\*\*([\s\S]+?)\*\*|`([^`]+?)`)/g;
    let cursor = 0;
    let match;
    while ((match = pattern.exec(source))) {
      if (match.index > cursor) result.push(run(source.slice(cursor, match.index)));
      if (match[2] !== undefined) result.push(run(match[2], "value"));
      else if (match[3] !== undefined) result.push(quoted(match[3]));
      else result.push(run(match[4], technicalRole(match[4])));
      cursor = match.index + match[0].length;
    }
    if (cursor < source.length || !result.length) result.push(run(source.slice(cursor)));
    return result.filter(value => value.text !== "");
  }

  function technicalRole(value) {
    return /^(?:ctrl|cmd|alt|shift|enter|esc|escape|tab|delete|backspace|f\d+)(?:\b|\+)/iu
      .test(String(value)) ? "shortcut" : "identifier";
  }

  function presentationFor(action, fallbackText) {
    const value = String(action?.selectedValue ?? "").trim();
    const field = String(action?.targetField ?? "").trim();
    const selectLabels = {
      SelectCustomer: field || "Kund",
      SelectItem: field || "Artikelnummer",
      SelectVendor: field || "Leverantör",
      SelectLocation: field || "Lagerställe",
      SelectDimension: field || "Dimension"
    };
    if (selectLabels[action?.actionType] && value) {
      return sentence(run("Välj ", "action"), quoted(selectLabels[action.actionType]),
        run(" "), run(value, "value"), run("."));
    }
    if (["EnterQuantity", "EnterItemNumber", "SelectDate", "EnterFieldValue"].includes(
      action?.actionType) && value && field) {
      return sentence(run("Ange ", "action"), run(value, "value"),
        run(" i "), quoted(field), run("."));
    }
    if (["SelectOption", "SelectLookupValue"].includes(action?.actionType) &&
        value) {
      return field
        ? sentence(run("Välj ", "action"), quoted(field), run(" "),
          run(value, "value"), run("."))
        : sentence(run("Välj ", "action"), run(value, "value"), run("."));
    }
    if (["EnableCheckbox", "DisableCheckbox"].includes(action?.actionType) &&
        field) {
      return sentence(run(action.actionType === "EnableCheckbox"
        ? "Aktivera " : "Inaktivera ", "action"), quoted(field), run("."));
    }
    const runs = legacyRuns(fallbackText);
    return sentence(runs);
  }

  function processBlock(block, action) {
    const result = clone(block);
    const blockAction = result.kind === "step" ? result.semanticAction || action : action;
    if (result.kind === "paragraph" && typeof result.text === "string") {
      const presentation = presentationFor(blockAction, result.text);
      result.text = presentation.text;
      result.presentationRuns = presentation.runs;
    }
    if (Array.isArray(result.blocks)) {
      result.blocks = result.blocks.map(child => processBlock(
        child,
        result.kind === "step" && child.kind === "paragraph"
          ? blockAction
          : action
      ));
    }
    if (Array.isArray(result.items)) {
      result.items = result.items.map(item => ({ ...item,
        blocks: Array.isArray(item.blocks)
          ? item.blocks.map(child => processBlock(child, blockAction)) : item.blocks }));
    }
    if (Array.isArray(result.rows)) {
      result.rows = result.rows.map(row => ({ ...row,
        cells: Array.isArray(row.cells) ? row.cells.map(cell => ({ ...cell,
          blocks: Array.isArray(cell.blocks)
            ? cell.blocks.map(child => processBlock(child, blockAction)) : cell.blocks
        })) : row.cells }));
    }
    return result;
  }

  function process(document) {
    const cacheable = document && typeof document === "object" &&
      Object.isFrozen(document);
    if (cacheable && cache.has(document)) return cache.get(document);
    const normalized = semantic.normalize(document);
    const result = semantic.normalize({
      ...clone(normalized),
      sections: normalized.sections.map(section => ({ ...clone(section),
        blocks: section.blocks.map(block => processBlock(block)) })),
      provenance: {
        ...clone(normalized.provenance),
        transformations: [...new Set([
          ...(normalized.provenance?.transformations || []),
          "presentation-grammar"
        ])],
        presentationGrammarVersion: GRAMMAR_VERSION
      }
    });
    if (cacheable) cache.set(document, result);
    return result;
  }

  return { GRAMMAR_VERSION, legacyRuns, presentationFor, process };
});
