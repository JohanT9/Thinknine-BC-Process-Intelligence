(function (root, factory) {
  const dataset = typeof module === "object" && module.exports
    ? require("./process-improvement-dataset") : root.T9ProcessImprovementDataset;
  const knowledgeFeedback = typeof module === "object" && module.exports
    ? require("./knowledge-feedback-learning") : root.T9KnowledgeFeedbackLearning;
  const api = factory(dataset, knowledgeFeedback);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9ProcessImprovementService = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (dataset, knowledgeFeedback) {
  "use strict";
  const VERSION = "1.0.0";
  const DRAFTS_KEY = "t9_knowledge_rule_drafts";
  const object = value => value && typeof value === "object" && !Array.isArray(value);
  function draftCollection(stored) {
    if (stored[DRAFTS_KEY] === undefined) return { ok: true, value: { version: 1, drafts: [] } };
    const value = stored[DRAFTS_KEY];
    if (!object(value) || value.version !== 1 || !Array.isArray(value.drafts) ||
        value.drafts.some(draft => !object(draft))) {
      return { ok: false, value: null };
    }
    return { ok: true, value };
  }
  async function inspectDraft(draft, validateDraft) {
    try {
      return validateDraft ? await validateDraft(draft) : {
        status: "unavailable", releaseId: null,
        diagnostics: [{ code: "knowledge-release-unavailable", severity: "error" }]
      };
    } catch {
      return { status: "unavailable", releaseId: null,
        diagnostics: [{ code: "knowledge-draft-validation-failed", severity: "error" }] };
    }
  }

  function create(options = {}) {
    const storage = options.storage;
    const reviewPrefix = String(options.reviewPrefix || "");
    const validateDraft = typeof options.validateDraft === "function" ? options.validateDraft : null;
    if (!storage?.get || !reviewPrefix) {
      throw new TypeError("Process improvement storage and review prefix are required.");
    }
    let draftQueue = Promise.resolve();
    async function readReviews() {
      const stored = await storage.get(null);
      return { stored: stored || {}, reviews: Object.entries(stored || {})
        .filter(([key, value]) => key.startsWith(reviewPrefix) &&
          value && typeof value === "object")
        .map(([, value]) => value) };
    }
    return Object.freeze({
      async read(options = {}) {
        const { stored, reviews } = await readReviews();
        const result = { serviceVersion: VERSION,
          reviewCount: reviews.length, dataset: dataset.create(reviews) };
        if (options.includeKnowledgeFeedback === true) {
          const feedback = knowledgeFeedback.create(reviews);
          const collection = draftCollection(stored);
          const drafts = collection.ok ? await Promise.all(collection.value.drafts.map(async draft => ({
            ...draft,
            validation: await inspectDraft(draft, validateDraft)
          }))) : [];
          result.knowledgeFeedback = Object.freeze({ ...feedback,
            draftStorageStatus: collection.ok ? "supported" : "unsupported-schema",
            knowledgePacks: Object.freeze(Array.isArray(options.knowledgePacks)
              ? options.knowledgePacks.map(pack => ({ packId: pack.packId, name: pack.name })) : []),
            drafts: Object.freeze(drafts) });
        }
        return Object.freeze(result);
      },
      async createDraft(proposalId, targetPackId, now = () => new Date().toISOString()) {
        if (!storage?.set) return { ok: false, reason: "storage-write-unavailable" };
        const operation = draftQueue.then(async () => {
          const { stored, reviews } = await readReviews();
          const currentCollection = draftCollection(stored);
          if (!currentCollection.ok) return { ok: false, reason: "unsupported-draft-schema" };
          const proposal = knowledgeFeedback.create(reviews).proposals.find(item =>
            item.proposalId === String(proposalId || "") && item.status === "review-ready" &&
            item.proposedRule?.requiresReview === true && item.proposedRule?.autoActivation === false);
          if (!proposal) return { ok: false, reason: "proposal-not-review-ready" };
          if (typeof targetPackId !== "string" || !/^[a-z0-9][a-z0-9._-]*$/.test(targetPackId)) {
            return { ok: false, reason: "target-pack-required" };
          }
          const collection = currentCollection.value;
          if (collection.drafts.some(item => item.proposalId === proposal.proposalId)) {
            return { ok: true, alreadyCreated: true,
              draft: collection.drafts.find(item => item.proposalId === proposal.proposalId) };
          }
          const draft = Object.freeze({ draftId: `draft:${proposal.proposalId}`,
            proposalId: proposal.proposalId, rule: proposal.proposedRule,
            targetPackId,
            sourceRules: proposal.sourceRules,
            observationCount: proposal.observationCount,
            confidenceBasis: "repeat-count-heuristic-v1", status: "draft",
            active: false, createdAt: now() });
          const validation = await inspectDraft(draft, validateDraft);
          const storedDraft = Object.freeze({ ...draft, validation });
          await storage.set({ [DRAFTS_KEY]: { version: 1,
            drafts: [...collection.drafts, storedDraft] } });
          return { ok: true, draft: storedDraft };
        });
        draftQueue = operation.catch(() => {});
        return operation;
      },
      async setDraftTarget(draftId, targetPackId) {
        if (!storage?.set) return { ok: false, reason: "storage-write-unavailable" };
        if (typeof targetPackId !== "string" || !/^[a-z0-9][a-z0-9._-]*$/.test(targetPackId)) {
          return { ok: false, reason: "target-pack-required" };
        }
        const operation = draftQueue.then(async () => {
          const { stored } = await readReviews();
          const collection = draftCollection(stored);
          if (!collection.ok) return { ok: false, reason: "unsupported-draft-schema" };
          const index = collection.value.drafts.findIndex(item => item.draftId === String(draftId || ""));
          if (index < 0) return { ok: false, reason: "draft-not-found" };
          const current = collection.value.drafts[index];
          const updated = { ...current, targetPackId };
          updated.validation = await inspectDraft(updated, validateDraft);
          const drafts = collection.value.drafts.slice();
          drafts[index] = updated;
          await storage.set({ [DRAFTS_KEY]: { version: 1, drafts } });
          return { ok: true, draft: updated };
        });
        draftQueue = operation.catch(() => {});
        return operation;
      }
    });
  }

  return { VERSION, create };
});
