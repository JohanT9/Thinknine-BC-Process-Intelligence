(function (root, factory) {
  const scene = typeof module === "object" && module.exports
    ? require("./review-annotation-scene")
    : root.T9ReviewAnnotationScene;
  const api = factory(scene);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ReviewAnnotationSvg = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (scene) {
  const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

  function attributes(primitive, selectedId) {
    return {
      "data-annotation-id": primitive.annotationId,
      "data-selected": String(primitive.annotationId === selectedId)
    };
  }

  function descriptors(items, width, height, options = {}) {
    return scene.create(items, width, height).map(primitive => {
      const common = attributes(primitive, options.selectedId);
      if (primitive.type === "rectangle") {
        return {
          name: "rect",
          attributes: {
            ...common,
            x: primitive.x,
            y: primitive.y,
            width: primitive.width,
            height: primitive.height,
            fill: "transparent",
            stroke: primitive.stroke,
            "stroke-width": primitive.strokeWidth,
            opacity: primitive.opacity,
            "vector-effect": "non-scaling-stroke"
          },
          children: []
        };
      }
      return {
        name: "g",
        attributes: { ...common, opacity: primitive.opacity },
        children: [
          {
            name: "line",
            attributes: {
              ...common,
              x1: primitive.startX,
              y1: primitive.startY,
              x2: primitive.endX,
              y2: primitive.endY,
              stroke: primitive.stroke,
              "stroke-width": primitive.strokeWidth,
              "vector-effect": "non-scaling-stroke"
            },
            children: []
          },
          {
            name: "polygon",
            attributes: {
              ...common,
              points: primitive.headPoints.map(point => point.join(",")).join(" "),
              fill: primitive.stroke
            },
            children: []
          }
        ]
      };
    });
  }

  function escapeAttribute(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function serialize(descriptor) {
    const attributeText = Object.entries(descriptor.attributes)
      .map(([name, value]) => ` ${name}="${escapeAttribute(value)}"`)
      .join("");
    return `<${descriptor.name}${attributeText}>` +
      descriptor.children.map(serialize).join("") +
      `</${descriptor.name}>`;
  }

  function markup(items, width, height, options = {}) {
    const children = descriptors(items, width, height, options)
      .map(serialize)
      .join("");
    return `<svg xmlns="${SVG_NAMESPACE}" viewBox="0 0 ${width} ${height}" ` +
      `width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet">` +
      `${children}</svg>`;
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

    function createElement(descriptor) {
      const element = documentRef.createElementNS(
        SVG_NAMESPACE,
        descriptor.name
      );
      for (const [name, value] of Object.entries(descriptor.attributes)) {
        element.setAttribute(name, String(value));
      }
      for (const child of descriptor.children) {
        element.appendChild(createElement(child));
      }
      return element;
    }

    for (const descriptor of descriptors(items, width, height, options)) {
      svg.appendChild(createElement(descriptor));
    }
    return svg;
  }

  return { descriptors, markup, render };
});
