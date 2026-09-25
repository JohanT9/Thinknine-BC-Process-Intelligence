const sendKnowledgeAdmin = message => chrome.runtime.sendMessage(message);
let knowledgeAdminLocale = globalThis.T9UiI18n.DEFAULT_LOCALE;
const knowledgeAdminText = key => globalThis.T9UiI18n.translate(key, knowledgeAdminLocale);
const boundedText = (value, max = 240) => typeof value === "string" ? value.slice(0, max) : "";

function exportableDraft(draft) {
  const sourceRule = draft?.rule && typeof draft.rule === "object" ? draft.rule : {};
  const match = {};
  for (const key of ["pagePatterns", "actionPatterns", "fieldPatterns", "automationIdPatterns"]) {
    match[key] = Array.isArray(sourceRule.match?.[key])
      ? sourceRule.match[key].filter(value => typeof value === "string").map(value => value.slice(0, 300)) : [];
  }
  const validation = draft?.validation || {};
  return {
    draftId: boundedText(draft?.draftId), proposalId: boundedText(draft?.proposalId),
    targetPackId: boundedText(draft?.targetPackId, 80), status: "draft", active: false,
    rule: { ruleId: boundedText(sourceRule.ruleId, 80), taskType: boundedText(sourceRule.taskType, 100),
      semanticAction: boundedText(sourceRule.semanticAction, 100), entity: boundedText(sourceRule.entity, 100),
      priority: Number.isFinite(sourceRule.priority) ? sourceRule.priority : 0,
      confidence: Number.isFinite(sourceRule.confidence) ? sourceRule.confidence : 0,
      match, confidenceBasis: boundedText(sourceRule.confidenceBasis, 80), source: "local-review-feedback",
      requiresReview: true, autoActivation: false },
    sourceRules: Array.isArray(draft?.sourceRules)
      ? draft.sourceRules.filter(value => typeof value === "string").map(value => value.slice(0, 240)) : [],
    observationCount: Number.isInteger(draft?.observationCount) ? draft.observationCount : 0,
    confidenceBasis: boundedText(draft?.confidenceBasis, 80), createdAt: boundedText(draft?.createdAt, 40),
    validation: { status: ["valid", "warnings", "blocked", "unavailable"].includes(validation.status)
      ? validation.status : "unavailable", releaseId: boundedText(validation.releaseId, 160) || null,
    diagnostics: Array.isArray(validation.diagnostics) ? validation.diagnostics.map(item => ({
      code: boundedText(item?.code, 100), severity: item?.severity === "warning" ? "warning" : "error",
      subjectRef: boundedText(item?.subjectRef, 240)
    })) : [] }
  };
}

function appendProposal(container, proposal, drafts, knowledgePacks) {
  const card = document.createElement("article");
  card.className = "proposal";
  const heading = document.createElement("h3");
  heading.textContent = proposal.proposedRule?.ruleId || proposal.proposalId;
  const output = document.createElement("p");
  const rule = proposal.proposedRule;
  output.textContent = rule
    ? `${rule.taskType} · ${rule.semanticAction} · ${rule.entity || "—"} · ${proposal.observationCount}`
    : knowledgeAdminText("Conflicting feedback — no draft was created.");
  const details = document.createElement("details");
  const summary = document.createElement("summary");
  summary.textContent = knowledgeAdminText("Match details");
  const match = document.createElement("pre");
  match.textContent = JSON.stringify(proposal.match || {}, null, 2);
  details.append(summary, match);
  card.append(heading, output, details);
  if (rule) {
    const label = document.createElement("label");
    label.textContent = knowledgeAdminText("Target knowledge pack");
    const targetPack = document.createElement("select");
    targetPack.setAttribute("aria-label", knowledgeAdminText("Target knowledge pack"));
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = knowledgeAdminText("Choose a pack");
    targetPack.append(placeholder);
    knowledgePacks.forEach(pack => {
      const option = document.createElement("option");
      option.value = pack.packId;
      option.textContent = `${pack.name} (${pack.packId})`;
      targetPack.append(option);
    });
    if (!knowledgePacks.length) {
      const unavailable = document.createElement("p");
      unavailable.textContent = knowledgeAdminText("No active knowledge packs are available.");
      card.append(unavailable);
    }
    label.append(targetPack);
    const button = document.createElement("button");
    const alreadyDrafted = drafts.has(proposal.proposalId);
    button.type = "button";
    button.textContent = knowledgeAdminText(alreadyDrafted ? "Draft already created" : "Create draft");
    button.disabled = alreadyDrafted || knowledgePacks.length === 0;
    targetPack.disabled = alreadyDrafted || knowledgePacks.length === 0;
    targetPack.addEventListener("change", () => {
      button.disabled = alreadyDrafted || !targetPack.value;
    });
    button.addEventListener("click", async () => {
      button.disabled = true;
      const status = document.getElementById("draftStatus");
      try {
        const result = await sendKnowledgeAdmin({ type: "T9_CREATE_KNOWLEDGE_RULE_DRAFT",
          proposalId: proposal.proposalId, targetPackId: targetPack.value });
        if (!result?.ok) throw new Error(result?.reason || "draft-failed");
        status.textContent = knowledgeAdminText(result.draft?.validation?.status === "valid"
          ? "Draft created and validated. Active knowledge is unchanged."
          : "Draft created with validation issues. Active knowledge is unchanged.");
        await loadKnowledgeAdmin();
      } catch {
        status.textContent = knowledgeAdminText("Could not create draft.");
        button.disabled = !targetPack.value;
      }
    });
    card.append(label, button);
  }
  container.append(card);
}

function renderSavedDrafts(drafts, knowledgePacks) {
  const list = document.getElementById("savedDrafts");
  const download = document.getElementById("downloadDrafts");
  const summary = document.getElementById("draftSummary");
  list.replaceChildren();
  download.hidden = drafts.length === 0;
  summary.textContent = drafts.length
    ? globalThis.T9UiI18n.format("{count} inactive drafts are stored on this device.",
      { count: drafts.length }, knowledgeAdminLocale)
    : knowledgeAdminText("No drafts have been created.");
  drafts.forEach(draft => {
    const card = document.createElement("article");
    card.className = "proposal";
    const heading = document.createElement("h3");
    heading.textContent = draft.rule?.ruleId || draft.draftId;
    const validation = document.createElement("p");
    const validationStatus = draft.validation?.status || "unavailable";
    const validationText = {
      valid: "Validation: passed", warnings: "Validation: warnings",
      blocked: "Validation: blocked", unavailable: "Validation unavailable"
    }[validationStatus] || "Validation unavailable";
    validation.textContent = `${knowledgeAdminText(validationText)} · ${draft.targetPackId || "—"}`;
    const targetLabel = document.createElement("label");
    targetLabel.textContent = knowledgeAdminText("Target knowledge pack");
    const targetSelect = document.createElement("select");
    targetSelect.setAttribute("aria-label", knowledgeAdminText("Target knowledge pack"));
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = knowledgeAdminText("Choose a pack");
    targetSelect.append(placeholder);
    knowledgePacks.forEach(pack => {
      const option = document.createElement("option");
      option.value = pack.packId;
      option.textContent = `${pack.name} (${pack.packId})`;
      targetSelect.append(option);
    });
    if (!knowledgePacks.length) {
      const unavailable = document.createElement("p");
      unavailable.textContent = knowledgeAdminText("No active knowledge packs are available.");
      card.append(unavailable);
    }
    if (knowledgePacks.some(pack => pack.packId === draft.targetPackId)) {
      targetSelect.value = draft.targetPackId;
    }
    const validateButton = document.createElement("button");
    validateButton.type = "button";
    validateButton.textContent = knowledgeAdminText("Save pack and validate");
    validateButton.disabled = !targetSelect.value;
    targetSelect.addEventListener("change", () => {
      validateButton.disabled = !targetSelect.value;
    });
    validateButton.addEventListener("click", async () => {
      validateButton.disabled = true;
      try {
        const result = await sendKnowledgeAdmin({ type: "T9_SET_KNOWLEDGE_DRAFT_TARGET",
          draftId: draft.draftId, targetPackId: targetSelect.value });
        if (!result?.ok) throw new Error(result?.reason || "draft-validation-failed");
        document.getElementById("draftStatus").textContent = knowledgeAdminText(
          result.draft?.validation?.status === "valid"
            ? "Draft validated; active knowledge is unchanged."
            : "Draft validation found issues; active knowledge is unchanged.");
        await loadKnowledgeAdmin();
      } catch {
        document.getElementById("draftStatus").textContent = knowledgeAdminText("Could not validate the draft.");
        validateButton.disabled = !targetSelect.value;
      }
    });
    targetLabel.append(targetSelect);
    const detailDisclosure = document.createElement("details");
    const detailSummary = document.createElement("summary");
    detailSummary.textContent = knowledgeAdminText("Draft and validation details");
    const details = document.createElement("pre");
    details.textContent = JSON.stringify({ status: draft.status, active: draft.active,
      rule: draft.rule, match: draft.rule?.match, sourceRules: draft.sourceRules,
      observationCount: draft.observationCount, confidenceBasis: draft.confidenceBasis,
      createdAt: draft.createdAt, validation: draft.validation }, null, 2);
    detailDisclosure.append(detailSummary, details);
    card.append(heading, validation, targetLabel, validateButton, detailDisclosure);
    list.append(card);
  });
  download.onclick = () => {
    try {
      const packageData = { schemaVersion: 1, activeKnowledgeChanged: false,
        drafts: drafts.map(exportableDraft) };
      const url = URL.createObjectURL(new Blob([JSON.stringify(packageData, null, 2)],
        { type: "application/json" }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "bc-process-studio-knowledge-drafts.json";
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      document.getElementById("draftDownloadStatus").textContent =
        knowledgeAdminText("Draft package downloaded.");
    } catch {
      document.getElementById("draftDownloadStatus").textContent =
        knowledgeAdminText("Could not download draft package.");
    }
  };
}

async function loadKnowledgeAdmin() {
  const accessStatus = document.getElementById("accessStatus");
  const panel = document.getElementById("knowledgeAdmin");
  try {
    const response = await sendKnowledgeAdmin({ type: "T9_GET_KNOWLEDGE_ADMIN_DATA" });
    if (!response?.ok) throw new Error(response?.reason || "policy-required");
    panel.hidden = false;
    accessStatus.textContent = "";
    const feedback = response.knowledgeFeedback || {};
    const proposals = feedback.proposals || [];
    const ready = proposals.filter(item => item.status === "review-ready" && item.proposedRule);
    const conflicts = proposals.filter(item => item.status === "conflicting-feedback");
    const pending = proposals.filter(item => item.status === "needs-more-feedback");
    document.getElementById("feedbackCounts").textContent = globalThis.T9UiI18n.format(
      "Knowledge feedback: {ready} ready, {conflicts} conflicting, {pending} need more feedback.",
      { ready: ready.length, conflicts: conflicts.length, pending: pending.length }, knowledgeAdminLocale);
    const list = document.getElementById("suggestions");
    list.replaceChildren();
    const drafts = new Set((feedback.drafts || []).map(item => item.proposalId));
    const knowledgePacks = feedback.knowledgePacks || [];
    renderSavedDrafts(feedback.drafts || [], knowledgePacks);
    if (feedback.draftStorageStatus === "unsupported-schema") {
      const warning = document.createElement("p");
      warning.textContent = knowledgeAdminText("Draft storage has an unsupported version. No data was changed.");
      list.append(warning);
    }
    if (!ready.length && !conflicts.length) {
      const empty = document.createElement("p");
      empty.textContent = knowledgeAdminText("No review-ready knowledge suggestions.");
      list.append(empty);
    }
    ready.forEach(proposal => appendProposal(list, proposal, drafts, knowledgePacks));
    conflicts.forEach(proposal => appendProposal(list, proposal, drafts, knowledgePacks));
  } catch {
    panel.hidden = true;
    accessStatus.textContent = knowledgeAdminText("Knowledge administration is restricted to application administrators.");
  }
}

async function startKnowledgeAdmin() {
  try {
    const response = await sendKnowledgeAdmin({ type: "T9_GET_SETTINGS" });
    knowledgeAdminLocale = globalThis.T9UiI18n.apply(response?.settings?.uiLocale);
  } catch {
    knowledgeAdminLocale = globalThis.T9UiI18n.apply(knowledgeAdminLocale);
  }
  document.title = knowledgeAdminText("Knowledge administration");
  await loadKnowledgeAdmin();
}

startKnowledgeAdmin();
