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
      selectedId: null,
      draft: null,
      translation: null
    };
  }

  function selectTool(state, tool) {
    if (tool !== "rectangle" && tool !== "arrow") return state;
    return { ...state, tool, draft: null, translation: null };
  }

  function select(state, annotationId) {
    return {
      ...state,
      selectedId: annotationId || null,
      draft: null,
      translation: null
    };
  }

  function reconcileSelection(state, annotationItems) {
    if (!state?.selectedId) return state;
    return (annotationItems || []).some(
      annotation => annotation.annotationId === state.selectedId
    )
      ? state
      : select(state, null);
  }

  function point(clientX, clientY, bounds) {
    if (!bounds || bounds.width <= 0 || bounds.height <= 0) return null;
    return {
      x: clamp((clientX - bounds.left) / bounds.width),
      y: clamp((clientY - bounds.top) / bounds.height)
    };
  }

  function begin(state, start) {
    if (!start || !["rectangle", "arrow"].includes(state.tool)) return state;
    return {
      ...state,
      selectedId: null,
      draft: { type: state.tool, start, end: start },
      translation: null
    };
  }

  function move(state, end) {
    if (!state.draft || !end) return state;
    return { ...state, draft: { ...state.draft, end } };
  }

  function geometry(state) {
    if (!state?.draft) return null;
    if (state.draft.type === "arrow") {
      return {
        startX: state.draft.start.x,
        startY: state.draft.start.y,
        endX: state.draft.end.x,
        endY: state.draft.end.y
      };
    }
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
    return { ...state, draft: null, translation: null };
  }

  function centeredRectangle() {
    return { x: 0.3, y: 0.375, width: 0.4, height: 0.25 };
  }

  function centeredArrow() {
    return { startX: 0.3, startY: 0.65, endX: 0.7, endY: 0.35 };
  }

  function translatedGeometry(type, geometry, deltaX, deltaY) {
    if (type === "rectangle") {
      const x = clamp(geometry.x + deltaX);
      const y = clamp(geometry.y + deltaY);
      return {
        ...geometry,
        x: Math.min(x, 1 - geometry.width),
        y: Math.min(y, 1 - geometry.height)
      };
    }
    const minimumX = Math.min(geometry.startX, geometry.endX);
    const maximumX = Math.max(geometry.startX, geometry.endX);
    const minimumY = Math.min(geometry.startY, geometry.endY);
    const maximumY = Math.max(geometry.startY, geometry.endY);
    const adjustedX = Math.max(-minimumX, Math.min(1 - maximumX, deltaX));
    const adjustedY = Math.max(-minimumY, Math.min(1 - maximumY, deltaY));
    return {
      ...geometry,
      startX: geometry.startX + adjustedX,
      startY: geometry.startY + adjustedY,
      endX: geometry.endX + adjustedX,
      endY: geometry.endY + adjustedY
    };
  }

  function beginTranslation(state, annotation, start) {
    if (!annotation || !start) return state;
    return {
      ...state,
      selectedId: annotation.annotationId,
      draft: null,
      translation: {
        annotationId: annotation.annotationId,
        type: annotation.type,
        originalGeometry: annotation.geometry,
        start,
        geometry: annotation.geometry
      }
    };
  }

  function moveTranslation(state, pointValue) {
    if (!state.translation || !pointValue) return state;
    const deltaX = pointValue.x - state.translation.start.x;
    const deltaY = pointValue.y - state.translation.start.y;
    return {
      ...state,
      translation: {
        ...state.translation,
        geometry: translatedGeometry(
          state.translation.type,
          state.translation.originalGeometry,
          deltaX,
          deltaY
        )
      }
    };
  }

  function finishTranslation(state) {
    if (!state.translation) return { state, change: null };
    return {
      state: { ...state, translation: null },
      change: {
        annotationId: state.translation.annotationId,
        geometry: state.translation.geometry
      }
    };
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

  function baseline(review) {
    return JSON.parse(JSON.stringify({
      annotations: review.annotations,
      commandHistoryVersion: review.commandHistoryVersion,
      commandHistory: review.commandHistory || [],
      historyIndex: review.historyIndex || 0
    }));
  }

  function restoreBaseline(review, value, options = {}) {
    const current = JSON.parse(JSON.stringify(review));
    const saved = JSON.parse(JSON.stringify(value));
    const baselineIds = new Set(
      saved.commandHistory.map(entry => entry.historyId)
    );
    const currentById = new Map(
      (current.commandHistory || []).map(entry => [entry.historyId, entry])
    );
    const baselineEntries = saved.commandHistory.map(entry =>
      !entry.type?.startsWith("annotation-") && currentById.has(entry.historyId)
        ? currentById.get(entry.historyId)
        : entry
    );
    const externalEntries = (current.commandHistory || []).filter(entry =>
      !baselineIds.has(entry.historyId) &&
      !entry.type?.startsWith("annotation-")
    );
    const hasExternalEntries = externalEntries.length > 0;
    const restoredEntries = hasExternalEntries
      ? baselineEntries.slice(0, saved.historyIndex)
      : baselineEntries;
    const combinedHistory = [...restoredEntries, ...externalEntries];
    const removedEntryCount = Math.max(0, combinedHistory.length - 100);
    const commandHistory = combinedHistory.slice(removedEntryCount);
    const restoredIndex = hasExternalEntries
      ? combinedHistory.length
      : saved.historyIndex;
    return {
      ...current,
      annotations: saved.annotations,
      commandHistoryVersion: saved.commandHistoryVersion,
      commandHistory,
      historyIndex: Math.max(
        0,
        Math.min(commandHistory.length, restoredIndex - removedEntryCount)
      ),
      updatedAt: options.now || new Date().toISOString()
    };
  }

  function hasActiveGesture(state) {
    return Boolean(state?.draft || state?.translation);
  }

  function canRestoreAnnotation(review, direction) {
    const index = direction === "undo"
      ? review.historyIndex - 1
      : review.historyIndex;
    return review.commandHistory?.[index]?.type?.startsWith("annotation-") ||
      false;
  }

  return {
    create,
    selectTool,
    select,
    reconcileSelection,
    point,
    begin,
    move,
    geometry,
    finish,
    cancel,
    centeredRectangle,
    centeredArrow,
    translatedGeometry,
    beginTranslation,
    moveTranslation,
    finishTranslation,
    releasePointer,
    baseline,
    restoreBaseline,
    hasActiveGesture,
    canRestoreAnnotation
  };
});
