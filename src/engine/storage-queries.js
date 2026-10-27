(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9StorageQueries = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  async function getByPrefixes(storage, prefixes = [], includeKeys = []) {
    if (!storage || typeof storage.get !== "function") {
      throw new TypeError("A Chrome storage area is required.");
    }
    const keySet = new Set(includeKeys.filter(key => typeof key === "string"));
    if (typeof storage.getKeys === "function") {
      const keys = await storage.getKeys();
      for (const key of keys) {
        if (prefixes.some(prefix => key.startsWith(prefix))) keySet.add(key);
      }
      return storage.get([...keySet]);
    }
    // Older Chromium versions lack getKeys(). Preserve their behavior while
    // using the narrower two-stage read everywhere the API is available.
    const all = await storage.get(null);
    const result = {};
    for (const [key, value] of Object.entries(all || {})) {
      if (keySet.has(key) || prefixes.some(prefix => key.startsWith(prefix))) {
        result[key] = value;
      }
    }
    return result;
  }

  return { getByPrefixes };
});
