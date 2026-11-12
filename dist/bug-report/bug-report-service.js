(function (root, factory) {
  const model = typeof module === "object" && module.exports
    ? require("./bug-report-model") : root.T9BugReportModel;
  const technical = typeof module === "object" && module.exports
    ? require("./technical-diagnostics") : root.T9TechnicalDiagnostics;
  const errorAnalysis = typeof module === "object" && module.exports
    ? require("./error-analysis-engine") : root.T9ErrorAnalysisEngine;
  const languages = typeof module === "object" && module.exports
    ? require("../engine/language-registry") : root.T9LanguageRegistry;
  const api = factory(model, technical, errorAnalysis, languages);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9BugReportService = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (model, technical,
  errorAnalysis, languages) {
  "use strict";
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const unique = values => [...new Set((values || []).filter(Boolean).map(String))];

  function stableId(recordingId) {
    return `bug-report:${String(recordingId)}`;
  }

  function reproductionStep(step, index, recordingId, maskedStep = null) {
    const canonicalIds = unique(step.sourceEventIds ||
      step.sourceCanonicalEventIds);
    const screenshots = unique(step.screenshotAssetIds || [
      step.screenshotAssetId, step.canonicalScreenshotAssetId
    ]);
    const instruction = step.instruction || step.displayText || "";
    const maskedInstruction = maskedStep ? maskedStep.instruction || maskedStep.displayText || "" : "";
    return { reproductionStepId: `bug-step:${step.taskId || step.stepId || index + 1}`,
      order: index + 1, instruction,
      // The same step derived from masked values, kept only where it differs.
      ...(maskedInstruction && maskedInstruction !== instruction ? { maskedInstruction } : {}),
      ...(step.stepOverride ? { stepOverride: clone(step.stepOverride) } : {}),
      ...(step.visibility ? { visibility: step.visibility } : {}),
      authorship: "derived", source: { recordingId,
        sourceCanonicalEventIds: canonicalIds,
        sourceStepId: step.taskId || step.stepId || undefined,
        screenshotAssetIds: screenshots } };
  }

  function environment(recording, context = {}) {
    const metadata = recording.metadata || {};
    return { ...clone(context.environment || {}),
      businessCentral: clone(metadata.businessCentral || {}),
      sourceApplication: metadata.sourceApplication,
      sourceUrlRef: context.sourceUrlRef,
      browser: clone(context.browser || {}),
      extensionVersion: context.extensionVersion,
      productVersion: context.productVersion,
      recordingSchemaVersion: recording.schemaVersion };
  }

  function failureStepIds(recording, steps, errorEvidence) {
    const eventIndexes = new Map((recording.events || []).map((event, index) =>
      [String(event.id), index]));
    const stepEvents = steps.map(step => ({
      reproductionStepId: step.reproductionStepId,
      sourceCanonicalEventIds: step.source.sourceCanonicalEventIds,
      indexes: step.source.sourceCanonicalEventIds.map(id => eventIndexes.get(id))
        .filter(index => Number.isInteger(index))
    }));
    const result = new Set();
    for (const evidence of errorEvidence) {
      const referenceIds = unique([evidence.precedingActionEventId,
        evidence.canonicalEventId]);
      const exact = stepEvents.find(step => referenceIds.some(id =>
        step.sourceCanonicalEventIds.includes(id)));
      if (exact) {
        result.add(exact.reproductionStepId);
        continue;
      }
      const referenceIndexes = referenceIds.map(id => eventIndexes.get(id))
        .filter(index => Number.isInteger(index));
      if (!referenceIndexes.length) continue;
      const boundary = Math.min(...referenceIndexes);
      const preceding = stepEvents.map(step => ({ ...step,
        nearestIndex: Math.max(-1, ...step.indexes.filter(index => index < boundary)) }))
        .filter(step => step.nearestIndex >= 0)
        .sort((left, right) => right.nearestIndex - left.nearestIndex)[0];
      if (preceding) result.add(preceding.reproductionStepId);
    }
    return result;
  }

  // The action a generated instruction names, in any document language: the instruction's
  // verb, and the closing verb prefix of a German sentence, are left out.
  function actionFromInstruction(value) {
    const text = String(value || "").replace(/\*\*/gu, "").trim();
    const match = text.match(
      /^(?:välj|klicka på|tryck på|select|choose|click on|click|press|sélectionnez|choisissez|appuyez sur|wählen sie|drücken sie|seleccione|pulse|vælg|tryk på|valitse|paina|velg|trykk på)\s+(.+?)(?:\s+aus)?[.!]?$/iu);
    return String(match?.[1] || "").replace(/^[”“"'«„»]|[”“"'»«]$/gu, "").trim();
  }

  // Suggested titles in every document language; the captured caption keeps its own language.
  const TITLE_TEMPLATES = {
    action: { "sv-SE": v => `Fel vid ”${v}”`, "en-US": v => `Error when selecting “${v}”`,
      "fr-FR": v => `Erreur lors de la sélection de « ${v} »`, "de-DE": v => `Fehler bei „${v}“`,
      "es-ES": v => `Error al seleccionar «${v}»`, "da-DK": v => `Fejl ved ”${v}”`,
      "fi-FI": v => `Virhe toiminnossa ”${v}”`, "nb-NO": v => `Feil ved «${v}»` },
    field: { "sv-SE": v => `Valideringsfel i ”${v}”`, "en-US": v => `Validation error in “${v}”`,
      "fr-FR": v => `Erreur de validation dans « ${v} »`, "de-DE": v => `Validierungsfehler in „${v}“`,
      "es-ES": v => `Error de validación en «${v}»`, "da-DK": v => `Valideringsfejl i ”${v}”`,
      "fi-FI": v => `Tarkistusvirhe kentässä ”${v}”`, "nb-NO": v => `Valideringsfeil i «${v}»` },
    page: { "sv-SE": v => `Business Central-fel i ”${v}”`,
      "en-US": v => `Business Central error in “${v}”`,
      "fr-FR": v => `Erreur Business Central dans « ${v} »`,
      "de-DE": v => `Business Central-Fehler in „${v}“`,
      "es-ES": v => `Error de Business Central en «${v}»`,
      "da-DK": v => `Business Central-fejl i ”${v}”`,
      "fi-FI": v => `Business Central -virhe sivulla ”${v}”`,
      "nb-NO": v => `Business Central-feil i «${v}»` }
  };
  function titleFor(kind, value, language) {
    const locale = languages.normalize(language, "document");
    return (TITLE_TEMPLATES[kind][locale] || TITLE_TEMPLATES[kind]["en-US"])(value);
  }

  function draftTitle(recording, derivedSteps, reproductionSteps, errorEvidence,
    language) {
    const evidenceEventIds = new Set(errorEvidence.flatMap(item =>
      [item.precedingActionEventId, item.canonicalEventId]).filter(Boolean));
    const failed = reproductionSteps.find(step => step.failurePoint) ||
      [...reproductionSteps].reverse().find(step =>
        step.source?.sourceCanonicalEventIds?.some(id => evidenceEventIds.has(id)));
    const source = derivedSteps.find(step => String(step.taskId || step.stepId) ===
      String(failed?.source?.sourceStepId)) || [...derivedSteps].reverse().find(step =>
        String(step.instruction || step.displayText || "").trim());
    const sourceEventIds = new Set(failed?.source?.sourceCanonicalEventIds || []);
    const sourceEvent = [...(recording.events || [])].reverse().find(event =>
      sourceEventIds.has(event.id) && ["click", "action", "submit"].includes(
        String(event.raw?.type || event.type || "").toLowerCase()));
    const action = String(source?.actionCaption || sourceEvent?.raw?.actionCaption ||
      sourceEvent?.raw?.label || sourceEvent?.presentation?.label ||
      actionFromInstruction(failed?.instruction, language) || "").trim();
    const field = String(source?.fieldCaption || "").trim();
    const page = String(source?.pageCaption || "").trim();
    if (errorEvidence.length && action) return titleFor("action", action, language);
    if (errorEvidence.length && field) return titleFor("field", field, language);
    if (errorEvidence.length && page) return titleFor("page", page, language);
    // A report made from an error already on screen has no recorded process to refer to.
    if (errorEvidence.length && !reproductionSteps.length) {
      return languages.translate("Business Central error", language, "Business Central-fel");
    }
    if (errorEvidence.length) return languages.translate(
      "Business Central error during recorded process", language,
      "Business Central-fel i inspelad process");
    return languages.translate("Reported Business Central problem", language,
      "Rapporterat problem i Business Central");
  }
  // The generated fallback titles in every document language, which a better suggestion
  // may replace; a title the user wrote is never replaced.
  const GENERIC_TITLES = new Set(["Business Central error",
    "Business Central error during recorded process", "Reported Business Central problem",
    "Business Central-fel", "Business Central-fel i inspelad process",
    "Rapporterat problem i Business Central"]);
  for (const { locale } of languages.supported("document")) {
    ["Business Central error", "Business Central error during recorded process",
      "Reported Business Central problem"].forEach(english =>
      GENERIC_TITLES.add(languages.translate(english, locale, english)));
  }

  function createBugReportFromRecording(recording, derivedSteps = [], context = {}) {
    if (!recording?.id) throw new TypeError("A Canonical Recording is required.");
    if (recording.metadata?.recordingPurpose !== "bug-report") {
      throw new Error("Bug Reports require a bug-report recording.");
    }
    if (!recording.metadata?.finishedAt) {
      throw new Error("Bug Reports require a completed recording.");
    }
    const now = context.now || recording.updatedAt || new Date().toISOString();
    // A step without text, such as the open error dialog itself when the report was made
    // from an error already on screen, describes nothing to reproduce.
    // Masked steps are matched to the steps by their task, or by position when both
    // derivations produced the same number of steps.
    const maskedSteps = Array.isArray(context.maskedSteps) ? context.maskedSteps : [];
    const stepKey = step => String(step.taskId || step.stepId || "");
    const maskedById = new Map(maskedSteps.filter(stepKey).map(step => [stepKey(step), step]));
    const maskedFor = (step, index) => (stepKey(step) && maskedById.get(stepKey(step))) ||
      (maskedSteps.length === derivedSteps.length ? maskedSteps[index] : null);
    let steps = derivedSteps.map((step, index) =>
      reproductionStep(step, index, recording.id, maskedFor(step, index)))
      .filter(step => step.instruction.trim() ||
      String(step.stepOverride?.fields?.instruction || "").trim());
    const canonicalEventIds = unique(steps.flatMap(step =>
      step.source.sourceCanonicalEventIds));
    const screenshotAssetIds = unique(steps.flatMap(step =>
      step.source.screenshotAssetIds));
    const errorEvidence = Array.isArray(context.errorEvidence)
      ? context.errorEvidence : [];
    const failedSteps = failureStepIds(recording, steps, errorEvidence);
    steps = steps.map(step => failedSteps.has(step.reproductionStepId)
      ? { ...step, outcome: "error", failurePoint: true } : step);
    const errorEvidenceIds = unique(errorEvidence.map(item =>
      item.errorEvidenceId));
    const errorScreenshotIds = unique(errorEvidence.map(item =>
      item.errorScreenshotAssetId));
    const callStackEvidence = errorEvidence.find(item => item.callStackAvailable);
    const technicalDiagnostics = errorEvidence.map(item =>
      technical.safelyDerive(item));
    const primaryCallStack = technicalDiagnostics.find(item =>
      item.summary.callStackAvailable)?.callStack;
    const analyzedErrors = errorAnalysis.analyze(errorEvidence, technicalDiagnostics,
      { recordingId: recording.id });
    const documentLanguage = context.documentLanguage
      ? languages.normalize(context.documentLanguage, "document") : "en-US";
    return model.normalize({ bugReportId: context.bugReportId || stableId(recording.id),
      schemaVersion: model.SCHEMA_VERSION, recordingId: recording.id,
      documentLanguage,
      createdAt: now, updatedAt: now, status: "draft",
      // Values are shown until the user chooses to mask them in the report.
      privacy: { maskValues: false },
      summary: { title: String(context.title || "").trim() ||
          draftTitle(recording, derivedSteps, steps, errorEvidence, documentLanguage),
        summary: "", severity: "", category: "", authorship: "human" },
      environment: environment(recording, context),
      reproduction: { authorship: "derived", steps },
      expectedResult: { text: "", authorship: "human" },
      actualResult: { human: { text: "", authorship: "human" },
        capturedErrorRef: null, capturedErrorRefs: errorEvidenceIds },
      businessCentralError: errorEvidenceIds.length ? {
        primaryErrorEvidenceId: errorEvidenceIds.length === 1 ? errorEvidenceIds[0] : null,
        errorEvidenceIds
      } : null,
      errorAnalysis: analyzedErrors,
      diagnostics: { rawEvidenceRefs: errorEvidenceIds, parsed: null },
      callStack: { rawEvidenceRef: callStackEvidence?.errorEvidenceId || null,
        frames: clone(primaryCallStack?.frames || []),
        parsed: ["parsed", "partially-parsed"].includes(primaryCallStack?.status),
        parserVersion: primaryCallStack?.parserVersion,
        parseStatus: primaryCallStack?.status },
      technicalDiagnostics,
      evidence: { screenshots: [...screenshotAssetIds.map(assetId => ({
        assetId, role: "reproduction"
      })), ...errorScreenshotIds.map(assetId => ({ assetId, role: "error" }))],
      diagnosticRefs: errorEvidenceIds, attachmentRefs: [] }, notes: [], annotations: [],
      traceability: { canonicalEventIds,
        sourceStepIds: unique(derivedSteps.map(step => step.taskId || step.stepId)),
        screenshotAssetIds: unique([...screenshotAssetIds, ...errorScreenshotIds]),
        recordingRevisionRefs:
          unique(context.recordingRevisionRefs) },
      enrichment: { telemetry: null, analysis: null } });
  }

  function regenerate(report, recording, derivedSteps = [], context = {}) {
    const current = model.normalize(report);
    const regenerated = createBugReportFromRecording(recording, derivedSteps, {
      ...context, bugReportId: current.bugReportId, now: current.createdAt,
      title: current.summary.title
    });
    return model.normalize({ ...clone(current), ...regenerated,
      status: current.status,
      createdAt: current.createdAt,
      updatedAt: context.updatedAt || regenerated.updatedAt,
      summary: clone(current.summary), expectedResult: clone(current.expectedResult),
      privacy: clone(current.privacy || regenerated.privacy),
      actualResult: { ...regenerated.actualResult,
        human: clone(current.actualResult.human),
        capturedErrorRef: current.actualResult.capturedErrorRef,
        capturedErrorRefs: clone(current.actualResult.capturedErrorRefs) },
      businessCentralError: clone(current.businessCentralError),
      diagnostics: clone(current.diagnostics),
      callStack: context.errorEvidence ? clone(regenerated.callStack) :
        clone(current.callStack),
      technicalDiagnostics: context.errorEvidence
        ? clone(regenerated.technicalDiagnostics) :
        clone(current.technicalDiagnostics),
      notes: clone(current.notes), annotations: clone(current.annotations),
      // Steps the user wrote are kept after the regenerated recorded steps.
      reproduction: { ...regenerated.reproduction, steps: [
        ...(regenerated.reproduction?.steps || []),
        ...clone(current.reproduction.steps.filter(step => step.origin === "manual"))] },
      evidence: { ...regenerated.evidence,
        screenshots: unique([
          // The user's masking adjustments belong to the image and are kept.
          ...regenerated.evidence.screenshots.map(item => {
            const redactions = current.evidence.screenshots.find(entry =>
              entry.assetId === item.assetId && entry.redactions)?.redactions;
            return JSON.stringify(redactions ? { ...item, redactions: clone(redactions) } : item);
          }),
          ...current.evidence.screenshots.map(item => JSON.stringify(item))
        ]).map(item => JSON.parse(item)),
        diagnosticRefs: clone(current.evidence.diagnosticRefs),
        attachmentRefs: clone(current.evidence.attachmentRefs) },
      enrichment: clone(current.enrichment),
      // What was sent stays recorded; the regenerated report is a new version of it.
      deliveries: clone(current.deliveries) });
  }

  function reparseTechnicalDiagnostics(report, errorEvidence = []) {
    const current = model.normalize(report);
    const derived = errorEvidence.map(item => technical.safelyDerive(item));
    const primary = derived.find(item => item.summary.callStackAvailable)?.callStack;
    const analyzedErrors = errorAnalysis.analyze(errorEvidence, derived,
      { recordingId: current.recordingId });
    return model.normalize({ ...clone(current), technicalDiagnostics: derived,
      errorAnalysis: analyzedErrors,
      callStack: { ...clone(current.callStack),
        frames: clone(primary?.frames || []), parserVersion: primary?.parserVersion,
        parseStatus: primary?.status,
        parsed: ["parsed", "partially-parsed"].includes(primary?.status) } });
  }

  function attachRecoveredErrorEvidence(report, errorEvidence = [], updatedAt) {
    const current = model.normalize(report);
    if (!errorEvidence.length || current.businessCentralError?.errorEvidenceIds?.length) {
      return current;
    }
    const ids = unique(errorEvidence.map(item => item.errorEvidenceId));
    const diagnostics = errorEvidence.map(item => technical.safelyDerive(item));
    const stackEvidence = errorEvidence.find(item => item.callStackAvailable);
    const stack = diagnostics.find(item =>
      item.errorEvidenceId === stackEvidence?.errorEvidenceId)?.callStack;
    const analyzedErrors = errorAnalysis.analyze(errorEvidence, diagnostics,
      { recordingId: current.recordingId });
    const screenshots = errorEvidence.filter(item => item.errorScreenshotAssetId)
      .map(item => ({ assetId: item.errorScreenshotAssetId, role: "error",
        errorEvidenceId: item.errorEvidenceId, visibility: "visible" }));
    return model.normalize({ ...clone(current), updatedAt: updatedAt || current.updatedAt,
      actualResult: { ...clone(current.actualResult), capturedErrorRefs: ids },
      businessCentralError: { primaryErrorEvidenceId: ids.length === 1 ? ids[0] : null,
        errorEvidenceIds: ids },
      errorAnalysis: analyzedErrors,
      diagnostics: { ...clone(current.diagnostics), rawEvidenceRefs: ids },
      callStack: { ...clone(current.callStack),
        rawEvidenceRef: stackEvidence?.errorEvidenceId || null,
        frames: clone(stack?.frames || []), parserVersion: stack?.parserVersion,
        parseStatus: stack?.status, parsed: ["parsed", "partially-parsed"].includes(
          stack?.status) },
      technicalDiagnostics: diagnostics,
      evidence: { ...clone(current.evidence),
        screenshots: unique([...(current.evidence?.screenshots || []).map(item =>
          JSON.stringify(item)), ...screenshots.map(item => JSON.stringify(item))])
          .map(item => JSON.parse(item)), diagnosticRefs: ids } });
  }

  function refreshSuggestedTitle(report, recording, errorEvidence = [], updatedAt) {
    const current = model.normalize(report);
    const genericTitles = GENERIC_TITLES;
    if (!genericTitles.has(current.summary.title) || !errorEvidence.length) {
      return current;
    }
    const title = draftTitle(recording || {}, [], current.reproduction.steps,
      errorEvidence, current.documentLanguage);
    if (!title || genericTitles.has(title)) return current;
    return model.normalize({ ...clone(current),
      updatedAt: updatedAt || current.updatedAt,
      summary: { ...clone(current.summary), title } });
  }

  return { createBugReportFromRecording, regenerate,
    reparseTechnicalDiagnostics, attachRecoveredErrorEvidence,
    refreshSuggestedTitle, stableId };
});
