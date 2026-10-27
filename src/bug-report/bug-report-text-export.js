(function (root, factory) {
  const languages = typeof module === "object" && module.exports
    ? require("../engine/language-registry") : root.T9LanguageRegistry;
  const api = factory(languages);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9BugReportTextExport = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (languages) {
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
  // Severity is stored in English; exports show it in the document language.
  const SEVERITY_NAMES = Object.freeze({ Low: "Låg", Medium: "Medel", High: "Hög", Critical: "Kritisk" });
  function markdown(document) {
    const locale = languages.normalize(document.documentLanguage, "document");
    const localized = (english, swedish) => languages.translate(english, locale,
      locale === "sv-SE" ? swedish : english);
    const byId = new Map(document.sections.map(section => [section.id, section]));
    const out = [`# ${document.title}`, ""];
    const add = (title, lines) => {
      out.push(`## ${title}`, "", ...(lines.length ? lines : [localized(
        "_Not provided._", "_Inte angivet._")]), "");
    };
    const summary = byId.get("summary").content;
    add(byId.get("summary").title, [value(summary.summary),
      `Status: ${value(summary.status)}`,
      ...(summary.severity ? [`${localized("Severity", "Allvarlighetsgrad")}: ${
        SEVERITY_NAMES[summary.severity] ? localized(summary.severity,
          SEVERITY_NAMES[summary.severity]) : summary.severity}`] : []),
      ...(summary.category ? [`${localized("Category", "Kategori")}: ${summary.category}`] : [])]);
    add(byId.get("environment").title, metadataRows(byId.get("environment").content));
    const reproduction = byId.get("reproduction").content;
    add(byId.get("reproduction").title, reproduction.map(step =>
      `${step.number}. ${step.instruction}`));
    add(byId.get("expected-result").title,
      [byId.get("expected-result").content].filter(Boolean));
    const actual = byId.get("actual-result").content;
    add(byId.get("actual-result").title, [
      ...actual.capturedErrors.map(item => `${localized("Captured BC error",
        "Registrerat BC-fel")}: ${item.rawMessage}`)]
      .filter(Boolean));
    const rows = byId.get("technical-diagnostics").content.rows;
    add(byId.get("technical-diagnostics").title,
      rows.map(row => `- ${row.label}: \`${row.value}\``));
    const stacks = byId.get("al-call-stack").content;
    add(byId.get("al-call-stack").title, stacks.flatMap(stack => [
      `${localized("Parse status", "Tolkningsstatus")}: ${stack.parseStatus}`,
      ...stack.frames.map(frame => `${frame.frameIndex + 1}. ${frame.objectType || ""} ${frame.objectId || ""} ${frame.objectName || ""}.${frame.methodName || ""}`.trim()),
      ...(stack.rawCallStack ? ["", "```text", stack.rawCallStack, "```"] : [])
    ]));
    const objects = byId.get("affected-objects").content;
    add(byId.get("affected-objects").title, objects.objects.map(item =>
      `- ${item.objectType} ${item.objectId} — ${item.objectName}`));
    const telemetry = byId.get("telemetry")?.content;
    add(byId.get("telemetry").title, !telemetry?.configured
      ? [localized("Not configured or not fetched.",
        "Inte konfigurerad eller inte hämtad.")] : telemetry.contexts.flatMap(context => [
        `${localized("Error evidence", "Felbevis")}: ${context.errorEvidenceId}`,
        `Status: ${context.status}`,
        ...context.events.map(event => `- ${event.timestamp} [${event.category}] ${event.eventName || event.message} (correlation: ${(event.correlationReasons || []).join(", ")})`)]));
    add(byId.get("correlated-timeline").title,
      (byId.get("correlated-timeline")?.content || [])
      .map(item => `- ${item.timestamp} [${item.source}] ${item.label}`));
    add(byId.get("notes").title, byId.get("notes").content.map(note =>
      `- ${note.text || note.content || ""}`));
    return `${out.join("\n").trim()}\n`;
  }
  function plainText(document) {
    return markdown(document).replace(/^#{1,6}\s+/gmu, "")
      .replace(/```text\n|```/gu, "").replace(/`([^`]*)`/gu, "$1");
  }
  return { markdown, plainText };
});
