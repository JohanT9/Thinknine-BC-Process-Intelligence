(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ReviewToolbar = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const COMMANDS = Object.freeze([
    "undo", "redo", "merge", "split", "move-up", "move-down", "export"
  ]);

  function derive(context) {
    const taskIds = context.taskIds || [];
    const selected = new Set(context.selection?.selectedIds || []);
    const selectedIndexes = taskIds
      .map((id, index) => selected.has(id) ? index : -1)
      .filter(index => index >= 0);
    const count = selectedIndexes.length;
    return {
      undo: Boolean(context.canUndo),
      redo: Boolean(context.canRedo),
      merge: count >= 2,
      split: count === 1,
      "move-up": count >= 1 && selectedIndexes[0] > 0,
      "move-down": count >= 1 && selectedIndexes.at(-1) < taskIds.length - 1,
      export: Boolean(context.canExport) && taskIds.length > 0
    };
  }

  function apply(container, state) {
    for (const command of COMMANDS) {
      const button = container.querySelector(`[data-review-command="${command}"]`);
      if (button) button.disabled = !state[command];
    }
  }

  function bind(container, execute) {
    function handleClick(event) {
      const button = event.target.closest?.("[data-review-command]");
      if (!button || button.disabled || !container.contains(button)) return;
      execute(button.dataset.reviewCommand, button);
      const disclosure = button.closest?.("details");
      if (disclosure?.open) {
        disclosure.open = false;
        disclosure.querySelector("summary")?.focus();
      }
    }
    function handleKeydown(event) {
      if (event.key === "Escape") {
        const disclosure = event.target.closest?.("details[open]");
        if (disclosure) {
          event.preventDefault();
          disclosure.open = false;
          disclosure.querySelector("summary")?.focus();
        }
        return;
      }
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      const current = event.target.closest?.("[data-review-toolbar-item]");
      if (!current) return;
      const buttons = [...container.querySelectorAll(
        "summary[data-review-toolbar-item], " +
        "[data-review-toolbar-item]:not(:disabled):not(summary):not(" +
        "details:not([open]) [data-review-toolbar-item])"
      )];
      const index = buttons.indexOf(current);
      if (index < 0 || !buttons.length) return;
      let nextIndex;
      if (event.key === "Home") nextIndex = 0;
      else if (event.key === "End") nextIndex = buttons.length - 1;
      else if (event.key === "ArrowLeft") {
        nextIndex = (index - 1 + buttons.length) % buttons.length;
      } else {
        nextIndex = (index + 1) % buttons.length;
      }
      event.preventDefault();
      buttons[nextIndex].focus();
    }
    container.addEventListener("click", handleClick);
    container.addEventListener("keydown", handleKeydown);
    return () => {
      container.removeEventListener("click", handleClick);
      container.removeEventListener("keydown", handleKeydown);
    };
  }

  return { COMMANDS, apply, bind, derive };
});
