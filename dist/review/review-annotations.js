(function (root, factory) {
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ReviewAnnotations = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (root) {
  const SCHEMA_VERSION = "1.0.0";
  const TYPES = Object.freeze({
    RECTANGLE: "rectangle",
    ARROW: "arrow"
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
      arrowheadLength: 0.025,
      arrowheadWidth: 0.018
    })
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
    if (type === TYPES.RECTANGLE) return normalizedRectangle(geometry);
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

  function createScreenshotSet(screenshotRef, options = {}) {
    if (typeof screenshotRef !== "string" || !screenshotRef.trim()) {
      throw new TypeError("Screenshot reference is required.");
    }
    return {
      annotationSetId: createId("annset", options.idFactory),
      screenshotRef: screenshotRef.trim(),
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
    return {
      annotationId: createId("ann", options.idFactory),
      type,
      geometry: normalizeGeometry(type, geometry),
      style: {
        ...DEFAULT_STYLES[type],
        ...clone(options.style || {})
      },
      accessibleLabel: options.accessibleLabel || "",
      createdAt: now,
      updatedAt: now
    };
  }

  function findScreenshotSet(store, screenshotRef) {
    const sets = normalizeStore(store).screenshotSets;
    if (!Array.isArray(sets)) return null;
    return sets.find(
      set => set.screenshotRef === screenshotRef
    ) || null;
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
    findScreenshotSet
  };
});
