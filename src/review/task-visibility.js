(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ReviewTaskVisibility = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const text = value => typeof value === "string" ? value.trim() : "";
  const normalizeInstruction = value => text(value).normalize("NFKC")
    .toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  const GENERIC_INSTRUCTIONS = new Set([
    "utför uppgiften", "perform the task", "complete the task",
    "effectuez la tâche", "complete la tarea", "führen sie die aufgabe aus",
    "udfør opgaven", "suorita tehtävä", "utfør oppgaven",
    "välj värde", "choose a value", "select a value",
    "choisissez une valeur", "sélectionnez une valeur",
    "wählen sie einen wert", "seleccione un valor", "elija un valor",
    "vælg en værdi", "valitse arvo", "velg en verdi"
  ]);

  function isGenericInstruction(value) {
    return !text(value) || GENERIC_INSTRUCTIONS.has(normalizeInstruction(value));
  }

  function screenshots(task) {
    if (Array.isArray(task?.screenshots) && task.screenshots.length) {
      return task.screenshots.filter(Boolean);
    }
    return task?.screenshot ? [task.screenshot] : [];
  }

  function isGeneratedPlaceholder(task, review) {
    const instruction = text(task?.instruction) || text(task?.description);
    const placeholder = isGenericInstruction(instruction);
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

  return { isGenericInstruction, isGeneratedPlaceholder, isVisible };
});
