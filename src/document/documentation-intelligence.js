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

  function documentFacts(document) {
    const sections = document?.sections || [];
    const blocks = [];
    function visit(values) {
      (values || []).forEach(value => {
        blocks.push(value);
        visit(value.blocks);
      });
    }
    sections.forEach(section => visit(section.blocks));
    const steps = blocks.filter(block => block.kind === "step");
    return {
      sectionKinds: new Set(sections.map(section => section.kind)),
      steps,
      stepHasScreenshot: steps.map(step =>
        (step.blocks || []).some(block => block.kind === "image")),
      instructions: steps.map(step =>
        (step.blocks || []).find(block => block.kind === "paragraph")?.text || "")
    };
  }

  function profileItem(profile, key, group, title, action, context = {}) {
    return {
      guidanceId: `profile:${profile.profileId}:${key}`,
      diagnosticId: null,
      group,
      title: `Recommendation: ${title}`,
      description: `Det här är särskilt värdefullt för ${profile.displayName}.`,
      severity: "recommendation",
      documentLocation: context.selectedSectionId || "document",
      recommendedAction: action,
      status: "Recommendation",
      context: {
        selectedSectionId: context.selectedSectionId || null,
        selectedStepId: context.selectedStepId || null,
        selectedScreenshotId: null,
        selectedAnnotationId: null,
        scrollAnchor: context.scrollAnchor || null
      }
    };
  }

  function profileGuidance(document, profile, diagnosticRules) {
    if (!profile) return [];
    const facts = documentFacts(document);
    const values = [];
    for (const section of profile.recommendedSections || []) {
      const covered = section === "purpose"
        ? diagnosticRules.has("document.missing-purpose")
        : section === "workflow"
          ? diagnosticRules.has("document.missing-workflow")
          : section === "revisionHistory"
            ? diagnosticRules.has("document.missing-revision-history")
            : false;
      if (!facts.sectionKinds.has(section) && !covered) {
        values.push(profileItem(profile, `section:${section}`, section === "workflow"
          ? "Workflow" : section === "revisionHistory"
            ? "Revision History" : "Documentation",
        section === "purpose" ? "Beskriv dokumentets syfte" :
          section === "revisionHistory" ? "Ta med revisionshistorik" :
            "Beskriv arbetsflödet",
        "Överväg att komplettera den rekommenderade dokumentstrukturen."));
      }
    }
    for (const field of profile.recommendedMetadata || []) {
      const diagnosticRule = field === "documentVersion"
        ? "metadata.missing-revision"
        : `metadata.missing-${field.replace(/[A-Z]/g,
          match => `-${match.toLowerCase()}`)}`;
      if (!document?.metadata?.[field] &&
          !diagnosticRules.has(diagnosticRule)) {
        values.push(profileItem(profile, `metadata:${field}`, "Metadata",
          "Komplettera dokumentinformationen",
          "Överväg att lägga till den profilrekommenderade informationen."));
      }
    }
    if (profile.expectedScreenshots?.perStep &&
        facts.stepHasScreenshot.some(value => !value) &&
        !diagnosticRules.has("screenshot.missing")) {
      values.push(profileItem(profile, "screenshots", "Screenshots",
        "Stärk stegen med visuellt stöd",
        "Överväg en skärmbild för steg där den underlättar förståelsen."));
    }
    if (profile.workflowExpectations?.explanatoryText === "expanded" &&
        facts.instructions.some(value => value.trim().length < 40) &&
        !diagnosticRules.has("step.very-short-instruction")) {
      values.push(profileItem(profile, "expanded-text", "Workflow",
        "Utöka förklaringen i korta steg",
        "Lägg gärna till sammanhang som hjälper en ny användare."));
    }
    if (profile.revisionExpectations?.approvalInformation) {
      values.push(profileItem(profile, "approval-information", "Metadata",
        "Beskriv godkännandeansvar",
        "Överväg att dokumentera vem som godkänner instruktionen."));
    }
    return values;
  }

  function confirmations(document, profile, items) {
    if (!profile) return [];
    const facts = documentFacts(document);
    const values = [];
    function add(key, group, condition) {
      const title = profile.positiveConfirmations?.[key];
      if (condition && title && !items.some(itemValue => itemValue.group === group &&
          itemValue.severity === "attention")) {
        values.push({ confirmationId: `confirmation:${profile.profileId}:${key}`,
          group, title });
      }
    }
    add("workflow", "Workflow", facts.steps.length >=
      (profile.workflowExpectations?.minimumSteps || 1));
    add("screenshots", "Screenshots", facts.stepHasScreenshot.length > 0 &&
      facts.stepHasScreenshot.every(Boolean));
    add("accessibility", "Accessibility",
      !items.some(value => value.group === "Accessibility"));
    add("metadata", "Metadata", (profile.recommendedMetadata || []).every(
      field => Boolean(document?.metadata?.[field])) &&
      !profile.revisionExpectations?.approvalInformation);
    add("purpose", "Documentation", facts.sectionKinds.has("purpose"));
    add("revisionHistory", "Revision History",
      facts.sectionKinds.has("revisionHistory"));
    return values;
  }

  function findingRelevant(finding, profile) {
    if (!profile) return true;
    if (["document.missing-revision-history", "metadata.missing-revision"]
      .includes(finding.ruleId)) {
      return profile.revisionExpectations?.recommended === true;
    }
    if (finding.ruleId === "screenshot.missing") {
      return profile.expectedScreenshots?.perStep === true;
    }
    if (finding.ruleId === "document.missing-purpose") {
      return profile.recommendedSections?.includes("purpose");
    }
    if (finding.ruleId === "metadata.missing-reviewer") {
      return profile.recommendedMetadata?.includes("reviewer");
    }
    return true;
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
    const profile = options.profile || null;
    for (const finding of options.qualityDiagnostics?.findings || []) {
      if (!finding?.diagnosticId || seen.has(finding.diagnosticId) ||
          !findingRelevant(finding, profile)) continue;
      seen.add(finding.diagnosticId);
      items.push(item(finding));
    }
    for (const finding of options.processDiagnostics?.diagnostics || []) {
      const diagnosticId = `process:${finding.code}:` +
        String(finding.nodeId || finding.transitionId ||
          finding.processOverrideId || items.length);
      if (seen.has(diagnosticId)) continue;
      seen.add(diagnosticId);
      const titles = {
        "missing-start": "Processen saknar en tydlig start",
        "missing-end": "Processen saknar ett tydligt slut",
        "unreachable-node": "En processaktivitet kan inte nås",
        "orphaned-process-override": "En manuell processändring saknar mål",
        "orphan-transition": "En processövergång saknar målpunkt"
      };
      items.push({ guidanceId: `guidance:${diagnosticId}`, diagnosticId,
        group: "Workflow", title: `Recommendation: ${titles[finding.code] ||
          "Granska processmodellen"}`,
        description: "Processmodellens validering har hittat något som bör granskas.",
        severity: finding.severity === "error" ? "attention" : "recommendation",
        documentLocation: finding.nodeId || "process-model",
        recommendedAction: "Granska processens struktur utan att ändra inspelad evidens.",
        status: finding.severity === "error" ? "Needs Attention" : "Recommendation",
        context: { selectedSectionId: null, selectedStepId: null,
          selectedScreenshotId: null, selectedAnnotationId: null,
          scrollAnchor: finding.nodeId || null } });
    }
    if (options.processVersionState?.currentDiff?.summary?.changed) {
      const state = options.processVersionState;
      const baselineLabel = state.baselineVersion?.versionNumber || "baseline";
      items.push({ guidanceId: `process-version:changed:${baselineLabel}`,
        diagnosticId: null, group: "Workflow",
        title: "Recommendation: Processen har ändrats sedan baslinjen",
        description: `Den aktuella processmodellen skiljer sig från ${baselineLabel}.`,
        severity: "recommendation", documentLocation: "process-version",
        recommendedAction: "Granska den strukturerade ändringsmängden och skapa en version vid behov.",
        status: "Recommendation", context: { selectedSectionId: null,
          selectedStepId: null, selectedScreenshotId: null,
          selectedAnnotationId: null, scrollAnchor: null } });
    }
    if ((options.regenerationState?.unresolvedOverrideCount || 0) > 0) {
      const count = options.regenerationState.unresolvedOverrideCount;
      items.push({ guidanceId: "regeneration:unresolved-overrides",
        diagnosticId: null, group: "Workflow",
        title: "Recommendation: Granska ändringar efter regenerering",
        description: `${count} manuella ändringar kunde inte kopplas säkert.`,
        severity: "recommendation", documentLocation: "regeneration",
        recommendedAction: "Granska de bevarade olösta ändringarna utan att ändra inspelningen.",
        status: "Recommendation", context: { selectedSectionId: null,
          selectedStepId: null, selectedScreenshotId: null,
          selectedAnnotationId: null, scrollAnchor: null } });
    }
    const diagnosticRules = new Set(
      (options.qualityDiagnostics?.findings || []).map(finding => finding.ruleId)
    );
    items.push(...profileGuidance(options.document, profile, diagnosticRules));
    const priority = new Map((profile?.guidancePriorities || []).map(
      (group, index) => [group, index]
    ));
    items.sort((left, right) =>
      (priority.get(left.group) ?? 999) - (priority.get(right.group) ?? 999) ||
      left.guidanceId.localeCompare(right.guidanceId)
    );
    const positiveConfirmations = confirmations(options.document, profile, items);
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
      profile: profile ? {
        profileId: profile.profileId,
        displayName: profile.displayName,
        description: profile.description
      } : null,
      health,
      positiveConfirmations,
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
