(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ProcessMapDrag = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  function bind(container, options = {}) {
    let draggedId = null;
    const card = target => target?.closest?.("[data-process-node-id]") || null;
    const clear = () => [...container.querySelectorAll(
      ".process-map-drop-before,.process-map-drop-after,.process-map-dragging"
    )].forEach(item => item.classList.remove("process-map-drop-before",
      "process-map-drop-after", "process-map-dragging"));
    const start = event => {
      const handle = event.target.closest?.("[data-process-drag-handle]");
      const source = handle ? card(handle) : null;
      if (!source || handle.getAttribute?.("draggable") !== "true") return;
      draggedId = source.dataset.processNodeId;
      source.classList.add("process-map-dragging");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", draggedId);
    };
    const over = event => {
      const target = card(event.target);
      if (!draggedId || !target || target.dataset.processNodeId === draggedId) return;
      event.preventDefault(); clear();
      const bounds = target.getBoundingClientRect();
      const horizontal = bounds.width >= bounds.height;
      const after = horizontal ? event.clientX >= bounds.left + bounds.width / 2
        : event.clientY >= bounds.top + bounds.height / 2;
      target.classList.add(after ? "process-map-drop-after" : "process-map-drop-before");
      event.dataTransfer.dropEffect = "move";
    };
    const drop = event => {
      const target = card(event.target);
      if (!draggedId || !target || target.dataset.processNodeId === draggedId) return;
      event.preventDefault();
      options.move?.({ draggedId, targetId: target.dataset.processNodeId,
        position: target.classList.contains("process-map-drop-after") ? "after" : "before" });
      clear(); draggedId = null;
    };
    const end = () => { clear(); draggedId = null; };
    container.addEventListener("dragstart", start); container.addEventListener("dragover", over);
    container.addEventListener("drop", drop); container.addEventListener("dragend", end);
    return () => { container.removeEventListener("dragstart", start);
      container.removeEventListener("dragover", over); container.removeEventListener("drop", drop);
      container.removeEventListener("dragend", end); };
  }
  return { bind };
});
