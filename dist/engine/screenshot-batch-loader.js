(function (root, factory) {
  const paths = typeof module === "object" && module.exports
    ? require("./screenshot-asset-paths") : root.T9ScreenshotAssetPaths;
  const api = factory(paths);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ScreenshotBatchLoader = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (paths) {
  "use strict";

  async function load({ sessionId, screenshotPaths, send, batchSize = 10,
    onAsset = () => {}, onProgress = () => {}, continueOnError = false } = {}) {
    if (!sessionId || typeof send !== "function" || typeof onAsset !== "function") {
      throw new TypeError("A recording ID, request function and asset handler are required.");
    }
    const requestedPaths = [...new Set((Array.isArray(screenshotPaths)
      ? screenshotPaths : []).filter(value => typeof value === "string" &&
        paths.keyForPath(value)))];
    const size = Math.max(1, Math.min(1000, Math.floor(Number(batchSize) || 10)));
    const missingPaths = [];
    let loadedCount = 0;
    for (let offset = 0; offset < requestedPaths.length; offset += size) {
      const batch = requestedPaths.slice(offset, offset + size);
      let response;
      try {
        response = await send({ type: "T9_GET_SCREENSHOT_ASSETS", sessionId,
          paths: batch });
        if (!response?.ok) throw new Error(response?.error ||
          "Skärmbilderna kunde inte läsas in.");
      } catch (error) {
        if (!continueOnError) throw error;
        missingPaths.push(...batch);
        onProgress({ completedPaths: offset + batch.length, totalPaths: requestedPaths.length,
          loadedCount, missingCount: missingPaths.length });
        continue;
      }
      const assets = response.screenshots || {};
      const explicitMissing = new Set(Array.isArray(response.missingPaths)
        ? response.missingPaths : []);
      for (const path of batch) {
        const value = assets[path];
        if (!explicitMissing.has(path) && typeof value === "string" &&
            value.startsWith("data:image/png;base64,")) {
          await onAsset({ path, value });
          loadedCount += 1;
        } else missingPaths.push(path);
      }
      onProgress({ completedPaths: offset + batch.length,
        totalPaths: requestedPaths.length, loadedCount,
        missingCount: missingPaths.length });
    }
    return { loadedCount, missingPaths };
  }

  return Object.freeze({ load });
});
