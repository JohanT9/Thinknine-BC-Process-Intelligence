(function (root, factory) {
  const semantic = typeof module === "object" && module.exports
    ? require("../document/semantic-interaction-engine")
    : root.T9SemanticInteractionEngine;
  const knowledge = typeof module === "object" && module.exports
    ? require("./knowledge-domain") : root.T9KnowledgeDomain;
  const refs = typeof module === "object" && module.exports
    ? require("./source-reference") : root.T9SourceReference;
  const processAnalysis = typeof module === "object" && module.exports
    ? require("./process-analysis-model") : root.T9ProcessAnalysisModel;
  const api = factory(semantic, knowledge, refs, processAnalysis);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9SessionInterpretationPipeline = api;
})(typeof globalThis !== "undefined" ? globalThis : this,
function (semantic, knowledge, refs, processAnalysis) {
  "use strict";
  const VERSION = "1.3.0";
  const unique = values => [...new Set((values || []).filter(Boolean))];

  function eventIndex(events = []) {
    const byCanonicalId = new Map();
    events.forEach(event => {
      if (event.canonicalSourceEventId) byCanonicalId.set(
        event.canonicalSourceEventId, event);
    });
    return byCanonicalId;
  }

  function context(action, sourceEvents) {
    const primary = sourceEvents.at(-1) || {};
    return { currentPageCaption: action.pageCaption || primary.pageCaption || "",
      currentPageIdentity: action.pageIdentity ||
        primary.identification?.pageIdentity?.pageIdentity || "",
      currentPageObjectId: action.pageObjectId ||
        primary.identification?.pageIdentity?.pageObjectId || "",
      pageIdentificationSource: action.pageIdentificationSource ||
        primary.identification?.pageIdentity?.source || "",
      pageIdentificationConfidence: action.pageConfidence ??
        primary.identification?.pageIdentity?.confidence ?? null,
      previousPageCaption: primary.context?.previousPageCaption || "",
      currentEntity: action.entity || primary.identification?.pageIdentity?.entity || "",
      followingEntity: primary.context?.followingEntity || "",
      pendingSemanticHint: action.actionType || "" };
  }

  function task(action, index, eventsById, screenshots = {}) {
    const sourceEvents = (action.sourceEventIds || []).map(id =>
      eventsById.get(id)).filter(Boolean);
    const eventNos = unique(sourceEvents.map(event => event.eventNo));
    const preferredEventNo = eventsById.get(action.preferredSourceEventId)?.eventNo;
    const screenshot = screenshots[preferredEventNo] || action.preferredScreenshotRef ||
      [...eventNos].reverse().map(no => screenshots[no]).find(Boolean) ||
      action.screenshotRefs?.at(-1) || null;
    const trace = refs.normalize({ recordingId: action.recordingId,
      sourceEventIds: action.sourceEventIds,
      normalizedEventIds: action.normalizedEventIds,
      stepGroupIds: action.stepGroupIds, semanticActionIds: [action.actionId] });
    const actionTask = /Action|Dialog/u.test(String(action.actionType || ""));
    const observedActionCaption = action.actionCaption ||
      [...(action.rawInteractions || [])].reverse()
        .map(interaction => interaction.actionCaption).find(Boolean) ||
      (actionTask ? action.targetField : "");
    const page = action.pageIdentification || sourceEvents.at(-1)?.identification?.pageIdentity || {};
    const control = [...sourceEvents].reverse().map(event => event.controlIdentification ||
      event.identification?.controlIdentity || {}).find(value => value.controlId || value.fieldId ||
        value.automationId) || {};
    return { taskId: `${action.actionType || "Task"}:${refs.stableIdentity(trace)}`,
      taskNo: index + 1, taskType: action.actionType || "Unclassified",
      semanticAction: action.actionType || "", semanticActionModel: action,
      ...(Array.isArray(action.actionPath)
        ? { actionPath: [...action.actionPath] } : {}),
      capturePackets: (action.capturePackets || []).map(value => ({ ...value })),
      ...(action.capturePacket ? { capturePacket: { ...action.capturePacket } } : {}),
      ...(action.interactionIds?.length ? {
        interactionIds: [...action.interactionIds],
        interactionId: action.interactionId || null
      } : {}),
      instruction: action.displayText || "", description: action.displayText || "",
      pageId: action.pageId || "", pageObjectId: action.pageObjectId || "",
      pageIdentity: action.pageIdentity || "",
      pageCaption: action.pageCaption || "",
      pageIdentification: action.pageIdentification ?
        { ...action.pageIdentification } : {},
      knowledgeObjectRef: { appId: page.appId || page.applicationId || null,
        publisher: page.publisher || null, objectType: "page",
        objectId: page.pageObjectId || action.pageObjectId ||
          sourceEvents.at(-1)?.identification?.pageIdentity?.pageObjectId || null,
        appVersion: page.appVersion || null },
      knowledgeControlRef: { controlId: control.controlId || null,
        automationId: control.automationId || null, fieldId: control.fieldId || null },
      actionCaption: observedActionCaption || "",
      fieldCaption: actionTask ? "" : action.targetField || "",
      selectedCaption: action.selectedValue || "",
      value: typeof action.checked === "boolean"
        ? action.checked : action.selectedValue ?? "",
      instructionValue: typeof action.checked === "boolean"
        ? action.checked : action.selectedValue ?? "",
      ...(typeof action.checked === "boolean"
        ? { checked: action.checked } : {}),
      sourceEventNos: eventNos,
      ...trace, screenshot, screenshots: screenshot ? [screenshot] : [],
      captureGuidance: { ...(action.captureGuidance || {}) },
      ...(action.resultVerification ? {
        resultVerification: { ...action.resultVerification },
        observedResult: action.resultVerification.summary || "",
        expectedResultSuggestion:
          action.resultVerification.expectedResultSuggestion || "",
        resultVerified: ["verified", "error"].includes(
          action.resultVerification.status)
      } : {}),
      important: Boolean(action.captureGuidance?.important),
      sectionBoundaryAfter: Boolean(action.captureGuidance?.sectionBoundaryAfter),
      context: context(action, sourceEvents), automationId: "",
      reviewStatus: action.confidence < 0.85 ? "review-suggested" : "unreviewed",
      confidence: action.confidence || 0.55 };
  }

  function applyRepositoryResolutions(tasks, repository, releaseId) {
    if (!repository?.resolveAction) return tasks;
    const resolutions = tasks.map(task => {
      const objectRef = task.knowledgeObjectRef || {};
      const controlRef = task.knowledgeControlRef || {};
      const object = repository.lookupObject(objectRef, releaseId);
      const control = repository.resolveControl({ objectRef, controlRef, releaseId });
      const action = objectRef.objectId && object.status === "resolved"
        ? repository.resolveAction({ objectRef, controlRef,
        context: { pageCaption: task.pageCaption || task.context?.currentPageCaption || "",
          actionCaption: task.actionCaption || "", fieldCaption: task.fieldCaption || "",
          currentEntity: task.context?.currentEntity || "",
          pendingSemanticHint: task.semanticActionModel?.actionType || "" } }, releaseId)
        : { status: "unresolved", selectedCandidateId: null, candidates: [] };
      return { task, object, control, action };
    });
    return tasks.map(task => {
      const sourceIds = new Set(task.sourceEventIds || []);
      const relevant = resolutions.filter(item => (item.task.sourceEventIds || []).some(id => sourceIds.has(id)));
      const candidates = relevant.flatMap(item => item.action.candidates || []);
      const distinct = [...new Map(candidates.map(candidate => [candidate.candidateId, candidate])).values()];
      const outputs = new Set(distinct.map(candidate => `${candidate.taskType}\u001f${candidate.semanticAction}\u001f${candidate.entity}`));
      const status = relevant.some(item => item.action.status === "ambiguous") || outputs.size > 1
        ? "ambiguous" : distinct.length ? "resolved" : "unresolved";
      const selected = status === "resolved" ? distinct.sort((a, b) =>
        a.candidateId.localeCompare(b.candidateId))[0] : null;
      const matched = selected && relevant.find(item => (item.action.candidates || [])
        .some(candidate => candidate.candidateId === selected.candidateId));
      const resolution = { status, selectedCandidateId: selected?.candidateId || null,
        candidates: distinct, object: matched?.object || relevant[0]?.object || null,
        control: matched?.control || relevant[0]?.control || null };
      if (!selected) return { ...task, knowledgeResolution: resolution };
      const ruleId = selected.provenance?.ruleId || "";
      const pack = matched && repository.getRelease(releaseId)?.packs.find(item =>
        item.packId === selected.provenance.packId);
      const rule = pack?.rules.find(item => item.ruleId === ruleId);
      return { ...task, taskType: selected.taskType, semanticAction: selected.semanticAction,
        entity: selected.entity, knowledgeRule: ruleId,
        knowledgePackId: selected.provenance.packId,
        knowledgePackVersion: selected.provenance.packVersion,
        knowledgeReleaseId: selected.provenance.knowledgeReleaseId,
        confidence: Number.isFinite(selected.confidence) ? selected.confidence : task.confidence,
        reviewSuggested: Number.isFinite(selected.confidence)
          ? selected.confidence < 0.85 : task.reviewSuggested,
        knowledgeResolution: resolution,
        ...(rule?.instructionTemplate ? { instruction: rule.instructionTemplate,
          description: rule.instructionTemplate } : {}) };
    });
  }

  function applyReleaseFindings(result, input) {
    const analysis = processAnalysis.build({
      recordingId: input.session?.id, pipelineVersion: VERSION,
      normalizedEvents: result.normalizedEvents, stepGroups: result.stepGroups,
      semanticActions: result.semanticActions, businessTasks: result.businessTasks,
      consolidationDecisions: result.consolidationDecisions,
      supportingEvents: input.supportingEvents,
      languagePolicy: input.languagePolicy,
      groupingDiagnostics: input.groupingDiagnostics
    });
    const findings = [
      ...(analysis.qualityGate?.findings || []),
      ...(analysis.contradictionAnalysis?.findings || [])
    ];
    const byTask = new Map();
    const add = (taskId, finding) => {
      if (!taskId) return;
      if (!byTask.has(taskId)) byTask.set(taskId, []);
      byTask.get(taskId).push(finding);
    };
    findings.forEach(finding => {
      if (finding.subjectType === "task") {
        add(String(finding.subjectId || ""), finding);
        return;
      }
      if (finding.subjectType === "step-group") {
        result.businessTasks.forEach(task => {
          if ((task.stepGroupIds || []).map(String).includes(
            String(finding.subjectId || ""))) add(task.taskId, finding);
        });
      }
    });
    const businessTasks = result.businessTasks.map(task => {
      const taskFindings = byTask.get(String(task.taskId || "")) || [];
      if (!taskFindings.length) return task;
      const codes = [...new Set(taskFindings.map(finding => finding.code))];
      const blocked = taskFindings.some(finding => finding.severity === "block");
      return { ...task, reviewSuggested: true,
        reviewStatus: task.approved ? task.reviewStatus : "review-suggested",
        processValidation: { status: blocked ? "blocked" : "review-required",
          codes, findingCount: taskFindings.length } };
    });
    return { ...result, businessTasks, processAnalysis: analysis };
  }

  function interpret(input = {}, services = {}) {
    const groups = input.stepGroups || [];
    const activeGroups = groups.filter(group => !group.guidance?.ignored);
    const actions = semantic.processStepGroups(activeGroups);
    const byId = eventIndex(input.events);
    const baseTasks = actions.filter(action => !action.hidden)
      .map((action, index) => task(action, index, byId, input.imagePaths));
    const knowledgeResult = knowledge.apply(baseTasks, input.knowledgePacks || []);
    const repositoryTasks = applyRepositoryResolutions(knowledgeResult.tasks,
      input.knowledgeRepository, input.knowledgeReleaseId);
    const tasks = repositoryTasks.map((value, index) => ({
      ...value, taskNo: index + 1,
      taskId: `${value.taskType || "Task"}:${refs.stableIdentity(value)}`,
      ...(!value.screenshot ? (() => {
        const evidence = new Set(value.sourceEventIds || []);
        const source = baseTasks.find(candidate => (candidate.sourceEventIds || [])
          .some(id => evidence.has(id)) && candidate.screenshot);
        return source ? { screenshot: source.screenshot,
          screenshots: [...source.screenshots] } : {};
      })() : {})
    }));
    const consolidationDecisions = (knowledgeResult.consolidationDecisions || [])
      .map(decision => ({ ...decision,
        outputTaskId: decision.outputIndex == null
          ? null : tasks[decision.outputIndex]?.taskId || null }));
    const placeholderCount = tasks.filter(value =>
      value.taskType === "Unclassified" &&
      (!String(value.instruction || "").trim() ||
        String(value.instruction).trim() === "Utför uppgiften.")).length;
    const placeholderDominated = placeholderCount >= 3 &&
      placeholderCount / tasks.length >= 0.25;
    if (placeholderDominated &&
        typeof services.compatibilityInterpret === "function") {
      const compatibility = services.compatibilityInterpret(input);
      if (compatibility?.businessTasks?.length) {
        const result = { ...compatibility, pipelineVersion: VERSION,
          normalizedEvents: input.normalizedEvents || [], stepGroups: groups,
          semanticActions: actions,
          consolidationDecisions,
          compatibilityMode: "legacy-placeholder-dominated" };
        return applyReleaseFindings(result, input);
      }
    }
    const entityNodes = services.entityMemory?.build(
      input.normalizedEvents?.length ? input.normalizedEvents : input.events || []
    ) || [];
    const sessionGraph = services.sessionGraph?.build(input.session, tasks,
      entityNodes) || { nodes: [], edges: [] };
    const confidenceResult = services.confidence?.evaluate(tasks, sessionGraph) ||
      { tasks, sessionConfidence: 0, knowledgeMatchPercent: 0,
        graphCoveragePercent: 0, reviewSuggestedCount: 0 };
    const result = { pipelineVersion: VERSION, normalizedEvents: input.normalizedEvents || [],
      stepGroups: groups, semanticActions: actions, interpretedSteps: actions,
      businessSteps: actions, businessTasks: confidenceResult.tasks,
      consolidationDecisions,
      sessionGraph, confidenceResult, unmatchedKnowledgeItems: knowledgeResult.unmatched,
      contextEvents: input.events || [], contextCandidates: [] };
    return applyReleaseFindings(result, input);
  }
  return { VERSION, applyReleaseFindings, interpret };
});
