(function (root, factory) {
  const semantic = typeof module === "object" && module.exports
    ? require("./semantic-document")
    : root.T9DocumentModel;
  const api = factory(semantic);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9DocumentationIntelligence = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (semantic) {
  const GROUPS = Object.freeze([
    "Documentation", "Workflow", "Screenshots", "Accessibility",
    "Metadata", "Revision History", "General"
  ]);
  const PRESENTATION = Object.freeze({
    error: Object.freeze({ status: "Needs Attention", tone: "attention" }),
    warning: Object.freeze({ status: "Recommendation", tone: "recommendation" }),
    information: Object.freeze({ status: "Suggestion", tone: "information" })
  });
  const LABELS = Object.freeze({
    "document.missing-title": "Tydlig dokumenttitel",
    "document.missing-purpose": "Beskrivet syfte",
    "document.missing-workflow": "Beskrivet arbetsflöde",
    "document.empty": "Dokumentinnehåll",
    "document.missing-revision-history": "Revisionshistorik",
    "step.empty-instruction": "Tydlig instruktion",
    "step.very-short-instruction": "Instruktion med sammanhang",
    "step.duplicate-instruction": "Unika instruktioner",
    "screenshot.missing": "Visuellt stöd för steget",
    "screenshot.missing-alt-text": "Beskrivande alternativtext",
    "screenshot.duplicate-usage": "Avsiktlig skärmbildsanvändning",
    "metadata.missing-environment": "Miljöinformation",
    "metadata.missing-reviewer": "Ansvarig granskare",
    "metadata.missing-revision": "Versionsinformation"
  });

  function groupFor(finding) {
    const ruleId = String(finding.ruleId || "");
    if (/alt-text|accessibility/.test(ruleId)) return "Accessibility";
    if (/^screenshot\./.test(ruleId)) return "Screenshots";
    if (/revision/.test(ruleId)) return "Revision History";
    if (/^metadata\./.test(ruleId)) return "Metadata";
    if (/^step\.|workflow/.test(ruleId)) return "Workflow";
    if (/^document\.|^callout\./.test(ruleId)) return "Documentation";
    return "General";
  }

  function titleFor(finding, group) {
    const subject = {
      Documentation: "Dokumentets innehåll",
      Workflow: "Arbetsflödets tydlighet",
      Screenshots: "Skärmbildsstöd",
      Accessibility: "Tillgänglig presentation",
      Metadata: "Dokumentinformation",
      "Revision History": "Revisionsinformation",
      General: "Dokumentets helhet"
    }[group];
    return `${PRESENTATION[finding.severity]?.status || "Recommendation"}: ` +
      `${LABELS[finding.ruleId] || subject}`;
  }

  function guidanceText(group) {
    const subject = group === "Revision History"
      ? "revisionshistorik"
      : group.toLowerCase();
    return {
      description: `En komplettering här kan stärka dokumentets ${subject}.`,
      action: `Granska ${subject} och komplettera när det är relevant.`
    };
  }

  function contextFor(finding) {
    const source = finding.sourceRef || {};
    return {
      selectedSectionId: source.sectionId || null,
      selectedStepId: source.taskId || null,
      selectedScreenshotId: source.screenshotRef || null,
      selectedAnnotationId: source.annotationId || null,
      scrollAnchor: source.componentId || source.blockId || source.sectionId || null
    };
  }

  function item(finding) {
    const group = groupFor(finding);
    const presentation = PRESENTATION[finding.severity] || PRESENTATION.warning;
    const text = guidanceText(group);
    return {
      guidanceId: `guidance:${finding.diagnosticId}`,
      diagnosticId: finding.diagnosticId,
      group,
      title: titleFor(finding, group),
      description: text.description,
      severity: presentation.tone,
      documentLocation: finding.location || "document",
      recommendedAction: text.action,
      status: presentation.status,
      context: contextFor(finding)
    };
  }

  function categoryStatus(items, group, completeLabel = "Complete") {
    const values = items.filter(value => value.group === group);
    if (!values.length) return completeLabel;
    return values.some(value => value.severity === "attention")
      ? "Needs Attention"
      : "Good with Suggestions";
  }

  function create(options = {}) {
    const seen = new Set();
    const items = [];
    for (const finding of options.qualityDiagnostics?.findings || []) {
      if (!finding?.diagnosticId || seen.has(finding.diagnosticId)) continue;
      seen.add(finding.diagnosticId);
      items.push(item(finding));
    }
    const groups = GROUPS.map(name => ({
      name,
      items: items.filter(value => value.group === name)
    })).filter(group => group.items.length);
    const health = {
      overall: items.some(value => value.severity === "attention")
        ? "Needs Attention"
        : "Ready for Review",
      suggestionLabel: items.length === 1 ? "1 Suggestion" : `${items.length} Suggestions`,
      categories: [
        { name: "Screenshots", status: categoryStatus(items, "Screenshots") },
        { name: "Accessibility", status: categoryStatus(items, "Accessibility", "Good") },
        { name: "Metadata", status: categoryStatus(items, "Metadata") },
        { name: "Workflow", status: categoryStatus(items, "Workflow") },
        { name: "Revision History", status: categoryStatus(items, "Revision History") },
        { name: "Documentation", status: categoryStatus(items, "Documentation") }
      ]
    };
    return semantic.deepFreeze({
      intelligenceVersion: "1.0.0",
      documentId: options.document?.documentId || "",
      planId: options.plan?.planId || "",
      activeContext: { ...(options.workspaceContext || {}) },
      health,
      groups,
      items
    });
  }

  function filter(model, value = "all") {
    if (value === "all") return model.items;
    return semantic.deepFreeze(model.items.filter(itemValue =>
      itemValue.group === value || itemValue.severity === value
    ));
  }

  return { GROUPS, PRESENTATION, create, filter, groupFor };
});
