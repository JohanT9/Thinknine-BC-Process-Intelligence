(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ReviewAnnotationEditor = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function clamp(value) {
    return Math.max(0, Math.min(1, value));
  }

  function create(options) {
    return {
      taskId: options.taskId,
      screenshotRef: options.screenshotRef,
      imageUrl: options.imageUrl,
      tool: "rectangle",
      draft: null
    };
  }

  function point(clientX, clientY, bounds) {
    if (!bounds || bounds.width <= 0 || bounds.height <= 0) return null;
    return {
      x: clamp((clientX - bounds.left) / bounds.width),
      y: clamp((clientY - bounds.top) / bounds.height)
    };
  }

  function begin(state, start) {
    if (!start || state.tool !== "rectangle") return state;
    return { ...state, draft: { start, end: start } };
  }

  function move(state, end) {
    if (!state.draft || !end) return state;
    return { ...state, draft: { ...state.draft, end } };
  }

  function geometry(state) {
    if (!state?.draft) return null;
    return {
      x: state.draft.start.x,
      y: state.draft.start.y,
      width: state.draft.end.x - state.draft.start.x,
      height: state.draft.end.y - state.draft.start.y
    };
  }

  function finish(state) {
    return { state: { ...state, draft: null }, geometry: geometry(state) };
  }

  function cancel(state) {
    return { ...state, draft: null };
  }

  function centeredRectangle() {
    return { x: 0.3, y: 0.375, width: 0.4, height: 0.25 };
  }

  function releasePointer(surface, pointerId) {
    if (!surface || pointerId === undefined || pointerId === null) return false;
    try {
      if (surface.hasPointerCapture?.(pointerId) === false) return false;
      if (!surface.releasePointerCapture) return false;
      surface.releasePointerCapture(pointerId);
      return true;
    } catch {
      return false;
    }
  }

  return {
    create,
    point,
    begin,
    move,
    geometry,
    finish,
    cancel,
    centeredRectangle,
    releasePointer
  };
});
