(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9Engine = root.T9Engine || {};
  root.T9Engine.noiseFilter = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const ignoredTypes = new Set(["pointer", "page-state", "hover", "scroll"]);
  const ignoredCaptions = [
    /^\uE72B$/i, // Legacy BC back/dismiss navigation icon.
    /^(?:stäng|close|dismiss)\.?$/i,
    /^(?:visa resten|show more|show less|visa mindre|visa sekundära åtgärder|show secondary actions)\.?$/i,
    /^(?:rulla|scroll)(?:\s+(?:åt|to\s+the))?\s+(?:höger|vänster|upp|ned|ner|right|left|up|down)\.?$/i,
    /^bakåt$/i,
    /^tillbaka$/i,
    /^back$/i,
    /^framåt$/i,
    /^forward$/i,
    /^berätta vad du vill göra\.?$/i,
    /^tell me what you want to do\.?$/i
  ];

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
        /^(?:tell me what you want to do|berätta vad du vill göra)\.?$/iu.test(caption)) return true;
    // Legacy recordings may lack section metadata. Only suppress a bare section click,
    // never a field interaction or a recorded value.
    if (event.type === "click" && /^(?:vikt|weight)\.?$/iu.test(caption) &&
        !event.fieldId && !event.inputType && event.value == null &&
        !["input", "textarea"].includes(event.controlType) && event.role !== "textbox") return true;
    if (ignoredCaptions.some(pattern => pattern.test(caption))) {
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
