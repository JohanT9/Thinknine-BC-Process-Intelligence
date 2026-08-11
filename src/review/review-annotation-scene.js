(function (root, factory) {
  const annotations = typeof module === "object" && module.exports
    ? require("./review-annotations")
    : root.T9ReviewAnnotations;
  const api = factory(annotations);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ReviewAnnotationScene = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (
  annotations
) {
  function positiveDimension(value, name) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new RangeError(`${name} must be greater than zero.`);
    }
    return value;
  }

  function finiteStyle(value, fallback, minimum = 0, maximum = 1) {
    return Number.isFinite(value) && value >= minimum && value <= maximum
      ? value
      : fallback;
  }

  function colorStyle(value, fallback) {
    return typeof value === "string" && value.trim() &&
      !/^url\s*\(/i.test(value.trim())
      ? value
      : fallback;
  }

  function rectanglePrimitive(annotation, width, height) {
    const geometry = annotations.normalizeGeometry(
      annotations.TYPES.RECTANGLE,
      annotation.geometry
    );
    const style = {
      ...annotations.DEFAULT_STYLES[annotations.TYPES.RECTANGLE],
      ...(annotation.style || {})
    };
    return {
      annotationId: annotation.annotationId,
      type: annotations.TYPES.RECTANGLE,
      x: geometry.x * width,
      y: geometry.y * height,
      width: geometry.width * width,
      height: geometry.height * height,
      stroke: colorStyle(
        style.stroke,
        annotations.DEFAULT_STYLES[annotations.TYPES.RECTANGLE].stroke
      ),
      strokeWidth: finiteStyle(
        style.strokeWidth,
        annotations.DEFAULT_STYLES[annotations.TYPES.RECTANGLE].strokeWidth
      ) * Math.min(width, height),
      opacity: finiteStyle(
        style.opacity,
        annotations.DEFAULT_STYLES[annotations.TYPES.RECTANGLE].opacity
      )
    };
  }

  function arrowPrimitive(annotation, width, height) {
    const geometry = annotations.normalizeGeometry(
      annotations.TYPES.ARROW,
      annotation.geometry
    );
    const style = {
      ...annotations.DEFAULT_STYLES[annotations.TYPES.ARROW],
      ...(annotation.style || {})
    };
    const startX = geometry.startX * width;
    const startY = geometry.startY * height;
    const endX = geometry.endX * width;
    const endY = geometry.endY * height;
    const deltaX = endX - startX;
    const deltaY = endY - startY;
    const distance = Math.hypot(deltaX, deltaY);
    const unitX = deltaX / distance;
    const unitY = deltaY / distance;
    const scale = Math.min(width, height);
    const configuredLength = style.arrowheadLength === 0.025
      ? annotations.DEFAULT_STYLES[annotations.TYPES.ARROW].arrowheadLength
      : style.arrowheadLength;
    const configuredWidth = style.arrowheadWidth === 0.018
      ? annotations.DEFAULT_STYLES[annotations.TYPES.ARROW].arrowheadWidth
      : style.arrowheadWidth;
    const headLength = Math.min(finiteStyle(
      configuredLength,
      annotations.DEFAULT_STYLES[annotations.TYPES.ARROW].arrowheadLength
    ) * scale, distance * 0.6);
    const halfWidth = Math.min(
      finiteStyle(
        configuredWidth,
        annotations.DEFAULT_STYLES[annotations.TYPES.ARROW].arrowheadWidth
      ) * scale / 2,
      distance * 0.3
    );
    const baseX = endX - unitX * headLength;
    const baseY = endY - unitY * headLength;
    return {
      annotationId: annotation.annotationId,
      type: annotations.TYPES.ARROW,
      startX,
      startY,
      endX,
      endY,
      headPoints: [
        [endX, endY],
        [baseX - unitY * halfWidth, baseY + unitX * halfWidth],
        [baseX + unitY * halfWidth, baseY - unitX * halfWidth]
      ],
      stroke: colorStyle(
        style.stroke,
        annotations.DEFAULT_STYLES[annotations.TYPES.ARROW].stroke
      ),
      strokeWidth: finiteStyle(
        style.strokeWidth,
        annotations.DEFAULT_STYLES[annotations.TYPES.ARROW].strokeWidth
      ) * scale,
      opacity: finiteStyle(
        style.opacity,
        annotations.DEFAULT_STYLES[annotations.TYPES.ARROW].opacity
      )
    };
  }

  function create(items, width, height) {
    const sceneWidth = positiveDimension(width, "width");
    const sceneHeight = positiveDimension(height, "height");
    return (items || []).flatMap(annotation => {
      if (annotation.visibility === "hidden") return [];
      const result = annotations.validation(annotation);
      if (!result.valid || !result.supported) return [];
      if (annotation.type === annotations.TYPES.RECTANGLE) {
        return [rectanglePrimitive(annotation, sceneWidth, sceneHeight)];
      }
      if (annotation.type === annotations.TYPES.ARROW) {
        return [arrowPrimitive(annotation, sceneWidth, sceneHeight)];
      }
      if ([annotations.TYPES.HIGHLIGHT,
        annotations.TYPES.NUMBERED_CALLOUT,
        annotations.TYPES.TEXT_LABEL].includes(annotation.type)) {
        const geometry = annotations.normalizeGeometry(
          annotation.type, annotation.geometry
        );
        const style = { ...annotations.DEFAULT_STYLES[annotation.type],
          ...(annotation.style || {}) };
        return [{ annotationId: annotation.annotationId,
          type: annotation.type, x: geometry.x * sceneWidth,
          y: geometry.y * sceneHeight, width: geometry.width * sceneWidth,
          height: geometry.height * sceneHeight,
          fill: colorStyle(style.fill,
            annotations.DEFAULT_STYLES[annotation.type].fill),
          opacity: finiteStyle(style.opacity,
            annotations.DEFAULT_STYLES[annotation.type].opacity),
          label: annotation.label || "",
          accessibleLabel: annotation.accessibleLabel || annotation.label || "" }];
      }
      return [];
    });
  }

  return { create };
});
