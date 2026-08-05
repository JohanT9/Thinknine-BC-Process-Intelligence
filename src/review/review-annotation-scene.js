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
      stroke: style.stroke,
      strokeWidth: style.strokeWidth * Math.min(width, height),
      opacity: style.opacity
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
    const headLength = Math.min(style.arrowheadLength * scale, distance * 0.6);
    const halfWidth = Math.min(
      style.arrowheadWidth * scale / 2,
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
      stroke: style.stroke,
      strokeWidth: style.strokeWidth * scale,
      opacity: style.opacity
    };
  }

  function create(items, width, height) {
    const sceneWidth = positiveDimension(width, "width");
    const sceneHeight = positiveDimension(height, "height");
    return (items || []).flatMap(annotation => {
      const result = annotations.validation(annotation);
      if (!result.valid || !result.supported) return [];
      if (annotation.type === annotations.TYPES.RECTANGLE) {
        return [rectanglePrimitive(annotation, sceneWidth, sceneHeight)];
      }
      if (annotation.type === annotations.TYPES.ARROW) {
        return [arrowPrimitive(annotation, sceneWidth, sceneHeight)];
      }
      return [];
    });
  }

  return { create };
});
