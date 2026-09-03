(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ProcessMapViewport = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const MIN_ZOOM = 60;
  const MAX_ZOOM = 160;
  const STEP = 10;
  function normalize(value) { if (value === null || value === undefined || value === "") return 100;
    const numeric = Number(value); if (!Number.isFinite(numeric)) return 100;
    return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.round(numeric / STEP) * STEP)); }
  function fitZoom(contentWidth, viewportWidth, currentZoom = 100) {
    const content = Number(contentWidth); const viewport = Number(viewportWidth);
    if (!(content > 0) || !(viewport > 0)) return 100;
    const naturalWidth = content / (normalize(currentZoom) / 100);
    return normalize(Math.floor((viewport / naturalWidth) * 100 / STEP) * STEP);
  }
  function measureFit(container, currentZoom = 100) {
    const frame = container?.querySelector?.(".process-diagram-scroll");
    const content = container?.querySelector?.(".process-overview-list");
    if (!frame || !content) return 100;
    const width = content.getBoundingClientRect?.().width || content.scrollWidth;
    return fitZoom(width, frame.clientWidth, currentZoom);
  }
  return { MAX_ZOOM, MIN_ZOOM, STEP, fitZoom, measureFit, normalize };
});
