(function (root, factory) { const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9IssuePackageMarkdown = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const value = input => input == null ? "" : String(input);
  const SWEDISH = Object.freeze({ summary: "Sammanfattning",
    reproduction: "Steg för att återskapa", expected: "Förväntat resultat",
    actual: "Faktiskt resultat", error: "Business Central-fel",
    primaryError: "Primärt fel", additionalError: "Ytterligare fel",
    directLink: "Öppna i Business Central",
    technical: "Tekniska detaljer", environment: "Miljö",
    diagnostics: "Diagnostik", callStack: "AL-anropsstack",
    telemetry: "Telemetri", ai: "AI-assisterad analys (inte auktoritativ)",
    status: "Status", relatedEvents: "relaterade händelser",
    relatedBy: "kopplad genom", observation: "Observation",
    hypothesis: "Möjlig rotorsak (inte verifierad)", notes: "Anteckningar" });
  const ENGLISH = Object.freeze({ summary: "Summary",
    reproduction: "Steps to Reproduce", expected: "Expected Result",
    actual: "Actual Result", error: "Business Central Error",
    primaryError: "Primary error", additionalError: "Additional error",
    directLink: "Open in Business Central",
    technical: "Technical Details", environment: "Environment",
    diagnostics: "Diagnostics", callStack: "AL Call Stack",
    telemetry: "Telemetry", ai: "AI-Assisted Analysis (not authoritative)",
    status: "Status", relatedEvents: "related events", relatedBy: "related by",
    observation: "Observation", hypothesis:
      "Possible root-cause hypothesis (not verified)", notes: "Notes" });
  const inline = input => value(input).replace(/\\/gu, "\\\\")
    .replace(/([*_\[\]<>])/gu, "\\$1");
  function metadata(input, prefix = "") {
    return Object.entries(input || {}).flatMap(([key, child]) => {
      if (key === "authorship" || child == null || child === "") return [];
      const label = prefix ? `${prefix}.${key}` : key;
      return child && typeof child === "object" && !Array.isArray(child)
        ? metadata(child, label) : [`- ${inline(label)}: ${inline(
          Array.isArray(child) ? child.join(", ") : child)}`];
    });
  }
  function code(valueToRender) { const raw = value(valueToRender);
    const longest = Math.max(2, ...((raw.match(/`+/gu) || []).map(item => item.length)));
    const fence = "`".repeat(longest + 1); return `${fence}text\n${raw}\n${fence}`; }
  function frame(item) { return `${Number(item.frameIndex || 0) + 1}. ${[
    item.objectType, item.objectId, item.objectName].filter(Boolean).join(" ")}${
    item.methodName ? ` — ${item.methodName}` : ""}${item.extensionName ?
    ` (${item.extensionName})` : ""}${item.sourceLine ? `, line ${item.sourceLine}` : ""}`; }
  function markdown(pkg) { const labels = pkg.documentLanguage === "sv-SE"
    ? SWEDISH : ENGLISH; const out = [`# ${inline(pkg.title)}`, ""];
    const add = (title, lines) => { const filtered = lines.filter(item => item !== "" &&
      item != null); if (filtered.length) out.push(`## ${title}`, "", ...filtered, ""); };
    const errors = [pkg.errorEvidence?.primary, ...(pkg.errorEvidence?.additional || [])]
      .filter(Boolean);
    const summary = value(pkg.summary?.summary).trim();
    const duplicatesCapturedError = errors.some(error =>
      value(error.rawMessage).trim() === summary);
    if (!duplicatesCapturedError) add(labels.summary, [inline(summary)]);
    add(labels.reproduction, pkg.reproduction.map((step, index) =>
      `${index + 1}. ${inline(step.instruction)}`));
    add(labels.expected, [inline(pkg.expectedResult)]);
    add(labels.actual, [inline(pkg.actualResult?.userDescription)]);
    add(labels.error, errors.flatMap((error, index) => [
      errors.length > 1 ? `### ${index === 0 ? labels.primaryError : labels.additionalError}` : null,
      code(error.rawMessage || ""), error.supportUrl
        ? `[${labels.directLink}](${error.supportUrl})` : null]));
    if (pkg.inclusion?.technicalDetails !== false) {
      const environment = metadata({ businessCentral: pkg.environment?.businessCentral,
        browser: pkg.environment?.browser });
      const diagnostics = (pkg.diagnostics?.rows || []).map(row =>
        `- ${inline(row.label)}: ${inline(row.value)}`);
      const technical = [];
      if (environment.length) technical.push(`### ${labels.environment}`, "", ...environment, "");
      if (diagnostics.length) technical.push(`### ${labels.diagnostics}`, "", ...diagnostics, "");
      add(labels.technical, technical);
    }
    if (pkg.inclusion?.callStack) {
      const callStack = pkg.callStack.flatMap(stack => [
        ...stack.frames.map(frame), ...(stack.rawCallStack
          ? [code(stack.rawCallStack)] : [])]);
      add(labels.callStack, callStack);
    }
    if (pkg.telemetry) add(labels.telemetry, pkg.telemetry.contexts.flatMap(context => [
      `- ${labels.status}: ${inline(context.status)}; ${labels.relatedEvents}: ${context.eventCount}`,
      ...(context.events || []).map(event => `  - ${inline(event.timestamp)} ${
        inline(event.eventName)} — ${labels.relatedBy} ${inline((event.correlationReasons || []).join(", "))}`)]));
    if (pkg.aiAnalysis) add(labels.ai, [
      `${labels.status}: ${inline(pkg.aiAnalysis.status)}`, inline(pkg.aiAnalysis.summary),
      ...(pkg.aiAnalysis.observations || []).map(item => `- ${labels.observation}: ${inline(item.text)} [${
        inline((item.citations || []).join(", "))}]`),
      ...(pkg.aiAnalysis.hypotheses || []).map(item =>
        `- ${labels.hypothesis}: ${inline(item.text)}`)]);
    add(labels.notes, pkg.notes.map(item => `- ${inline(item.text || item.content)}`));
    return `${out.join("\n").trim()}\n`;
  }
  function plainText(pkg) { return markdown(pkg).replace(/^#{1,6}\s+/gmu, "")
    .replace(/```+text\n|```+/gu, "").replace(/\\([*_\[\]<>\\])/gu, "$1"); }
  return { code, markdown, plainText };
});
