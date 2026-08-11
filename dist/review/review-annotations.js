(function (root, factory) {
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ReviewAnnotations = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (root) {
  const SCHEMA_VERSION = "1.0.0";
  const TYPES = Object.freeze({
    RECTANGLE: "rectangle",
    ARROW: "arrow",
    HIGHLIGHT: "highlight",
    NUMBERED_CALLOUT: "numbered-callout",
    TEXT_LABEL: "text-label"
  });
  const DEFAULT_STYLES = Object.freeze({
    [TYPES.RECTANGLE]: Object.freeze({
      stroke: "#dc2626",
      strokeWidth: 0.006,
      opacity: 1
    }),
    [TYPES.ARROW]: Object.freeze({
      stroke: "#dc2626",
      strokeWidth: 0.006,
      opacity: 1,
      arrowheadLength: 0.04,
      arrowheadWidth: 0.04
    }),
    [TYPES.HIGHLIGHT]: Object.freeze({ fill: "#fde047", opacity: 0.35 }),
    [TYPES.NUMBERED_CALLOUT]: Object.freeze({ fill: "#dc2626", opacity: 1 }),
    [TYPES.TEXT_LABEL]: Object.freeze({ fill: "#111827", opacity: 1 })
  });

  function clone(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  }

  function finiteNumber(value, name) {
    if (!Number.isFinite(value)) {
      throw new TypeError(`${name} must be a finite number.`);
    }
    return value;
  }

  function clamp(value) {
    return Math.max(0, Math.min(1, value));
  }

  function normalizedRectangle(geometry = {}) {
    const firstX = finiteNumber(geometry.x, "x");
    const firstY = finiteNumber(geometry.y, "y");
    const secondX = firstX + finiteNumber(geometry.width, "width");
    const secondY = firstY + finiteNumber(geometry.height, "height");
    const left = clamp(Math.min(firstX, secondX));
    const top = clamp(Math.min(firstY, secondY));
    const right = clamp(Math.max(firstX, secondX));
    const bottom = clamp(Math.max(firstY, secondY));

    if (right === left || bottom === top) {
      throw new RangeError("A rectangle must have a visible width and height.");
    }

    return {
      x: left,
      y: top,
      width: right - left,
      height: bottom - top
    };
  }

  function normalizedArrow(geometry = {}) {
    const result = {
      startX: clamp(finiteNumber(geometry.startX, "startX")),
      startY: clamp(finiteNumber(geometry.startY, "startY")),
      endX: clamp(finiteNumber(geometry.endX, "endX")),
      endY: clamp(finiteNumber(geometry.endY, "endY"))
    };

    if (result.startX === result.endX && result.startY === result.endY) {
      throw new RangeError("An arrow must have different start and end points.");
    }
    return result;
  }

  function normalizeGeometry(type, geometry) {
    if ([TYPES.RECTANGLE, TYPES.HIGHLIGHT, TYPES.NUMBERED_CALLOUT,
      TYPES.TEXT_LABEL].includes(type)) return normalizedRectangle(geometry);
    if (type === TYPES.ARROW) return normalizedArrow(geometry);
    return clone(geometry || {});
  }

  function validation(annotation) {
    if (!annotation || typeof annotation !== "object") {
      return { valid: false, errors: ["Annotation must be an object."] };
    }
    if (!annotation.annotationId) {
      return { valid: false, errors: ["Annotation ID is required."] };
    }
    if (!Object.values(TYPES).includes(annotation.type)) {
      return { valid: true, errors: [], supported: false };
    }
    if (![TYPES.RECTANGLE, TYPES.ARROW].includes(annotation.type) &&
        annotation.schemaVersion !== SCHEMA_VERSION) {
      return { valid: true, errors: [], supported: false };
    }
    try {
      normalizeGeometry(annotation.type, annotation.geometry);
      return { valid: true, errors: [], supported: true };
    } catch (error) {
      return { valid: false, errors: [error.message], supported: true };
    }
  }

  function createId(prefix, idFactory) {
    const factory = idFactory || root.crypto?.randomUUID?.bind(root.crypto);
    if (!factory) {
      throw new Error("A secure annotation ID generator is unavailable.");
    }
    const value = String(factory()).trim();
    if (!value) throw new Error("The annotation ID generator returned no ID.");
    return value.startsWith(`${prefix}_`) ? value : `${prefix}_${value}`;
  }

  function emptyStore() {
    return {
      schemaVersion: SCHEMA_VERSION,
      screenshotSets: []
    };
  }

  function normalizeStore(value) {
    if (!value || typeof value !== "object") return emptyStore();
    const normalized = clone(value);
    if (typeof normalized.schemaVersion !== "string") {
      normalized.schemaVersion = SCHEMA_VERSION;
    }
    if (!Object.hasOwn(normalized, "screenshotSets")) {
      normalized.screenshotSets = [];
    }
    return normalized;
  }

  function normalizeReview(review) {
    const normalized = clone(review || {});
    normalized.annotations = normalizeStore(review?.annotations);
    return normalized;
  }

  function normalizedScreenshotRef(screenshotRef) {
    if (typeof screenshotRef !== "string" || !screenshotRef.trim()) {
      throw new TypeError("Screenshot reference is required.");
    }
    return screenshotRef.trim();
  }

  function createScreenshotSet(screenshotRef, options = {}) {
    return {
      annotationSetId: createId("annset", options.idFactory),
      screenshotRef: normalizedScreenshotRef(screenshotRef),
      revision: 0,
      updatedAt: options.now || new Date().toISOString(),
      items: []
    };
  }

  function createAnnotation(type, geometry, options = {}) {
    if (!Object.values(TYPES).includes(type)) {
      throw new TypeError(`Unsupported annotation type: ${type}`);
    }
    const now = options.now || new Date().toISOString();
    const label = String(options.label || "");
    if ([TYPES.NUMBERED_CALLOUT, TYPES.TEXT_LABEL].includes(type) &&
        !label.trim()) {
      throw new TypeError("Labeled annotations require a label.");
    }
    return {
      annotationId: createId("ann", options.idFactory),
      schemaVersion: SCHEMA_VERSION,
      recordingId: String(options.recordingId || ""),
      screenshotAssetId: options.screenshotAssetId
        ? normalizedScreenshotRef(options.screenshotAssetId) : null,
      ownerStepId: options.ownerStepId ? String(options.ownerStepId) : null,
      type,
      geometry: normalizeGeometry(type, geometry),
      style: {
        ...DEFAULT_STYLES[type],
        ...clone(options.style || {})
      },
      label,
      accessibleLabel: options.accessibleLabel || label,
      styleRole: options.styleRole || "attention",
      visibility: options.visibility === "hidden" ? "hidden" : "visible",
      provenance: options.provenance || "manual",
      metadata: clone(options.metadata || {}),
      futureFields: clone(options.futureFields || {}),
      createdAt: now,
      updatedAt: now
    };
  }

  function findScreenshotSet(store, screenshotRef) {
    const sets = normalizeStore(store).screenshotSets;
    if (!Array.isArray(sets)) return null;
    const reference = normalizedScreenshotRef(screenshotRef);
    return sets.find(
      set => set.screenshotRef === reference
    ) || null;
  }

  function add(review, screenshotRef, annotation, options = {}) {
    const result = validation(annotation);
    if (!result.valid || !result.supported) {
      throw new TypeError(result.errors[0] || "Unsupported annotation.");
    }
    const store = normalizeStore(review.annotations);
    if (!Array.isArray(store.screenshotSets)) {
      throw new Error("This annotation schema cannot be edited by this version.");
    }
    const reference = normalizedScreenshotRef(screenshotRef);
    let set = store.screenshotSets.find(
      candidate => candidate.screenshotRef === reference
    );
    if (!set) {
      set = createScreenshotSet(reference, options);
      store.screenshotSets.push(set);
    }
    const items = Array.isArray(set.items) ? set.items : [];
    if (items.some(item => item.annotationId === annotation.annotationId)) {
      throw new Error(`Duplicate annotation ID: ${annotation.annotationId}`);
    }
    const now = options.now || new Date().toISOString();
    set.items = [...items, { ...clone(annotation), screenshotAssetId: reference }];
    set.revision = Number.isInteger(set.revision) ? set.revision + 1 : 1;
    set.updatedAt = now;
    review.annotations = store;
    review.updatedAt = now;
    return clone(annotation);
  }

  function editableSet(review, screenshotRef) {
    const store = normalizeStore(review.annotations);
    if (!Array.isArray(store.screenshotSets)) {
      throw new Error("This annotation schema cannot be edited by this version.");
    }
    const reference = normalizedScreenshotRef(screenshotRef);
    const set = store.screenshotSets.find(
      candidate => candidate.screenshotRef === reference
    );
    return { store, set };
  }

  function update(review, screenshotRef, annotationId, patch, options = {}) {
    const { store, set } = editableSet(review, screenshotRef);
    const index = Array.isArray(set?.items)
      ? set.items.findIndex(annotation => annotation.annotationId === annotationId)
      : -1;
    if (index < 0) return null;
    const current = set.items[index];
    const next = {
      ...current,
      ...clone(patch || {}),
      annotationId: current.annotationId,
      type: patch?.type && Object.values(TYPES).includes(patch.type)
        ? patch.type : current.type,
      style: patch?.style
        ? { ...clone(current.style || {}), ...clone(patch.style) }
        : clone(current.style),
      geometry: patch?.geometry
        ? normalizeGeometry(patch?.type || current.type, patch.geometry)
        : clone(current.geometry),
      updatedAt: current.updatedAt
    };
    const result = validation(next);
    if (!result.valid || !result.supported) {
      throw new TypeError(result.errors[0] || "Unsupported annotation.");
    }
    if (JSON.stringify(current) === JSON.stringify(next)) {
      return clone(current);
    }
    next.updatedAt = options.now || new Date().toISOString();
    set.items = set.items.map((annotation, itemIndex) =>
      itemIndex === index ? next : annotation
    );
    set.revision = Number.isInteger(set.revision) ? set.revision + 1 : 1;
    set.updatedAt = next.updatedAt;
    review.annotations = store;
    review.updatedAt = next.updatedAt;
    return clone(next);
  }

  function remove(review, screenshotRef, annotationId, options = {}) {
    const { store, set } = editableSet(review, screenshotRef);
    if (!set || !Array.isArray(set.items)) return null;
    const removed = set.items.find(
      annotation => annotation.annotationId === annotationId
    );
    if (!removed) return null;
    const now = options.now || new Date().toISOString();
    set.items = set.items.filter(
      annotation => annotation.annotationId !== annotationId
    );
    set.revision = Number.isInteger(set.revision) ? set.revision + 1 : 1;
    set.updatedAt = now;
    review.annotations = store;
    review.updatedAt = now;
    return clone(removed);
  }

  function diagnostics(store, screenshotAssetIds = [], ownerStepIds = []) {
    const assets = new Set(screenshotAssetIds.map(String));
    const owners = new Set(ownerStepIds.map(String));
    return (normalizeStore(store).screenshotSets || []).flatMap(set =>
      (set.items || []).flatMap(annotation => {
        const issues = [];
        if (!assets.has(set.screenshotRef)) issues.push({
          code: "orphaned-annotation-screenshot",
          annotationId: annotation.annotationId,
          screenshotAssetId: set.screenshotRef
        });
        if (annotation.ownerStepId && !owners.has(annotation.ownerStepId)) {
          issues.push({ code: "orphaned-annotation-step",
            annotationId: annotation.annotationId,
            ownerStepId: annotation.ownerStepId });
        }
        if ([TYPES.NUMBERED_CALLOUT, TYPES.TEXT_LABEL].includes(annotation.type) &&
            !String(annotation.accessibleLabel || annotation.label || "").trim()) {
          issues.push({ code: "inaccessible-annotation",
            annotationId: annotation.annotationId });
        }
        return issues;
      })
    );
  }

  return {
    SCHEMA_VERSION,
    TYPES,
    DEFAULT_STYLES,
    emptyStore,
    normalizeStore,
    normalizeReview,
    normalizeGeometry,
    validation,
    createScreenshotSet,
    createAnnotation,
    findScreenshotSet,
    diagnostics,
    add,
    update,
    remove
  };
});
