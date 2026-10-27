(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9Engine = root.T9Engine || {};
  root.T9Engine.documentation = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function markdown(session, tasks, confidence) {
    const steps = (tasks || []).map((task, index) => {
      const image = task.screenshot
        ? `\n\n   ![${String(task.instruction || "").replace(/\*\*/g, "")}](${task.screenshot})` +
          (task.screenshotEvidence?.relation === "subsequent-captured-page-state" &&
            task.screenshotEvidence.caption
            ? `\n\n   *${task.screenshotEvidence.caption}*` : "")
        : "";
      return `${index + 1}. ${task.instruction}${image}`;
    }).join("\n\n");

    return `# ${session?.name || "Business Central-process"}

## Syfte

${session?.purpose || "Syfte har inte angetts."}

## Arbetsgång

${steps || "Inga dokumenterbara arbetssteg identifierades."}

## Förväntat resultat

Stegen beskriver det observerade arbetsflödet. Kontrollera dokumentets status och bekräfta om processen kräver bokföring i Business Central.

## Kvalitet

Session confidence: **${confidence?.sessionConfidence || 0} %**

---
Genererad av BC Process Studio.
`;
  }

  return { markdown };
});
