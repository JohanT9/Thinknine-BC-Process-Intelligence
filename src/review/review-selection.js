(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ReviewSelection = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function create() {
    return { selectedIds: [], activeId: null, anchorId: null };
  }

  function inDocumentOrder(ids, orderedIds) {
    const included = new Set(ids.filter(Boolean));
    return orderedIds.filter(id => included.has(id));
  }

  function reconcile(state, orderedIds) {
    const available = new Set(orderedIds);
    const selectedIds = state.selectedIds.filter(id => available.has(id));
    return {
      selectedIds,
      activeId: available.has(state.activeId) ? state.activeId : null,
      anchorId: available.has(state.anchorId) ? state.anchorId : null
    };
  }

  function range(orderedIds, fromId, toId) {
    const from = orderedIds.indexOf(fromId);
    const to = orderedIds.indexOf(toId);
    if (from < 0 || to < 0) return toId ? [toId] : [];
    return orderedIds.slice(Math.min(from, to), Math.max(from, to) + 1);
  }

  function select(state, id, orderedIds, options = {}) {
    if (!orderedIds.includes(id)) return reconcile(state, orderedIds);
    if (options.range && (state.anchorId || state.activeId)) {
      const selectedRange = range(
        orderedIds,
        state.anchorId || state.activeId,
        id
      );
      return {
        selectedIds: options.additive
          ? inDocumentOrder([...state.selectedIds, ...selectedRange], orderedIds)
          : selectedRange,
        activeId: id,
        anchorId: state.anchorId || state.activeId
      };
    }
    if (options.additive) {
      const selectedIds = state.selectedIds.includes(id)
        ? state.selectedIds.filter(selectedId => selectedId !== id)
        : inDocumentOrder([...state.selectedIds, id], orderedIds);
      return { selectedIds, activeId: id, anchorId: id };
    }
    return { selectedIds: [id], activeId: id, anchorId: id };
  }

  function move(state, orderedIds, target, extend = false) {
    if (!orderedIds.length) return create();
    const current = orderedIds.indexOf(state.activeId);
    let index;
    if (target === "first") index = 0;
    else if (target === "last") index = orderedIds.length - 1;
    else if (target === "previous") index = Math.max(0, current < 0 ? 0 : current - 1);
    else index = Math.min(orderedIds.length - 1, current < 0 ? 0 : current + 1);
    return select(state, orderedIds[index], orderedIds, { range: extend });
  }

  function reduce(state, action, orderedIds) {
    const current = reconcile(state || create(), orderedIds);
    switch (action.type) {
      case "select":
        return select(current, action.id, orderedIds, action);
      case "move":
        return move(current, orderedIds, action.target, action.extend);
      case "select-all":
        return {
          selectedIds: [...orderedIds],
          activeId: current.activeId || orderedIds[0] || null,
          anchorId: current.anchorId || orderedIds[0] || null
        };
      case "clear":
        return create();
      default:
        return current;
    }
  }

  function commandFromKey(event) {
    if (event.altKey && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
      return {
        type: "reorder",
        delta: event.key === "ArrowUp" ? -1 : 1
      };
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "a") {
      return { type: "select-all" };
    }
    const targets = {
      ArrowUp: "previous",
      ArrowLeft: "previous",
      ArrowDown: "next",
      ArrowRight: "next",
      Home: "first",
      End: "last"
    };
    if (targets[event.key]) {
      return { type: "move", target: targets[event.key], extend: event.shiftKey };
    }
    if (event.key === " " || event.key === "Enter") {
      return { type: "select", additive: event.ctrlKey || event.metaKey };
    }
    return null;
  }

  function bind(container, options) {
    function cardFrom(target) {
      return target?.closest?.("[data-review-task-id]") || null;
    }

    function handleClick(event) {
      const card = cardFrom(event.target);
      if (!card) return;
      const interactive = event.target.closest?.(
        "button, input, textarea, select, a"
      );
      options.dispatch({
        type: "select",
        id: card.dataset.reviewTaskId,
        additive: event.ctrlKey || event.metaKey,
        range: event.shiftKey
      }, !interactive);
    }

    function handleKeydown(event) {
      const card = cardFrom(event.target);
      if (!card) return;
      const command = commandFromKey(event);
      const dragHandle = event.target.closest?.("[data-drag-handle]");
      if (
        !command ||
        (event.target !== card && !(dragHandle && command.type === "reorder"))
      ) return;
      event.preventDefault();
      if (command.type === "reorder") {
        options.move(command.delta, card.dataset.reviewTaskId);
      } else {
        options.dispatch({ ...command, id: card.dataset.reviewTaskId }, true);
      }
    }

    container.addEventListener("click", handleClick);
    container.addEventListener("keydown", handleKeydown);
    return () => {
      container.removeEventListener("click", handleClick);
      container.removeEventListener("keydown", handleKeydown);
    };
  }

  return { bind, commandFromKey, create, range, reconcile, reduce };
});
