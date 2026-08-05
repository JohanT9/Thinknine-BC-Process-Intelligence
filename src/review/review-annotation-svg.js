(function (root, factory) {
  const scene = typeof module === "object" && module.exports
    ? require("./review-annotation-scene")
    : root.T9ReviewAnnotationScene;
  const api = factory(scene);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ReviewAnnotationSvg = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (scene) {
  const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

  function render(svg, items, width, height, documentRef = document) {
    svg.replaceChildren();
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

    for (const primitive of scene.create(items, width, height)) {
      if (primitive.type !== "rectangle") continue;
      const rectangle = documentRef.createElementNS(SVG_NAMESPACE, "rect");
      rectangle.dataset.annotationId = primitive.annotationId;
      rectangle.setAttribute("x", String(primitive.x));
      rectangle.setAttribute("y", String(primitive.y));
      rectangle.setAttribute("width", String(primitive.width));
      rectangle.setAttribute("height", String(primitive.height));
      rectangle.setAttribute("fill", "none");
      rectangle.setAttribute("stroke", primitive.stroke);
      rectangle.setAttribute("stroke-width", String(primitive.strokeWidth));
      rectangle.setAttribute("opacity", String(primitive.opacity));
      rectangle.setAttribute("vector-effect", "non-scaling-stroke");
      svg.appendChild(rectangle);
    }
    return svg;
  }

  return { render };
});
