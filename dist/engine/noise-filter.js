(function (root, factory) {
  const captions = typeof module === "object" && module.exports
    ? require("./bc-client-captions") : root.T9BCClientCaptions;
  const api = factory(captions);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9Engine = root.T9Engine || {};
  root.T9Engine.noiseFilter = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (captions) {
  const ignoredTypes = new Set(["pointer", "page-state", "hover", "scroll"]);
  // The legacy BC back/dismiss icon glyph, then the shared client caption categories.
  const isIgnoredCaption = caption => /^$/u.test(caption) ||
    ["close", "display", "scroll", "history", "tellMe"].some(category =>
      captions.matches(category, caption));

  function clean(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function isNoise(event) {
    if (!event) return true;
    if (event.type === "click" && event.controlType === "input" &&
        event.inputType === "text" && ["textbox", "combobox"].includes(event.role) &&
        event.value == null && !event.ariaHasPopup && !event.reactInteractive &&
        !event.selectedCaption && event.category === "interaction") return true;
    if (event.type === "click" && event.category === "interaction" &&
        event.role === "main" && !event.reactInteractive &&
        !event.fieldId && !event.inputType && event.value == null) return true;
    if (ignoredTypes.has(event.type) || event.type === "dialog-close") return true;
    if (event.type === "click" && event.controlKind === "dialogClose") return true;
    if (["click", "action", "navigation"].includes(event.type) &&
        event.controlKind === "sectionToggle") return true;

    const caption = clean(event.fieldName || event.label).split(/\s*(?:→|->)\s*/).at(-1);
    if (["textbox", "searchbox"].includes(event.role) &&
        captions.matches("tellMe", caption)) return true;
    // Legacy recordings may lack section metadata. Only suppress a bare section click,
    // never a field interaction or a recorded value.
    if (event.type === "click" && /^(?:vikt|weight)\.?$/iu.test(caption) &&
        !event.fieldId && !event.inputType && event.value == null &&
        !["input", "textarea"].includes(event.controlType) && event.role !== "textbox") return true;
    if (isIgnoredCaption(caption)) {
      return event.type !== "field-change" || !String(event.value || "").trim();
    }

    if (
      event.type === "field-change" &&
      /kundens namn|customer name/i.test(caption) &&
      !String(event.value || "").trim()
    ) return true;

    return false;
  }

  function signature(event) {
    return JSON.stringify([
      event.type,
      event.category,
      event.label,
      event.fieldName,
      event.value,
      event.pageId,
      event.pageCaption
    ]);
  }

  function filter(events) {
    const result = [];
    for (const event of events || []) {
      if (isNoise(event)) continue;
      const previous = result[result.length - 1];
      if (previous && signature(previous) === signature(event)) continue;
      result.push(event);
    }
    return result;
  }

  return { filter, isNoise, signature };
});
