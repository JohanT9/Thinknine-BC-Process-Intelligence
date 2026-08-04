(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9Engine = root.T9Engine || {};
  root.T9Engine.documentation = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function markdown(session, tasks, confidence) {
    const steps = (tasks || []).map((task, index) => {
      const image = task.screenshot
        ? `\n\n   ![${String(task.instruction || "").replace(/\*\*/g, "")}](${task.screenshot})`
        : "";
      return `${index + 1}. ${task.instruction}${image}`;
    }).join("\n\n");

    return `# ${session?.name || "Business Central-process"}

## Syfte

${session?.purpose || "Syfte har inte angetts."}

## Arbetsgång

${steps || "Inga dokumenterbara arbetssteg identifierades."}

## Förväntat resultat

Processen är genomförd enligt arbetsgången.

## Kvalitet

Session confidence: **${confidence?.sessionConfidence || 0} %**

---
Genererad av Thinknine BC Process Intelligence 3.5.0.
`;
  }

  return { markdown };
});
