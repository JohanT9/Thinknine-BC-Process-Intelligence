(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ReviewProgressStore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  // The library shows how far each review has come. Reading every review for that took seconds
  // once reviews were large, so each review's progress is stored beside it under its own key,
  // written together with the review. Reviews saved before that are read once to fill it in.
  const VERSION = 1;

  function progress(sessionId, review, isVisible) {
    const tasks = Array.isArray(review?.tasks) ? review.tasks : [];
    const visible = tasks.filter(task => isVisible(task, review));
    return { version: VERSION, sessionId, total: visible.length,
      approved: visible.filter(task => task.approved).length,
      completed: review?.status === "completed", hasTasks: tasks.length > 0 };
  }

  function valid(entry) {
    return entry?.version === VERSION && Number.isInteger(entry.total) &&
      Number.isInteger(entry.approved) && typeof entry.hasTasks === "boolean";
  }

  function create(options) {
    const { storage, reviewPrefix, progressPrefix, isVisible } = options;
    if (!storage?.get || !storage?.set || !reviewPrefix || !progressPrefix ||
        typeof isVisible !== "function") {
      throw new TypeError("A storage area, both key prefixes and a visibility rule are required.");
    }

    // The entries to write with a review: the review and its progress.
    function entries(sessionId, review) {
      return { [reviewPrefix + sessionId]: review,
        [progressPrefix + sessionId]: progress(sessionId, review, isVisible) };
    }

    // Whether the stored review has steps, read from its progress when that exists.
    async function hasTasks(sessionId) {
      const key = progressPrefix + sessionId;
      const stored = (await storage.get(key))[key];
      if (valid(stored)) return stored.hasTasks;
      const review = (await storage.get(reviewPrefix + sessionId))[reviewPrefix + sessionId];
      return Array.isArray(review?.tasks) && review.tasks.length > 0;
    }

    // The progress of every stored review. Without getKeys() every review is read, as before.
    async function list() {
      if (typeof storage.getKeys !== "function") {
        const all = await storage.get(null);
        return Object.entries(all || {})
          .filter(([key, value]) => key.startsWith(reviewPrefix) && value)
          .map(([key, review]) => progress(key.slice(reviewPrefix.length), review, isVisible));
      }
      const keys = await storage.getKeys();
      const sessionIds = keys.filter(key => key.startsWith(reviewPrefix))
        .map(key => key.slice(reviewPrefix.length));
      const stored = sessionIds.length
        ? await storage.get(sessionIds.map(id => progressPrefix + id)) : {};
      const missing = sessionIds.filter(id => !valid(stored[progressPrefix + id]));
      if (missing.length) {
        const reviews = await storage.get(missing.map(id => reviewPrefix + id));
        const filled = {};
        for (const id of missing) {
          const review = reviews[reviewPrefix + id];
          if (!review) continue;
          filled[progressPrefix + id] = progress(id, review, isVisible);
        }
        if (Object.keys(filled).length) await storage.set(filled);
        Object.assign(stored, filled);
      }
      return sessionIds.map(id => stored[progressPrefix + id]).filter(valid);
    }

    return { entries, hasTasks, list };
  }

  return { VERSION, create, progress };
});
