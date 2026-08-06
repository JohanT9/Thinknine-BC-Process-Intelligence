(function (root, factory) {
  const projector = typeof module === "object" && module.exports
    ? require("../document/review-document-projector")
    : root.T9ReviewDocumentProjector;
  const semantic = typeof module === "object" && module.exports
    ? require("../document/semantic-document")
    : root.T9DocumentModel;
  const interactions = typeof module === "object" && module.exports
    ? require("../document/semantic-interaction-engine")
    : root.T9SemanticInteractionEngine;
  const language = typeof module === "object" && module.exports
    ? require("../document/language-excellence")
    : root.T9LanguageExcellence;
  const presentation = typeof module === "object" && module.exports
    ? require("../document/presentation-grammar")
    : root.T9PresentationGrammar;
  const screenshotIntelligence = typeof module === "object" && module.exports
    ? require("../document/screenshot-intelligence")
    : root.T9ScreenshotIntelligence;
  const profiles = typeof module === "object" && module.exports
    ? require("../document/document-profile")
    : root.T9DocumentProfile;
  const registry = typeof module === "object" && module.exports
    ? require("../document/document-theme-registry")
    : root.T9DocumentThemeRegistry;
  const themeValidation = typeof module === "object" && module.exports
    ? require("../document/document-theme-validation")
    : root.T9DocumentThemeValidation;
  const planner = typeof module === "object" && module.exports
    ? require("../document/document-planner")
    : root.T9DocumentPlanner;
  const planValidation = typeof module === "object" && module.exports
    ? require("../document/document-plan-validation")
    : root.T9DocumentPlanValidation;
  const quality = typeof module === "object" && module.exports
    ? require("../document/document-quality")
    : root.T9DocumentQuality;
  const qualityRules = typeof module === "object" && module.exports
    ? require("../document/document-quality-rules")
    : root.T9DocumentQualityRules;
  const qualityValidation = typeof module === "object" && module.exports
    ? require("../document/document-quality-validation")
    : root.T9DocumentQualityValidation;
  const api = factory(
    projector,
    semantic,
    interactions,
    language,
    presentation,
    screenshotIntelligence,
    profiles,
    registry,
    themeValidation,
    planner,
    planValidation,
    quality,
    qualityRules,
    qualityValidation
  );
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9WordExportPipeline = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (
  projector,
  semantic,
  interactions,
  language,
  presentation,
  screenshotIntelligence,
  profiles,
  registry,
  themeValidation,
  planner,
  planValidation,
  quality,
  qualityRules,
  qualityValidation
) {
  function analyzeQuality(document, plan) {
    try {
      const result = quality.analyze(
        document,
        plan,
        qualityRules.BUILT_IN_REGISTRY
      );
      return qualityValidation.validate(result).valid
        ? result
        : emptyQualityResult();
    } catch {
      return emptyQualityResult();
    }
  }

  function emptyQualityResult() {
    return semantic.deepFreeze({
      diagnosticSchemaVersion: quality?.DIAGNOSTIC_SCHEMA_VERSION || "1.0.0",
      findings: [],
      summary: {
        totalFindings: 0,
        bySeverity: { error: 0, warning: 0, information: 0 },
        byRule: {},
        affectedSections: [],
        affectedSteps: []
      }
    });
  }

  function create(options = {}) {
    const projection = projector.project(options.review, {
      session: options.session,
      prerequisites: options.prerequisites,
      expectedResult: options.expectedResult
    });
    const documentResult = semantic.validate(projection.document);
    if (!documentResult.valid) {
      throw new Error(
        `Semantic Document validation failed: ${documentResult.issues[0].message}`
      );
    }
    const profile = profiles.get(
      profiles.BUILT_IN_REGISTRY,
      options.profileId || "business-process"
    ) || profiles.get(profiles.BUILT_IN_REGISTRY, "business-process");
    const semanticActionsDocument = interactions.processDocument(
      projection.document
    );
    const semanticActionsResult = semantic.validate(semanticActionsDocument);
    if (!semanticActionsResult.valid) {
      throw new Error(
        "Semantic Interaction validation failed: " +
        semanticActionsResult.issues[0].message
      );
    }
    const languageDocument = language.process(semanticActionsDocument, profile);
    const grammarDocument = presentation.process(languageDocument);
    const screenshotCandidates = screenshotIntelligence.normalizeCandidates(
      options.screenshotCandidates
    );
    const screenshotResult = screenshotIntelligence.select(grammarDocument, {
      candidates: screenshotCandidates,
      profile
    });
    const presentationDocument = screenshotResult.document;
    const resolvedTheme = registry.resolve(
      registry.BUILT_IN_REGISTRY,
      options.themeId || "thinknine",
      options.themeOverrides || {}
    );
    const themeResult = themeValidation.validate(resolvedTheme, {
      requireValues: true
    });
    if (!themeResult.valid) {
      throw new Error(
        `Document Theme validation failed: ${themeResult.issues[0].message}`
      );
    }
    const plan = planner.plan(presentationDocument, resolvedTheme);
    const planResult = planValidation.validate(plan, {
      document: presentationDocument,
      theme: resolvedTheme,
      plannerVersion: planner.PLANNER_VERSION
    });
    if (!planResult.valid) {
      throw new Error(
        `Document Plan validation failed: ${planResult.issues[0].message}`
      );
    }
    return semantic.deepFreeze({
      sourceSemanticDocument: projection.document,
      semanticActionsDocument,
      languageDocument,
      presentationDocument: grammarDocument,
      semanticDocument: presentationDocument,
      languageProfile: profile,
      screenshotCandidates,
      screenshotSelections: screenshotResult.selections,
      theme: resolvedTheme,
      plan,
      diagnostics: projection.diagnostics,
      qualityDiagnostics: analyzeQuality(presentationDocument, plan)
    });
  }

  function screenshotComponents(plan) {
    const result = [];
    function visit(components) {
      (components || []).forEach(component => {
        if (component.kind === "screenshot" &&
            component.visibility !== "hidden") {
          result.push(component);
        }
        visit(component.components);
      });
    }
    visit(plan?.components);
    (plan?.sections || []).forEach(section => visit(section.components));
    return result;
  }

  function requiredMediaAssetIds(plan) {
    return [...new Set(screenshotComponents(plan).map(component =>
      component.content?.assetId || component.sourceRef?.assetId
    ).filter(Boolean))];
  }

  function validateMedia(plan, mediaAssets = {}) {
    const missing = requiredMediaAssetIds(plan).filter(assetId => {
      const value = mediaAssets[assetId];
      return !(value instanceof Uint8Array) &&
        !(value?.bytes instanceof Uint8Array);
    });
    if (missing.length) {
      throw new Error(`Word export is missing media assets: ${missing.join(", ")}.`);
    }
    return true;
  }

  return {
    analyzeQuality,
    create,
    requiredMediaAssetIds,
    screenshotComponents,
    validateMedia
  };
});
