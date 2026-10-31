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
      image.onload = () => {
        image.onload = null;
        image.onerror = null;
        resolve(image);
      };
      image.onerror = () => {
        image.onload = null;
        image.onerror = null;
        reject(new Error("The export image could not be loaded."));
      };
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

  // A Business Central screenshot is the whole wide window; at document width its text is too
  // small to read. The focus is a part around the step's marks, about two fifths of the width at
  // 16:9, so the text shows about two and a half times larger. Without marks, or when the marks
  // need nearly the whole picture, the whole screenshot is used.
  const FOCUS_WIDTH = 0.4;
  const FOCUS_ASPECT = 9 / 16;
  const FOCUS_MAX = 0.85;
  function focusRegion(items, width, height) {
    const boxes = (items || []).filter(item => item?.visibility !== "hidden" &&
      ["x", "y", "width", "height"].every(key => Number.isFinite(item?.geometry?.[key])))
      .map(item => item.geometry);
    if (!boxes.length) return null;
    const left = Math.min(...boxes.map(box => box.x)) * width;
    const top = Math.min(...boxes.map(box => box.y)) * height;
    const right = Math.max(...boxes.map(box => box.x + box.width)) * width;
    const bottom = Math.max(...boxes.map(box => box.y + box.height)) * height;
    const margin = Math.max(width * 0.06, 24);
    let regionWidth = Math.max(width * FOCUS_WIDTH, right - left + 2 * margin,
      (bottom - top + 2 * margin) / FOCUS_ASPECT);
    let regionHeight = Math.max(regionWidth * FOCUS_ASPECT, bottom - top + 2 * margin);
    if (regionWidth >= width * FOCUS_MAX || regionHeight >= height * FOCUS_MAX * 1.15) return null;
    regionWidth = Math.min(regionWidth, width); regionHeight = Math.min(regionHeight, height);
    const clamp = (value, size, limit) => Math.max(0, Math.min(value, limit - size));
    return { x: Math.round(clamp((left + right - regionWidth) / 2, regionWidth, width)),
      y: Math.round(clamp((top + bottom - regionHeight) / 2, regionHeight, height)),
      width: Math.round(regionWidth), height: Math.round(regionHeight) };
  }

  async function composeScreenshot(source, items, options = {}) {
    const createCanvas = options.createCanvas || (() =>
      root.document.createElement("canvas"));
    const baseImage = await loadImage(source, options);
    const width = baseImage.naturalWidth || baseImage.width;
    const height = baseImage.naturalHeight || baseImage.height;
    if (!Number.isFinite(width) || width <= 0 ||
        !Number.isFinite(height) || height <= 0) {
      throw new Error("The export image has invalid dimensions.");
    }
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
      const region = options.focus ? focusRegion(items, width, height) : null;
      let output = canvas;
      if (region) {
        output = createCanvas(region.width, region.height);
        output.width = region.width;
        output.height = region.height;
        output.getContext("2d").drawImage(canvas, region.x, region.y, region.width,
          region.height, 0, 0, region.width, region.height);
      }
      const blob = await canvasBlob(output);
      if (output !== canvas) { output.width = 0; output.height = 0; }
      return {
        bytes: new Uint8Array(await blob.arrayBuffer()),
        mimeType: "image/png",
        width: region ? region.width : width,
        height: region ? region.height : height,
        ...(region ? { focus: { ...region, sourceWidth: width, sourceHeight: height } } : {})
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

  return { composeReview, composeScreenshot, focusRegion, pathsForTasks };
});
