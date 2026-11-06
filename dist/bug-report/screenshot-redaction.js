(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ScreenshotRedaction = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  // Regions are shares of the screenshot (0–1), so they hold at any image size.
  const share = value => Math.min(1, Math.max(0, Math.round(Number(value) * 10000) / 10000));
  function box(value = {}) {
    const x = share(value.x), y = share(value.y);
    const width = share(Math.min(share(value.width), 1 - x));
    const height = share(Math.min(share(value.height), 1 - y));
    return Number.isFinite(x + y + width + height) && width > 0 && height > 0
      ? { x, y, width, height } : null;
  }
  // Every region of a screenshot for the editor: those measured when it was captured, each
  // marked when the user removed it, and those the user added.
  function editable(asset, screenshot) {
    const redactions = screenshot?.redactions || {};
    const removed = new Set((redactions.removed || []).map(String));
    const measured = (Array.isArray(asset?.valueRegions) ? asset.valueRegions : [])
      .map((region, index) => ({ region, id: `auto:${index}` }))
      .flatMap(({ region, id }) => {
        const bounds = box(region);
        return bounds ? [{ id, source: "auto", kind: String(region.kind || ""), removed: removed.has(id),
          ...bounds }] : [];
      });
    const added = (Array.isArray(redactions.added) ? redactions.added : []).flatMap(region => {
      const bounds = box(region);
      return bounds && region.id ? [{ id: String(region.id), source: "manual", kind: "",
        removed: false, ...bounds }] : [];
    });
    return [...measured, ...added];
  }
  // The regions covered when the report masks values.
  const covered = (asset, screenshot) => editable(asset, screenshot).filter(item => !item.removed);
  // Whether the screenshot was measured completely when it was captured.
  const measured = asset => Array.isArray(asset?.valueRegions) && asset.valueRegionsComplete !== false;
  // What the report stores: removed measured regions and added regions, nothing else.
  function normalize(redactions = {}) {
    return { removed: [...new Set((redactions.removed || []).map(String)
      .filter(id => /^auto:\d+$/u.test(id)))],
    added: (Array.isArray(redactions.added) ? redactions.added : []).flatMap(region => {
      const bounds = box(region);
      return bounds && region.id ? [{ id: String(region.id).slice(0, 80), ...bounds }] : [];
    }).slice(0, 200) };
  }
  // The screenshot with its covered regions filled in, so that the values are gone from the
  // image itself and not only hidden on screen.
  async function apply(source, regions, doc = globalThis.document) {
    if (!source || !regions?.length) return source;
    const image = new Image();
    image.src = source;
    await image.decode();
    const canvas = doc.createElement("canvas");
    canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d");
    context.drawImage(image, 0, 0);
    context.fillStyle = "#3b4048";
    const pad = 2;
    for (const region of regions) {
      context.fillRect(Math.floor(region.x * canvas.width) - pad,
        Math.floor(region.y * canvas.height) - pad,
        Math.ceil(region.width * canvas.width) + pad * 2,
        Math.ceil(region.height * canvas.height) + pad * 2);
    }
    // Kept in the original format so a PDF or email does not grow.
    return /^data:image\/jpe?g[;,]/iu.test(String(source))
      ? canvas.toDataURL("image/jpeg", 0.92) : canvas.toDataURL("image/png");
  }
  return { box, editable, covered, measured, normalize, apply };
});
