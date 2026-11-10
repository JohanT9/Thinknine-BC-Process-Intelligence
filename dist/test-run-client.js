(function (root, factory) {
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9TestRunClient = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (root) {
  "use strict";
  // One open test run on a page: the full test page and the panel beside Business Central
  // both use it. Changes are shown at once, saved shortly after as changes to single fields,
  // and a change made in the other page arrives through storage without undoing what is
  // still waiting to be saved here.
  const SAVE_DELAY_MS = 600;

  function emptyChanges() { return { run: {}, steps: new Map() }; }
  function hasChanges(changes) { return Object.keys(changes.run).length > 0 || changes.steps.size > 0; }
  function merge(target, changes = {}) {
    Object.assign(target.run, changes.run || {});
    for (const { stepId, patch } of changes.steps || []) {
      target.steps.set(stepId, { ...(target.steps.get(stepId) || {}), ...patch });
    }
    return target;
  }
  function plain(changes) {
    return { ...(Object.keys(changes.run).length ? { run: { ...changes.run } } : {}),
      steps: [...changes.steps].map(([stepId, patch]) => ({ stepId, patch: { ...patch } })) };
  }

  function create({ testRunId, send, storageKey, onRun = () => {}, onSaveState = () => {},
    script = root.T9TestScript, storage = root.chrome?.storage } = {}) {
    let stored = null;
    let run = null;
    let pending = emptyChanges();
    let inflight = null;
    let state = "saved";
    let timer = null;
    let saving = null;
    const images = new Map();

    const shown = () => {
      let value = stored;
      if (inflight) value = script.applyChanges(value, plain(inflight));
      if (hasChanges(pending)) value = script.applyChanges(value, plain(pending));
      return value;
    };
    const setState = value => { state = value; onSaveState(state); };

    async function load() {
      stored = script.normalize((await send({ type: "T9_LOAD_TEST_RUN", testRunId })).run);
      run = stored;
      storage?.onChanged?.addListener((changes, area) => {
        if (area !== "local" || !changes[storageKey]?.newValue) return;
        try { stored = script.normalize(changes[storageKey].newValue); } catch { return; }
        run = shown();
        onRun(run, { external: true });
      });
      return run;
    }

    async function save() {
      clearTimeout(timer);
      if (saving) { await saving; if (!hasChanges(pending)) return; }
      if (!hasChanges(pending)) { if (state !== "failed") setState("saved"); return; }
      inflight = pending; pending = emptyChanges();
      setState("saving");
      saving = send({ type: "T9_UPDATE_TEST_RUN", testRunId, changes: plain(inflight) })
        .then(response => {
          stored = script.normalize(response.run);
          inflight = null;
          run = shown();
          setState(hasChanges(pending) ? "unsaved" : "saved");
        }, () => {
          pending = merge(merge(emptyChanges(), plain(inflight)), plain(pending));
          inflight = null;
          setState("failed");
        }).finally(() => { saving = null; });
      await saving;
      if (state === "unsaved") await save();
    }

    // Applies a change at once and saves it shortly after.
    function change(changes) {
      merge(pending, changes);
      run = shown();
      setState("unsaved");
      clearTimeout(timer);
      timer = setTimeout(() => { void save(); }, SAVE_DELAY_MS);
      return run;
    }

    async function flush() {
      clearTimeout(timer);
      if (hasChanges(pending) || saving) await save();
      if (state === "failed") throw new Error("test.saveFailed");
    }

    // A run the background returned after an action of its own, such as a screenshot.
    function accept(value) {
      stored = script.normalize(value);
      run = shown();
      return run;
    }

    // The screenshot images of the run, read once and kept for the page's lifetime.
    async function screenshots(ids) {
      const missing = ids.filter(id => !images.has(id));
      if (missing.length) {
        const response = await send({ type: "T9_LOAD_TEST_SCREENSHOTS", testRunId,
          screenshotIds: missing });
        for (const [id, image] of Object.entries(response.screenshots || {})) images.set(id, image);
      }
      return Object.fromEntries(ids.filter(id => images.has(id)).map(id => [id, images.get(id)]));
    }

    return { load, change, save, flush, accept, screenshots,
      run: () => run, state: () => state };
  }

  return { create, SAVE_DELAY_MS };
});
