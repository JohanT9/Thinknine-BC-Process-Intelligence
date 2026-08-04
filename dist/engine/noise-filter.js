(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9Engine = root.T9Engine || {};
  root.T9Engine.noiseFilter = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const ignoredTypes = new Set(["pointer", "page-state", "hover", "scroll"]);
  const ignoredCaptions = [
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
    if (ignoredTypes.has(event.type)) return true;

    const caption = clean(event.fieldName || event.label);
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
