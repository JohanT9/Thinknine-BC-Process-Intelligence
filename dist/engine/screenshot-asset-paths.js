(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ScreenshotAssetPaths = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function pathForKey(value) {
    const key = String(value ?? "").trim();
    if (/^\d+$/u.test(key)) {
      return `screenshots/${key.padStart(6, "0")}.png`;
    }
    if (/^repair-[a-z0-9_-]+-\d+$/iu.test(key)) {
      return `screenshots/${key}.png`;
    }
    return "";
  }

  function eventNumber(value) {
    const key = String(value ?? "").trim();
    return /^\d+$/u.test(key) ? key : "";
  }

  function keyForPath(value) {
    const path = String(value ?? "");
    const match = /^screenshots\/(\d+|repair-[a-z0-9_-]+-\d+)\.png$/iu.exec(path);
    if (!match) return "";
    return /^\d+$/u.test(match[1]) ? String(Number(match[1])) : match[1];
  }

  function entries(values = {}) {
    if (!values || typeof values !== "object" || Array.isArray(values)) return [];
    return Object.entries(values).flatMap(([key, value]) => {
      const path = pathForKey(key);
      return path && value ? [{ key, path, value }] : [];
    });
  }

  function forTasks(tasks = [], availablePaths = []) {
    const available = new Set(Array.isArray(availablePaths)
      ? availablePaths : []);
    const selected = new Set();
    for (const task of Array.isArray(tasks) ? tasks : []) {
      for (const value of [task?.selectedScreenshotAssetId, task?.screenshot,
        ...(Array.isArray(task?.sourceScreenshotAssetIds)
          ? task.sourceScreenshotAssetIds : []),
        ...(Array.isArray(task?.screenshots) ? task.screenshots : [])]) {
        const path = String(value || "");
        if (available.has(path)) selected.add(path);
      }
    }
    return [...selected];
  }

  function eventPathsFromKeys(keys = []) {
    const result = {};
    for (const key of Array.isArray(keys) ? keys : []) {
      const eventNo = eventNumber(key);
      const path = pathForKey(key);
      if (eventNo && path) result[eventNo] = path;
    }
    return result;
  }

  function assetPathIndex(recording) {
    const byId = new Map((Array.isArray(recording?.assets) ? recording.assets : [])
      .filter(asset => asset?.id && keyForPath(asset.path))
      .map(asset => [String(asset.id), asset.path]));
    for (const event of Array.isArray(recording?.events) ? recording.events : []) {
      if (!event?.screenshotAssetId || byId.has(String(event.screenshotAssetId))) continue;
      const path = pathForKey(event.raw?.eventNo || event.sequence);
      if (path) byId.set(String(event.screenshotAssetId), path);
    }
    return byId;
  }

  function pathsForAssetIds(recording, assetIds = []) {
    const byId = assetPathIndex(recording);
    return [...new Set((Array.isArray(assetIds) ? assetIds : [])
      .map(value => byId.get(String(value))).filter(Boolean))];
  }

  return Object.freeze({ assetPathIndex, entries, eventNumber, eventPathsFromKeys, forTasks,
    keyForPath, pathForKey, pathsForAssetIds });
});
