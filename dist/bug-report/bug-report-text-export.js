(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9BugReportTextExport = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const value = input => input == null ? "" : String(input);
  function metadataRows(input, prefix = "") {
    return Object.entries(input || {}).flatMap(([key, child]) => {
      const label = prefix ? `${prefix}.${key}` : key;
      return child && typeof child === "object" && !Array.isArray(child)
        ? metadataRows(child, label) : child == null || child === "" ? [] :
          [`- ${label}: ${value(child)}`];
    });
  }
  function markdown(document, options = {}) {
    const swedish = document.documentLanguage !== "en-US";
    const byId = new Map(document.sections.map(section => [section.id, section]));
    const out = [`# ${document.title}`, ""];
    const add = (title, lines) => {
      out.push(`## ${title}`, "", ...(lines.length ? lines : [swedish
        ? "_Inte angivet._" : "_Not provided._"]), "");
    };
    const summary = byId.get("summary").content;
    add(byId.get("summary").title, [value(summary.summary),
      `Status: ${value(summary.status)}`,
      ...(summary.severity ? [`${swedish ? "Allvarlighetsgrad" : "Severity"}: ${summary.severity}`] : []),
      ...(summary.category ? [`${swedish ? "Kategori" : "Category"}: ${summary.category}`] : [])]);
    add(byId.get("environment").title, metadataRows(byId.get("environment").content));
    const reproduction = byId.get("reproduction").content;
    add(byId.get("reproduction").title, reproduction.map(step =>
      `${step.number}. ${step.instruction}`));
    add(byId.get("expected-result").title,
      [byId.get("expected-result").content].filter(Boolean));
    const actual = byId.get("actual-result").content;
    add(byId.get("actual-result").title, [actual.userDescription,
      ...actual.capturedErrors.map(item => `${swedish
        ? "Registrerat BC-fel" : "Captured BC error"}: ${item.rawMessage}`)]
      .filter(Boolean));
    const rows = byId.get("technical-diagnostics").content.rows;
    add(byId.get("technical-diagnostics").title,
      rows.map(row => `- ${row.label}: \`${row.value}\``));
    const stacks = byId.get("al-call-stack").content;
    add(byId.get("al-call-stack").title, stacks.flatMap(stack => [
      `${swedish ? "Tolkningsstatus" : "Parse status"}: ${stack.parseStatus}`,
      ...stack.frames.map(frame => `${frame.frameIndex + 1}. ${frame.objectType || ""} ${frame.objectId || ""} ${frame.objectName || ""}.${frame.methodName || ""}`.trim()),
      ...(stack.rawCallStack ? ["", "```text", stack.rawCallStack, "```"] : [])
    ]));
    const objects = byId.get("affected-objects").content;
    add(byId.get("affected-objects").title, objects.objects.map(item =>
      `- ${item.objectType} ${item.objectId} — ${item.objectName}`));
    const telemetry = byId.get("telemetry")?.content;
    add(byId.get("telemetry").title, !telemetry?.configured
      ? [swedish ? "Inte konfigurerad eller inte hämtad." :
        "Not configured or not fetched."] : telemetry.contexts.flatMap(context => [
        `${swedish ? "Felbevis" : "Error evidence"}: ${context.errorEvidenceId}`,
        `Status: ${context.status}`,
        ...context.events.map(event => `- ${event.timestamp} [${event.category}] ${event.eventName || event.message} (correlation: ${(event.correlationReasons || []).join(", ")})`)]));
    add(byId.get("correlated-timeline").title,
      (byId.get("correlated-timeline")?.content || [])
      .map(item => `- ${item.timestamp} [${item.source}] ${item.label}`));
    const ai = byId.get("ai-analysis")?.content?.analysis;
    if (options.includeAiAnalysis && ai) add(byId.get("ai-analysis").title, [
      `Status: ${ai.status}`, ai.summary,
      ...ai.observations.map(item => `- Observation: ${item.text} [${(item.citations || []).join(", ")}]`),
      ...ai.hypotheses.map(item => `- ${swedish ? "Möjlig hypotes (inte verifierad)" : "Possible hypothesis (not verified)"}: ${item.text}`),
      ...ai.recommendedNextChecks.map(item => `- ${swedish ? "Nästa kontroll" : "Next check"}: ${item.text}`),
      ...ai.missingEvidence.map(item => `- ${swedish ? "Bevis som saknas" : "Missing evidence"}: ${item.text}`)]);
    add(byId.get("notes").title, byId.get("notes").content.map(note =>
      `- ${note.text || note.content || ""}`));
    return `${out.join("\n").trim()}\n`;
  }
  function plainText(document, options = {}) {
    return markdown(document, options).replace(/^#{1,6}\s+/gmu, "")
      .replace(/```text\n|```/gu, "").replace(/`([^`]*)`/gu, "$1");
  }
  return { markdown, plainText };
});
