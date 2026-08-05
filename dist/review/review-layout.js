(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ReviewLayout = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function create(allCompact = false) {
    return { allCompact, overrides: {} };
  }

  function isCompact(state, taskId) {
    return state.overrides[taskId] ?? state.allCompact;
  }

  function setAll(state, compact) {
    return create(compact);
  }

  function toggleTask(state, taskId) {
    return {
      ...state,
      overrides: {
        ...state.overrides,
        [taskId]: !isCompact(state, taskId)
      }
    };
  }

  function allAreCompact(state, taskIds) {
    return taskIds.length > 0 && taskIds.every(id => isCompact(state, id));
  }

  function toggleAll(state, taskIds) {
    return setAll(state, !allAreCompact(state, taskIds));
  }

  function apply(list, globalButton, state) {
    const cards = [...list.querySelectorAll("[data-review-task-id]")];
    for (const card of cards) {
      const compact = isCompact(state, card.dataset.reviewTaskId);
      card.classList.toggle("compact", compact);
      const button = card.querySelector('[data-action="toggle-layout"]');
      if (button) {
        button.setAttribute("aria-pressed", String(compact));
        button.textContent = compact ? "Expandera" : "Komprimera";
      }
    }
    const compact = allAreCompact(
      state,
      cards.map(card => card.dataset.reviewTaskId)
    );
    globalButton.setAttribute("aria-pressed", String(compact));
    globalButton.textContent = compact ? "Expandera alla" : "Komprimera alla";
    return state;
  }

  return {
    allAreCompact,
    apply,
    create,
    isCompact,
    setAll,
    toggleAll,
    toggleTask
  };
});
