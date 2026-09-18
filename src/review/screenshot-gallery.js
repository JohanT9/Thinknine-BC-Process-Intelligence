(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.T9ScreenshotGallery = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function derive(assets, task = {}, capturedId = null) {
    const related = new Set(task.sourceScreenshotAssetIds || []);
    const current = task.selectedScreenshotAssetId || task.screenshot;
    return Object.entries(assets || {}).map(([id, imageUrl], index) => {
      const role = id === current ? "current" : id === capturedId ? "captured"
        : related.has(id) ? "related" : "other";
      return { id, imageUrl, number: index + 1, role };
    }).sort((a, b) => ["current", "captured", "related", "other"].indexOf(a.role)
      - ["current", "captured", "related", "other"].indexOf(b.role)
      || a.number - b.number);
  }
  return { derive };
});
