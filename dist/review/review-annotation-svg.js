(function (root, factory) {
  const scene = typeof module === "object" && module.exports
    ? require("./review-annotation-scene")
    : root.T9ReviewAnnotationScene;
  const api = factory(scene);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ReviewAnnotationSvg = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (scene) {
  const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

  function identify(element, primitive, selectedId) {
    element.dataset.annotationId = primitive.annotationId;
    element.setAttribute("data-selected", String(
      primitive.annotationId === selectedId
    ));
  }

  function render(
    svg,
    items,
    width,
    height,
    documentRef = document,
    options = {}
  ) {
    svg.replaceChildren();
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

    for (const primitive of scene.create(items, width, height)) {
      if (primitive.type === "rectangle") {
        const rectangle = documentRef.createElementNS(SVG_NAMESPACE, "rect");
        identify(rectangle, primitive, options.selectedId);
        rectangle.setAttribute("x", String(primitive.x));
        rectangle.setAttribute("y", String(primitive.y));
        rectangle.setAttribute("width", String(primitive.width));
        rectangle.setAttribute("height", String(primitive.height));
        rectangle.setAttribute("fill", "transparent");
        rectangle.setAttribute("stroke", primitive.stroke);
        rectangle.setAttribute("stroke-width", String(primitive.strokeWidth));
        rectangle.setAttribute("opacity", String(primitive.opacity));
        rectangle.setAttribute("vector-effect", "non-scaling-stroke");
        svg.appendChild(rectangle);
      } else if (primitive.type === "arrow") {
        const group = documentRef.createElementNS(SVG_NAMESPACE, "g");
        identify(group, primitive, options.selectedId);
        const line = documentRef.createElementNS(SVG_NAMESPACE, "line");
        identify(line, primitive, options.selectedId);
        line.setAttribute("x1", String(primitive.startX));
        line.setAttribute("y1", String(primitive.startY));
        line.setAttribute("x2", String(primitive.endX));
        line.setAttribute("y2", String(primitive.endY));
        line.setAttribute("stroke", primitive.stroke);
        line.setAttribute("stroke-width", String(primitive.strokeWidth));
        line.setAttribute("vector-effect", "non-scaling-stroke");
        const head = documentRef.createElementNS(SVG_NAMESPACE, "polygon");
        identify(head, primitive, options.selectedId);
        head.setAttribute("points", primitive.headPoints
          .map(point => point.join(","))
          .join(" "));
        head.setAttribute("fill", primitive.stroke);
        group.setAttribute("opacity", String(primitive.opacity));
        group.appendChild(line);
        group.appendChild(head);
        svg.appendChild(group);
      }
    }
    return svg;
  }

  return { render };
});
