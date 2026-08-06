(function (root, factory) {
  const semantic = typeof module === "object" && module.exports
    ? require("./semantic-document")
    : root.T9DocumentModel;
  const api = factory(semantic);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9DocumentProfile = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (semantic) {
  const PROFILE_SCHEMA_VERSION = "1.0.0";

  function clone(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  }

  function normalize(value = {}) {
    const input = clone(value && typeof value === "object" ? value : {});
    return semantic.deepFreeze({
      ...input,
      profileSchemaVersion: typeof input.profileSchemaVersion === "string"
        ? input.profileSchemaVersion
        : PROFILE_SCHEMA_VERSION,
      profileId: typeof input.profileId === "string" ? input.profileId : "",
      displayName: typeof input.displayName === "string" ? input.displayName : "",
      description: typeof input.description === "string" ? input.description : "",
      theme: { themeId: input.theme?.themeId || "thinknine", ...(input.theme || {}) },
      recommendedSections: Array.isArray(input.recommendedSections)
        ? input.recommendedSections : [],
      recommendedMetadata: Array.isArray(input.recommendedMetadata)
        ? input.recommendedMetadata : [],
      workflowExpectations: { ...(input.workflowExpectations || {}) },
      revisionExpectations: { ...(input.revisionExpectations || {}) },
      expectedScreenshots: { ...(input.expectedScreenshots || {}) },
      guidancePriorities: Array.isArray(input.guidancePriorities)
        ? input.guidancePriorities : [],
      positiveConfirmations: { ...(input.positiveConfirmations || {}) },
      language: { tone: input.language?.tone || "professional",
        ...(input.language || {}) },
      capabilities: Array.isArray(input.capabilities) ? input.capabilities : []
    });
  }

  function profile(profileId, displayName, description, options) {
    return normalize({ profileId, displayName, description, ...options,
      metadata: { builtIn: true } });
  }

  const commonConfirmations = {
    workflow: "Arbetsflödet är dokumenterat",
    screenshots: "Skärmbildsstödet är komplett",
    accessibility: "Tillgängligheten ser bra ut",
    metadata: "Dokumentinformationen är komplett",
    purpose: "Syftet är dokumenterat",
    revisionHistory: "Revisionshistorik finns"
  };

  const BUILT_IN_PROFILES = semantic.deepFreeze([
    profile("business-process", "Business Process",
      "Balanced process documentation for analysis and handover.", {
        theme: { themeId: "thinknine" },
        language: { tone: "professional" },
        recommendedSections: ["purpose", "workflow"],
        recommendedMetadata: ["environment"],
        workflowExpectations: { minimumSteps: 1, explanatoryText: "standard" },
        revisionExpectations: { recommended: true },
        expectedScreenshots: { perStep: true },
        guidancePriorities: ["Workflow", "Screenshots", "Documentation", "Metadata"],
        positiveConfirmations: commonConfirmations,
        capabilities: ["processOverview", "handover"]
      }),
    profile("sop", "Standard Operating Procedure (SOP)",
      "Controlled operational instructions with revision expectations.", {
        theme: { themeId: "corporate" },
        language: { tone: "precise" },
        recommendedSections: ["purpose", "workflow", "revisionHistory"],
        recommendedMetadata: ["environment", "reviewer", "documentVersion"],
        workflowExpectations: { minimumSteps: 1, explanatoryText: "precise" },
        revisionExpectations: { recommended: true, approvalInformation: true },
        expectedScreenshots: { perStep: true },
        guidancePriorities: ["Revision History", "Workflow", "Metadata", "Screenshots"],
        positiveConfirmations: commonConfirmations,
        capabilities: ["controlledDocument", "approval"]
      }),
    profile("training-guide", "Training Guide",
      "Explanatory learning material with strong visual support.", {
        theme: { themeId: "thinknine" },
        language: { tone: "explanatory" },
        recommendedSections: ["purpose", "workflow"],
        recommendedMetadata: ["environment"],
        workflowExpectations: { minimumSteps: 1, explanatoryText: "expanded" },
        revisionExpectations: { recommended: false },
        expectedScreenshots: { perStep: true },
        guidancePriorities: ["Accessibility", "Screenshots", "Workflow", "Documentation"],
        positiveConfirmations: commonConfirmations,
        capabilities: ["learning", "explanation"]
      }),
    profile("quick-reference", "Quick Reference",
      "Concise instructions optimized for fast lookup.", {
        theme: { themeId: "minimal" },
        language: { tone: "concise" },
        recommendedSections: ["workflow"],
        recommendedMetadata: ["environment"],
        workflowExpectations: { minimumSteps: 1, explanatoryText: "concise" },
        revisionExpectations: { recommended: false },
        expectedScreenshots: { perStep: false },
        guidancePriorities: ["Workflow", "Documentation", "Screenshots"],
        positiveConfirmations: commonConfirmations,
        capabilities: ["quickLookup", "concise"]
      }),
    profile("troubleshooting-guide", "Troubleshooting Guide",
      "Diagnostic instructions with clear evidence and recovery steps.", {
        theme: { themeId: "corporate" },
        language: { tone: "diagnostic" },
        recommendedSections: ["purpose", "workflow"],
        recommendedMetadata: ["environment", "reviewer"],
        workflowExpectations: { minimumSteps: 1, explanatoryText: "diagnostic" },
        revisionExpectations: { recommended: true },
        expectedScreenshots: { perStep: true },
        guidancePriorities: ["Workflow", "Screenshots", "Metadata", "Revision History"],
        positiveConfirmations: commonConfirmations,
        capabilities: ["diagnosis", "recovery"]
      })
  ]);

  function createRegistry(values = []) {
    const profiles = values.map(normalize);
    const ids = new Set();
    profiles.forEach(value => {
      if (!value.profileId || ids.has(value.profileId)) {
        throw new Error(`Invalid or duplicate Document Profile: ${value.profileId}.`);
      }
      ids.add(value.profileId);
    });
    return semantic.deepFreeze({ profiles });
  }

  const BUILT_IN_REGISTRY = createRegistry(BUILT_IN_PROFILES);

  function get(registry, profileId) {
    return registry?.profiles?.find(value => value.profileId === profileId) || null;
  }

  function register(registry, value) {
    return createRegistry([...(registry?.profiles || []), value]);
  }

  function list(registry) {
    return semantic.deepFreeze([...(registry?.profiles || [])]);
  }

  return {
    BUILT_IN_PROFILES,
    BUILT_IN_REGISTRY,
    PROFILE_SCHEMA_VERSION,
    createRegistry,
    get,
    list,
    normalize,
    register
  };
});
