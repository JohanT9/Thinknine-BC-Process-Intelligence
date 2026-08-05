(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ReviewEdit = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const DEFAULT_DELAY = 750;

  function createSession(taskId, field, value) {
    return {
      taskId,
      field,
      originalValue: value ?? "",
      draftValue: value ?? ""
    };
  }

  function update(session, value) {
    return { ...session, draftValue: value };
  }

  function result(session) {
    return {
      taskId: session.taskId,
      field: session.field,
      value: session.draftValue,
      changed: session.draftValue !== session.originalValue
    };
  }

  function commandFromKey(event, editing) {
    if (editing && event.key === "Escape") return "cancel";
    if (editing && event.key === "Enter" && !event.shiftKey) return "commit";
    if (!editing && event.key === "Enter") return "start";
    return null;
  }

  function bind(container, options) {
    function context(target) {
      const card = target?.closest?.("[data-review-task-id]");
      if (!card) return null;
      const control = target.closest?.("[data-edit-field]") || null;
      return { card, control, taskId: card.dataset.reviewTaskId };
    }

    function start(details) {
      const control = details.control ||
        details.card.querySelector?.('[data-edit-field="instruction"]');
      if (!control) return;
      options.start({
        ...details,
        control,
        field: control.dataset.editField
      });
    }

    function handleDoubleClick(event) {
      const details = context(event.target);
      if (!details?.control) return;
      start(details);
    }

    function handleKeydown(event) {
      const details = context(event.target);
      if (!details) return;
      const editing = details.control?.dataset.editing === "true";
      const command = commandFromKey(event, editing);
      if (!command || (!details.control && event.target !== details.card)) return;
      event.preventDefault();
      if (command === "start") start(details);
      else if (command === "commit") options.commit(details);
      else options.cancel(details);
    }

    function handleInput(event) {
      const details = context(event.target);
      if (details?.control?.dataset.editing === "true") {
        options.update({ ...details, value: details.control.value });
      }
    }

    function handleFocusOut(event) {
      const details = context(event.target);
      if (details?.control?.dataset.editing === "true") {
        options.commit(details);
      }
    }

    container.addEventListener("dblclick", handleDoubleClick);
    container.addEventListener("keydown", handleKeydown);
    container.addEventListener("input", handleInput);
    container.addEventListener("focusout", handleFocusOut);
    return () => {
      container.removeEventListener("dblclick", handleDoubleClick);
      container.removeEventListener("keydown", handleKeydown);
      container.removeEventListener("input", handleInput);
      container.removeEventListener("focusout", handleFocusOut);
    };
  }

  function createAutoSave(save, options = {}) {
    const delay = options.delay ?? DEFAULT_DELAY;
    const setTimer = options.setTimer || setTimeout;
    const clearTimer = options.clearTimer || clearTimeout;
    let timer = null;

    async function run() {
      timer = null;
      try {
        await save();
      } catch (error) {
        options.onError?.(error);
      }
    }

    return {
      schedule() {
        if (timer !== null) clearTimer(timer);
        timer = setTimer(run, delay);
      },
      flush() {
        if (timer === null) return Promise.resolve();
        clearTimer(timer);
        return run();
      },
      cancel() {
        if (timer !== null) clearTimer(timer);
        timer = null;
      },
      pending() {
        return timer !== null;
      }
    };
  }

  return {
    DEFAULT_DELAY,
    bind,
    commandFromKey,
    createAutoSave,
    createSession,
    result,
    update
  };
});
