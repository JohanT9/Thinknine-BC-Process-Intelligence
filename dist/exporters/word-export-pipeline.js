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
  const documentLanguage = typeof module === "object" && module.exports
    ? require("../document/document-language")
    : root.T9DocumentLanguage;
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
    documentLanguage,
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
  documentLanguage,
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

  function createPresentation(options = {}) {
    const projection = projector.project(options.review, {
      session: options.session,
      prerequisites: options.prerequisites,
      expectedResult: options.expectedResult,
      purpose: options.purpose
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
    const localizedDocument = documentLanguage.process(languageDocument,
      options.documentLanguage || projection.document.metadata?.documentLanguage);
    const grammarDocument = presentation.process(localizedDocument);
    return semantic.deepFreeze({
      sourceSemanticDocument: projection.document,
      semanticActionsDocument,
      languageDocument,
      localizedDocument,
      presentationDocument: grammarDocument,
      languageProfile: profile,
      diagnostics: projection.diagnostics
    });
  }

  function create(options = {}) {
    const prepared = options.preparedPresentation || createPresentation(options);
    const grammarDocument = prepared.presentationDocument;
    const profile = prepared.languageProfile;
    const screenshotCandidates = screenshotIntelligence.normalizeCandidates(
      options.screenshotCandidates
    );
    const screenshotResult = screenshotIntelligence.select(grammarDocument, {
      candidates: screenshotCandidates,
      profile
    });
    const presentationDocument = screenshotResult.document;
    const resolvedTheme = resolveTheme(options, presentationDocument.metadata || {});
    const themeResult = themeValidation.validate(resolvedTheme, {
      requireValues: true
    });
    if (!themeResult.valid) {
      throw new Error(
        `Document Theme validation failed: ${themeResult.issues[0].message}`
      );
    }
    // The template decides which parts of the document are shown (document-template.js).
    const model = options.template ? templateModel() : null;
    const arranged = model ? model.arrangeSections(presentationDocument, options.template)
      : presentationDocument;
    const plan = planner.plan(arranged, resolvedTheme);
    const planResult = planValidation.validate(plan, {
      document: arranged,
      theme: resolvedTheme,
      plannerVersion: planner.PLANNER_VERSION
    });
    if (!planResult.valid) {
      throw new Error(
        `Document Plan validation failed: ${planResult.issues[0].message}`
      );
    }
    return semantic.deepFreeze({
      sourceSemanticDocument: prepared.sourceSemanticDocument,
      semanticActionsDocument: prepared.semanticActionsDocument,
      languageDocument: prepared.languageDocument,
      localizedDocument: prepared.localizedDocument,
      presentationDocument: prepared.presentationDocument,
      semanticDocument: presentationDocument,
      languageProfile: profile,
      screenshotCandidates,
      screenshotSelections: screenshotResult.selections,
      theme: resolvedTheme,
      // The template the document is presented with, for its logo.
      template: options.template || null,
      plan,
      diagnostics: prepared.diagnostics,
      // The quality check reads the whole document: a part the template leaves out is a
      // choice, not something missing.
      qualityDiagnostics: arranged === presentationDocument ||
        arranged.sections.length === presentationDocument.sections.length &&
        arranged.sections.every((section, index) => section === presentationDocument.sections[index])
        ? analyzeQuality(presentationDocument, plan)
        : analyzeQuality(presentationDocument, planner.plan(presentationDocument, resolvedTheme))
    });
  }

  // The theme a document is presented with: its template's (document/document-template.js)
  // when it names one, else the theme it names. A template of the user's own is its built-in
  // theme with the template's appearance laid over it; the footer is filled in with the
  // document's name and the date in the document language.
  function templateModel() {
    return globalThis.T9DocumentTemplate ||
      (typeof require === "function" ? require("../document/document-template") : null);
  }
  function resolveTheme(options = {}, metadata = {}) {
    const template = options.template || null;
    const model = template && !template.builtIn ? templateModel() : null;
    if (!model) {
      return registry.resolve(registry.BUILT_IN_REGISTRY,
        template?.builtIn ? template.templateId : options.themeId || "thinknine",
        options.themeOverrides || {});
    }
    const value = model.normalize(template);
    const base = registry.resolve(registry.BUILT_IN_REGISTRY, value.baseThemeId);
    const locale = metadata.documentLanguage || "en-US";
    let date;
    try { date = new Date(options.now || Date.now()).toLocaleDateString(locale); }
    catch { date = new Date(options.now || Date.now()).toISOString().slice(0, 10); }
    return registry.resolve(registry.BUILT_IN_REGISTRY, value.baseThemeId,
      model.themeOverrides(value, { document: metadata.title || "", date }, base.capabilities));
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

  // The template's logo, in the header and on the cover, is an image Word needs as well.
  function templateLogoIds(plan) {
    const found = [];
    const visit = components => (components || []).forEach(component => {
      const logo = component.appearance?.branding?.logo || component.appearance?.brandLogo;
      if (logo && ["header", "cover"].includes(component.kind)) found.push(logo);
      visit(component.components);
    });
    visit(plan?.components);
    (plan?.sections || []).forEach(section => visit(section.components));
    return found;
  }

  function requiredMediaAssetIds(plan) {
    return [...new Set([...screenshotComponents(plan).map(component =>
      component.content?.assetId || component.sourceRef?.assetId
    ), ...templateLogoIds(plan)].filter(Boolean))];
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
    createPresentation,
    requiredMediaAssetIds,
    resolveTheme,
    screenshotComponents,
    validateMedia
  };
});
