(function (root, factory) {
  const dataset = typeof module === "object" && module.exports
    ? require("./process-improvement-dataset") : root.T9ProcessImprovementDataset;
  const storageFormat = typeof module === "object" && module.exports
    ? require("../engine/review-storage-format") : root.T9ReviewStorageFormat;
  const api = factory(dataset, storageFormat);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ProcessImprovementService = api;
})(typeof globalThis !== "undefined" ? globalThis : this,
function (dataset, storageFormat) {
  "use strict";
  // A stored review as it was saved; one a newer version stored is left out.
  function readStored(review) {
    try { return storageFormat ? storageFormat.unpack(review) : review; } catch { return null; }
  }
  const VERSION = "1.0.0";

  function create(options = {}) {
    const storage = options.storage;
    const reviewPrefix = String(options.reviewPrefix || "");
    if (!storage?.get || !reviewPrefix) {
      throw new TypeError("Process improvement storage and review prefix are required.");
    }
    async function readReviews() {
      let stored;
      if (typeof storage.getKeys === "function") {
        const keys = (await storage.getKeys()).filter(key => key.startsWith(reviewPrefix));
        stored = keys.length ? await storage.get(keys) : {};
      } else {
        stored = await storage.get(null);
      }
      return Object.entries(stored || {})
        .filter(([key, value]) => key.startsWith(reviewPrefix) &&
          value && typeof value === "object")
        .map(([, value]) => readStored(value)).filter(Boolean);
    }
    return Object.freeze({
      async read() {
        const reviews = await readReviews();
        return Object.freeze({ serviceVersion: VERSION,
          reviewCount: reviews.length, dataset: dataset.create(reviews) });
      }
    });
  }

  return { VERSION, create };
});
