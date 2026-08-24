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
    const byId = new Map(document.sections.map(section => [section.id, section]));
    const out = [`# ${document.title}`, ""];
    const add = (title, lines) => {
      out.push(`## ${title}`, "", ...(lines.length ? lines : ["_Not provided._"]), "");
    };
    const summary = byId.get("summary").content;
    add("Summary", [value(summary.summary), `Status: ${value(summary.status)}`,
      ...(summary.severity ? [`Severity: ${summary.severity}`] : []),
      ...(summary.category ? [`Category: ${summary.category}`] : [])]);
    add("Environment", metadataRows(byId.get("environment").content));
    const reproduction = byId.get("reproduction").content;
    add("Steps to Reproduce", reproduction.map(step =>
      `${step.number}. ${step.instruction}`));
    add("Expected Result", [byId.get("expected-result").content].filter(Boolean));
    const actual = byId.get("actual-result").content;
    add("Actual Result", [actual.userDescription,
      ...actual.capturedErrors.map(item => `Captured BC error: ${item.rawMessage}`)]
      .filter(Boolean));
    const rows = byId.get("technical-diagnostics").content.rows;
    add("Technical Diagnostics", rows.map(row => `- ${row.label}: \`${row.value}\``));
    const stacks = byId.get("al-call-stack").content;
    add("AL Call Stack", stacks.flatMap(stack => [
      `Parse status: ${stack.parseStatus}`,
      ...stack.frames.map(frame => `${frame.frameIndex + 1}. ${frame.objectType || ""} ${frame.objectId || ""} ${frame.objectName || ""}.${frame.methodName || ""}`.trim()),
      ...(stack.rawCallStack ? ["", "```text", stack.rawCallStack, "```"] : [])
    ]));
    const objects = byId.get("affected-objects").content;
    add("Referenced AL Objects", objects.objects.map(item =>
      `- ${item.objectType} ${item.objectId} — ${item.objectName}`));
    const telemetry = byId.get("telemetry")?.content;
    add("Application Insights Telemetry", !telemetry?.configured
      ? ["Not configured or not fetched."] : telemetry.contexts.flatMap(context => [
        `Error evidence: ${context.errorEvidenceId}`, `Status: ${context.status}`,
        ...context.events.map(event => `- ${event.timestamp} [${event.category}] ${event.eventName || event.message} (correlation: ${(event.correlationReasons || []).join(", ")})`)]));
    add("Correlated Timeline", (byId.get("correlated-timeline")?.content || [])
      .map(item => `- ${item.timestamp} [${item.source}] ${item.label}`));
    const ai = byId.get("ai-analysis")?.content?.analysis;
    if (options.includeAiAnalysis && ai) add("AI-assisted Technical Analysis", [
      `Status: ${ai.status}`, ai.summary,
      ...ai.observations.map(item => `- Observation: ${item.text} [${(item.citations || []).join(", ")}]`),
      ...ai.hypotheses.map(item => `- Possible hypothesis (not verified): ${item.text}`),
      ...ai.recommendedNextChecks.map(item => `- Next check: ${item.text}`),
      ...ai.missingEvidence.map(item => `- Missing evidence: ${item.text}`)]);
    add("Notes", byId.get("notes").content.map(note =>
      `- ${note.text || note.content || ""}`));
    return `${out.join("\n").trim()}\n`;
  }
  function plainText(document, options = {}) {
    return markdown(document, options).replace(/^#{1,6}\s+/gmu, "")
      .replace(/```text\n|```/gu, "").replace(/`([^`]*)`/gu, "$1");
  }
  return { markdown, plainText };
});
