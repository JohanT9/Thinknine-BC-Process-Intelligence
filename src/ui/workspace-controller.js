(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9WorkspaceController = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const WORKSPACES = Object.freeze(["review", "document"]);

  function create(active = "review") {
    return Object.freeze({
      active: WORKSPACES.includes(active) ? active : "review",
      revision: 0,
      renderedRevision: -1
    });
  }

  function switchTo(state, workspace) {
    if (!WORKSPACES.includes(workspace) || workspace === state.active) {
      return state;
    }
    return Object.freeze({ ...state, active: workspace });
  }

  function invalidate(state) {
    return Object.freeze({ ...state, revision: state.revision + 1 });
  }

  function complete(state, revision) {
    return revision === state.revision
      ? Object.freeze({ ...state, renderedRevision: revision })
      : state;
  }

  function needsRender(state) {
    return state.renderedRevision !== state.revision;
  }

  function workspaceFromKey(current, key) {
    if (["ArrowLeft", "Home"].includes(key)) return "review";
    if (["ArrowRight", "End"].includes(key)) return "document";
    return current;
  }

  function createRevisionCache() {
    let previousKeys = null;
    let previousValue;
    return Object.freeze({
      get(keys, createValue) {
        const nextKeys = Array.isArray(keys) ? [...keys] : [keys];
        if (previousKeys?.length === nextKeys.length &&
            previousKeys.every((key, index) => Object.is(key, nextKeys[index]))) {
          return previousValue;
        }
        previousValue = createValue();
        previousKeys = nextKeys;
        return previousValue;
      },
      clear() {
        previousKeys = null;
        previousValue = undefined;
      }
    });
  }

  return {
    WORKSPACES,
    complete,
    create,
    createRevisionCache,
    invalidate,
    needsRender,
    switchTo,
    workspaceFromKey
  };
});
