(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9DocumentWorkspaceExperience = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const STORAGE_KEY = "t9.documentWorkspace.view.v1";
  const ZOOM_MIN = 50;
  const ZOOM_MAX = 200;
  const ZOOM_STEP = 10;
  const DEFAULTS = Object.freeze({
    zoom: 100,
    zoomMode: "custom",
    viewMode: "continuous",
    adaptiveReading: "auto",
    toolbarLayout: "auto",
    currentPage: 1
  });

  function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
  }

  function normalize(preferences = {}) {
    const zoom = Number(preferences.zoom);
    return Object.freeze({
      zoom: Number.isFinite(zoom)
        ? clamp(Math.round(zoom), ZOOM_MIN, ZOOM_MAX)
        : DEFAULTS.zoom,
      zoomMode: ["custom", "fitWidth", "fitPage"].includes(preferences.zoomMode)
        ? preferences.zoomMode
        : DEFAULTS.zoomMode,
      viewMode: ["continuous", "page"].includes(preferences.viewMode)
        ? preferences.viewMode
        : DEFAULTS.viewMode,
      adaptiveReading: ["auto", "on", "off"].includes(preferences.adaptiveReading)
        ? preferences.adaptiveReading
        : DEFAULTS.adaptiveReading,
      toolbarLayout: ["auto", "full", "compact"].includes(preferences.toolbarLayout)
        ? preferences.toolbarLayout
        : DEFAULTS.toolbarLayout,
      currentPage: Math.max(1, Math.round(Number(preferences.currentPage) || 1))
    });
  }

  function update(state, change) {
    return normalize({ ...state, ...change });
  }

  function zoomBy(state, direction) {
    return update(state, {
      zoom: state.zoom + direction * ZOOM_STEP,
      zoomMode: "custom"
    });
  }

  function setZoom(state, zoom) {
    return update(state, { zoom, zoomMode: "custom" });
  }

  function fit(state, mode) {
    return update(state, { zoomMode: mode });
  }

  function setViewMode(state, viewMode) {
    return update(state, { viewMode });
  }

  function navigate(state, destination, pageCount) {
    const total = Math.max(1, Number(pageCount) || 1);
    const destinations = {
      previous: state.currentPage - 1,
      next: state.currentPage + 1,
      home: 1,
      end: total
    };
    const page = Number.isFinite(Number(destination))
      ? Number(destination)
      : destinations[destination] ?? state.currentPage;
    return update(state, { currentPage: clamp(Math.round(page), 1, total) });
  }

  function effectiveZoom(state, dimensions = {}) {
    if (state.zoomMode === "custom") return state.zoom;
    const pageWidth = Math.max(1, Number(dimensions.pageWidth) || 780);
    const pageHeight = Math.max(1, Number(dimensions.pageHeight) || 900);
    const availableWidth = Math.max(1, Number(dimensions.availableWidth) || pageWidth);
    const availableHeight = Math.max(1, Number(dimensions.availableHeight) || pageHeight);
    const widthZoom = availableWidth / pageWidth * 100;
    const target = state.zoomMode === "fitPage"
      ? Math.min(widthZoom, availableHeight / pageHeight * 100)
      : widthZoom;
    return clamp(Math.floor(target), ZOOM_MIN, ZOOM_MAX);
  }

  function adaptiveEnabled(state, environment = {}) {
    if (state.adaptiveReading === "on") return true;
    if (state.adaptiveReading === "off") return false;
    const workspaceWidth = Number(environment.workspaceWidth) || 0;
    const zoom = Number(environment.zoom) || state.zoom;
    const documentWidth = Number(environment.documentWidth) || 780;
    const surroundingSpace = workspaceWidth - documentWidth * zoom / 100;
    return state.viewMode === "page" || surroundingSpace >= 160 || zoom < 90;
  }

  function compactToolbar(state, workspaceWidth) {
    if (state.toolbarLayout === "compact") return true;
    if (state.toolbarLayout === "full") return false;
    return Number(workspaceWidth) < 760;
  }

  function load(storage) {
    try {
      return normalize({
        ...JSON.parse(storage?.getItem(STORAGE_KEY) || "{}"),
        currentPage: 1
      });
    } catch (_error) {
      return normalize();
    }
  }

  function save(storage, state) {
    try {
      const normalized = normalize(state);
      storage?.setItem(STORAGE_KEY, JSON.stringify({
        zoom: normalized.zoom,
        zoomMode: normalized.zoomMode,
        viewMode: normalized.viewMode,
        adaptiveReading: normalized.adaptiveReading,
        toolbarLayout: normalized.toolbarLayout
      }));
      return true;
    } catch (_error) {
      return false;
    }
  }

  return {
    DEFAULTS,
    STORAGE_KEY,
    ZOOM_MAX,
    ZOOM_MIN,
    adaptiveEnabled,
    compactToolbar,
    effectiveZoom,
    fit,
    load,
    navigate,
    normalize,
    save,
    setViewMode,
    setZoom,
    update,
    zoomBy
  };
});
