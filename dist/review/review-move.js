(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ReviewMove = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function itemId(item) {
    return item?.taskId || "";
  }

  function orderedMoveIds(items, ids) {
    const requested = new Set(ids || []);
    return items.map(itemId).filter(id => requested.has(id));
  }

  function moveTo(items, ids, targetId, position = "before") {
    const movedIds = orderedMoveIds(items, ids);
    if (!movedIds.length || movedIds.includes(targetId)) return [...items];
    const moved = new Set(movedIds);
    const block = items.filter(item => moved.has(itemId(item)));
    const remaining = items.filter(item => !moved.has(itemId(item)));
    const targetIndex = remaining.findIndex(item => itemId(item) === targetId);
    if (targetIndex < 0) return [...items];
    const insertionIndex = targetIndex + (position === "after" ? 1 : 0);
    return [
      ...remaining.slice(0, insertionIndex),
      ...block,
      ...remaining.slice(insertionIndex)
    ];
  }

  function moveByOffset(items, ids, delta) {
    const movedIds = orderedMoveIds(items, ids);
    if (!movedIds.length || !delta) return [...items];
    const moved = new Set(movedIds);
    const first = items.findIndex(item => moved.has(itemId(item)));
    const last = items.findLastIndex(item => moved.has(itemId(item)));
    if (delta < 0) {
      const target = items.slice(0, first).findLast(item => !moved.has(itemId(item)));
      return target ? moveTo(items, movedIds, itemId(target), "before") : [...items];
    }
    const target = items.slice(last + 1).find(item => !moved.has(itemId(item)));
    return target ? moveTo(items, movedIds, itemId(target), "after") : [...items];
  }

  function capturePositions(container) {
    return new Map(
      [...container.querySelectorAll("[data-review-task-id]")].map(element => [
        element.dataset.reviewTaskId,
        element.getBoundingClientRect()
      ])
    );
  }

  function animatePositions(container, previous, reducedMotion = false) {
    if (reducedMotion) return;
    for (const element of container.querySelectorAll("[data-review-task-id]")) {
      const before = previous.get(element.dataset.reviewTaskId);
      if (!before) continue;
      const after = element.getBoundingClientRect();
      const x = before.left - after.left;
      const y = before.top - after.top;
      if (!x && !y) continue;
      element.animate?.(
        [
          { transform: `translate(${x}px, ${y}px)` },
          { transform: "translate(0, 0)" }
        ],
        { duration: 180, easing: "ease-out" }
      );
    }
  }

  function bind(container, options) {
    let draggedId = null;

    function cardFrom(target) {
      return target?.closest?.("[data-review-task-id]") || null;
    }

    function clearIndicators() {
      for (const card of container.querySelectorAll(".drop-before, .drop-after")) {
        card.classList.remove("drop-before", "drop-after");
      }
    }

    function handleDragStart(event) {
      const handle = event.target.closest?.("[data-drag-handle]");
      const card = handle ? cardFrom(handle) : null;
      if (!card) return;
      draggedId = card.dataset.reviewTaskId;
      card.classList.add("dragging");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", draggedId);
    }

    function handleDragOver(event) {
      const card = cardFrom(event.target);
      if (!draggedId || !card || card.dataset.reviewTaskId === draggedId) return;
      event.preventDefault();
      clearIndicators();
      const bounds = card.getBoundingClientRect();
      const position = event.clientY < bounds.top + bounds.height / 2
        ? "before"
        : "after";
      card.classList.add(position === "before" ? "drop-before" : "drop-after");
      event.dataTransfer.dropEffect = "move";
    }

    function handleDrop(event) {
      const card = cardFrom(event.target);
      if (!draggedId || !card) return;
      event.preventDefault();
      const position = card.classList.contains("drop-after") ? "after" : "before";
      options.move({ draggedId, targetId: card.dataset.reviewTaskId, position });
      clearIndicators();
    }

    function handleDragEnd() {
      clearIndicators();
      for (const card of container.querySelectorAll(".dragging")) {
        card.classList.remove("dragging");
      }
      draggedId = null;
    }

    container.addEventListener("dragstart", handleDragStart);
    container.addEventListener("dragover", handleDragOver);
    container.addEventListener("drop", handleDrop);
    container.addEventListener("dragend", handleDragEnd);
    return () => {
      container.removeEventListener("dragstart", handleDragStart);
      container.removeEventListener("dragover", handleDragOver);
      container.removeEventListener("drop", handleDrop);
      container.removeEventListener("dragend", handleDragEnd);
    };
  }

  return {
    animatePositions,
    bind,
    capturePositions,
    moveByOffset,
    moveTo,
    orderedMoveIds
  };
});
