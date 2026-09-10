(function (root, factory) { const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9IssuePackageMarkdown = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const value = input => input == null ? "" : String(input);
  const inline = input => value(input).replace(/\\/gu, "\\\\")
    .replace(/([*_\[\]<>])/gu, "\\$1");
  function code(valueToRender) { const raw = value(valueToRender);
    const longest = Math.max(2, ...((raw.match(/`+/gu) || []).map(item => item.length)));
    const fence = "`".repeat(longest + 1); return `${fence}text\n${raw}\n${fence}`; }
  function frame(item) { return `${Number(item.frameIndex || 0) + 1}. ${[
    item.objectType, item.objectId, item.objectName].filter(Boolean).join(" ")}${
    item.methodName ? ` — ${item.methodName}` : ""}${item.extensionName ?
    ` (${item.extensionName})` : ""}${item.sourceLine ? `, line ${item.sourceLine}` : ""}`; }
  function markdown(pkg) { const out = [`# ${inline(pkg.title)}`, ""];
    const add = (title, lines) => { const filtered = lines.filter(item => item !== "" &&
      item != null); if (filtered.length) out.push(`## ${title}`, "", ...filtered, ""); };
    add("Summary", [inline(pkg.summary?.summary)]);
    add("Steps to Reproduce", pkg.reproduction.map((step, index) =>
      `${index + 1}. ${inline(step.instruction)}`));
    add("Expected Result", [inline(pkg.expectedResult)]);
    add("Actual Result", [inline(pkg.actualResult?.userDescription)]);
    const errors = [pkg.errorEvidence?.primary, ...(pkg.errorEvidence?.additional || [])]
      .filter(Boolean);
    add("Business Central Error", errors.flatMap((error, index) => [
      errors.length > 1 ? `### ${index === 0 ? "Primary error" : "Additional error"}` : null,
      code(error.rawMessage || "")]));
    if (pkg.inclusion?.technicalDetails !== false) {
      const environment = Object.entries(pkg.environment || {}).filter(([, child]) =>
        child != null && child !== "" && child !== "captured").map(([key, child]) =>
        `- ${inline(key)}: ${inline(child)}`);
      const diagnostics = (pkg.diagnostics?.rows || []).map(row =>
        `- ${inline(row.label)}: ${inline(row.value)}`);
      const callStack = pkg.callStack.flatMap(stack => [
        ...stack.frames.map(frame), ...(stack.rawCallStack
          ? [code(stack.rawCallStack)] : [])]);
      const technical = [];
      if (environment.length) technical.push("### Environment", "", ...environment, "");
      if (diagnostics.length) technical.push("### Diagnostics", "", ...diagnostics, "");
      if (callStack.length) technical.push("### AL Call Stack", "", ...callStack, "");
      add("Technical Details", technical);
    }
    if (pkg.telemetry) add("Telemetry", pkg.telemetry.contexts.flatMap(context => [
      `- Status: ${inline(context.status)}; related events: ${context.eventCount}`,
      ...(context.events || []).map(event => `  - ${inline(event.timestamp)} ${
        inline(event.eventName)} — related by ${inline((event.correlationReasons || []).join(", "))}`)]));
    if (pkg.aiAnalysis) add("AI-Assisted Analysis (not authoritative)", [
      `Status: ${inline(pkg.aiAnalysis.status)}`, inline(pkg.aiAnalysis.summary),
      ...(pkg.aiAnalysis.observations || []).map(item => `- Observation: ${inline(item.text)} [${
        inline((item.citations || []).join(", "))}]`),
      ...(pkg.aiAnalysis.hypotheses || []).map(item =>
        `- Possible root-cause hypothesis (not verified): ${inline(item.text)}`)]);
    add("Notes", pkg.notes.map(item => `- ${inline(item.text || item.content)}`));
    return `${out.join("\n").trim()}\n`;
  }
  function plainText(pkg) { return markdown(pkg).replace(/^#{1,6}\s+/gmu, "")
    .replace(/```+text\n|```+/gu, "").replace(/\\([*_\[\]<>\\])/gu, "$1"); }
  return { code, markdown, plainText };
});
