(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ReviewTaskVisibility = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const text = value => typeof value === "string" ? value.trim() : "";

  function screenshots(task) {
    if (Array.isArray(task?.screenshots) && task.screenshots.length) {
      return task.screenshots.filter(Boolean);
    }
    return task?.screenshot ? [task.screenshot] : [];
  }

  function isGeneratedPlaceholder(task, review) {
    const instruction = text(task?.instruction) || text(task?.description);
    const placeholder = !instruction ||
      ["Utför uppgiften.", "Perform the task."].includes(instruction);
    if (task?.taskType !== "Unclassified" || !placeholder) return false;

    if (task.approved || text(task.userComment) || task.stepOverride ||
        task.manualStepId || task.provenance === "manual" ||
        task.fieldProvenance?.instruction === "user-edited" ||
        text(task.callout?.text) || screenshots(task).length) return false;

    const ownerIds = [task.stepId, task.taskId].filter(Boolean).map(String);
    return !(review?.stepNotes || []).some(note =>
      note?.ownerType === "step" && note.visibility !== "hidden" &&
      ownerIds.includes(String(note.ownerId)) && text(note.content)
    );
  }

  const isVisible = (task, review) =>
    !task?.deleted && !isGeneratedPlaceholder(task, review);

  return { isGeneratedPlaceholder, isVisible };
});
