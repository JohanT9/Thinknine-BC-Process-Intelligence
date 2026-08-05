(function (root, factory) {
  const annotations = typeof module === "object" && module.exports
    ? require("./review-annotations")
    : root.T9ReviewAnnotations;
  const svg = typeof module === "object" && module.exports
    ? require("./review-annotation-svg")
    : root.T9ReviewAnnotationSvg;
  const api = factory(root, annotations, svg);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ReviewAnnotationCompositor = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (
  root,
  annotations,
  svg
) {
  function loadImage(source, options = {}) {
    const ImageConstructor = options.ImageConstructor || root.Image;
    if (!ImageConstructor) {
      return Promise.reject(new Error("Image rendering is unavailable."));
    }
    return new Promise((resolve, reject) => {
      const image = new ImageConstructor();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("The export image could not be loaded."));
      image.src = source;
    });
  }

  function canvasBlob(canvas) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => {
        if (blob) resolve(blob);
        else reject(new Error("The annotated export image could not be created."));
      }, "image/png");
    });
  }

  async function composeScreenshot(source, items, options = {}) {
    const createCanvas = options.createCanvas || (() =>
      root.document.createElement("canvas"));
    const baseImage = await loadImage(source, options);
    const width = baseImage.naturalWidth || baseImage.width;
    const height = baseImage.naturalHeight || baseImage.height;
    const canvas = createCanvas(width, height);
    canvas.width = width;
    canvas.height = height;
    let overlayImage = null;
    try {
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas rendering is unavailable.");
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(baseImage, 0, 0, width, height);
      const overlayMarkup = svg.markup(items, width, height);
      const overlaySource = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
        overlayMarkup
      )}`;
      overlayImage = await loadImage(overlaySource, options);
      context.drawImage(overlayImage, 0, 0, width, height);
      const blob = await canvasBlob(canvas);
      return {
        bytes: new Uint8Array(await blob.arrayBuffer()),
        mimeType: "image/png",
        width,
        height
      };
    } finally {
      canvas.width = 0;
      canvas.height = 0;
      options.onRelease?.({ canvas, baseImage, overlayImage });
    }
  }

  async function composeReview(options) {
    const result = {};
    const uniquePaths = [...new Set(options.paths || [])];
    for (const path of uniquePaths) {
      const source = options.screenshotSources[path];
      if (!source) continue;
      const set = annotations.findScreenshotSet(
        options.review?.annotations,
        path
      );
      const items = Array.isArray(set?.items) ? set.items : [];
      const hasSupportedItems = svg.descriptors(items, 1, 1).length > 0;
      result[path] = hasSupportedItems
        ? await composeScreenshot(source, items, options)
        : options.convertOriginal(source);
    }
    return result;
  }

  function pathsForTasks(tasks) {
    return [...new Set((tasks || []).flatMap(task =>
      task.screenshots?.length
        ? task.screenshots
        : task.screenshot
          ? [task.screenshot]
          : []
    ))];
  }

  return { composeReview, composeScreenshot, pathsForTasks };
});
