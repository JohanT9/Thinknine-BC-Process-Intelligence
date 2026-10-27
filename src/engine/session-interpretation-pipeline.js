(function (root, factory) {
  const semantic = typeof module === "object" && module.exports
    ? require("../document/semantic-interaction-engine")
    : root.T9SemanticInteractionEngine;
  const knowledge = typeof module === "object" && module.exports
    ? require("./knowledge-domain") : root.T9KnowledgeDomain;
  const refs = typeof module === "object" && module.exports
    ? require("./source-reference") : root.T9SourceReference;
  const taskVisibility = typeof module === "object" && module.exports
    ? require("../review/task-visibility") : root.T9ReviewTaskVisibility;
  const processAnalysis = typeof module === "object" && module.exports
    ? require("./process-analysis-model") : root.T9ProcessAnalysisModel;
  const api = factory(semantic, knowledge, refs, taskVisibility, processAnalysis);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9SessionInterpretationPipeline = api;
})(typeof globalThis !== "undefined" ? globalThis : this,
function (semantic, knowledge, refs, taskVisibility, processAnalysis) {
  "use strict";
  const VERSION = "1.3.0";
  const unique = values => [...new Set((values || []).filter(Boolean))];

  function isPlaceholderDominated(tasks = []) {
    const values = Array.isArray(tasks) ? tasks : [];
    const placeholders = values.filter(value =>
      value.taskType === "Unclassified" && taskVisibility.isGenericInstruction(
        value.instruction || value.description || "")).length;
    return values.length > 0 && placeholders >= 3 &&
      placeholders / values.length >= 0.25;
  }

  function eventIndex(events = []) {
    const byCanonicalId = new Map();
    events.forEach(event => {
      if (event.canonicalSourceEventId) byCanonicalId.set(
        event.canonicalSourceEventId, event);
    });
    return byCanonicalId;
  }

  function relatedScreenshotCaption(eventNo, eventGap, language = "en-US") {
    const messages = {
      "sv-SE": "Relaterad sidbild från senare i flödet (händelse {event}, {gap} händelser senare)",
      "en-US": "Related page capture from later in the flow (event {event}, {gap} events later)",
      "fr-FR": "Capture de page associée, prise plus tard dans le flux (événement {event}, {gap} événements après)",
      "de-DE": "Zugehöriger Seitenstand aus dem späteren Ablauf (Ereignis {event}, {gap} Ereignisse später)",
      "es-ES": "Captura de página relacionada posterior en el flujo (evento {event}, {gap} eventos después)",
      "da-DK": "Relateret sidebillede fra et senere trin (hændelse {event}, {gap} hændelser senere)",
      "fi-FI": "Liittyvä sivunäkymä myöhemmästä vaiheesta (tapahtuma {event}, {gap} tapahtumaa myöhemmin)",
      "nb-NO": "Relatert sidebilde fra et senere trinn (hendelse {event}, {gap} hendelser senere)"
    };
    const template = messages[language] || messages[String(language).split("-")[0]] ||
      messages["en-US"];
    return template.replace("{event}", String(eventNo))
      .replace("{gap}", String(eventGap));
  }

  function subsequentPageScreenshot(task, screenshots, maxEventGap = 10,
    language = "en-US") {
    if (!task || !screenshots || !/^(?:SearchAndOpenPage|Navigate|OpenPage)$/u
      .test(String(task.taskType || task.semanticAction || ""))) return null;
    const sourceNos = (task.sourceEventNos || []).map(Number)
      .filter(Number.isSafeInteger);
    if (!sourceNos.length) return null;
    const lastSourceNo = Math.max(...sourceNos);
    const screenshotEventNo = Object.keys(screenshots).map(Number)
      .filter(eventNo => Number.isSafeInteger(eventNo) &&
        eventNo > lastSourceNo && eventNo - lastSourceNo <= maxEventGap &&
        screenshots[eventNo])
      .sort((a, b) => a - b)[0];
    if (!screenshotEventNo) return null;
    return { screenshot: screenshots[screenshotEventNo],
      screenshotEvidence: { eventNo: screenshotEventNo,
        screenshotRef: screenshots[screenshotEventNo],
        relation: "subsequent-captured-page-state",
        eventGap: screenshotEventNo - lastSourceNo,
        caption: relatedScreenshotCaption(screenshotEventNo,
          screenshotEventNo - lastSourceNo, language) } };
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
    const actionTask = /Action|Dialog|SearchAndOpenPage/u.test(String(action.actionType || ""));
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
      actionCaption: observedActionCaption || "",
      pageId: action.pageId || "", pageObjectId: action.pageObjectId || "",
      pageIdentity: action.pageIdentity || "",
      pageCaption: action.pageCaption || "",
      pageIdentification: action.pageIdentification ?
        { ...action.pageIdentification } : {},
      ...(page.entity ? { entity: page.entity } : {}),
      ...(Number.isFinite(Number(page.confidence)) ? {
        pageIdentificationConfidence: Number(page.confidence)
      } : {}),
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
      confidence: Number.isFinite(action.confidence)
        ? Math.max(0, Math.min(1, action.confidence)) : 0.55 };
  }

  function applyRepositoryResolutions(tasks, repository, releaseId, inputLanguage = "") {
    if (!repository?.resolveAction) return tasks;
    const resolutions = tasks.map(task => {
      const objectRef = task.knowledgeObjectRef || {};
      const controlRef = task.knowledgeControlRef || {};
      const object = repository.lookupObject(objectRef, releaseId);
      const control = repository.resolveControl({ objectRef, controlRef, releaseId });
      const action = objectRef.objectId && object.status === "resolved"
        ? repository.resolveAction({ objectRef, controlRef,
        language: task.language || task.context?.language || inputLanguage || "en-US",
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
      const status = relevant.some(item => item.action.status === "ambiguous") ||
        outputs.size > 1 || distinct.length > 1
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
      const explanationContext = { ...task, entity: selected.entity,
        knowledgePageCaption: task.pageCaption || task.context?.currentPageCaption || "",
        actionCaption: task.actionCaption || "",
        language: selected.provenance?.language || task.language ||
          task.context?.language || inputLanguage || "en-US" };
      const instruction = knowledge.localizedInstruction(rule,
        explanationContext.language);
      const contextualInstruction = knowledge.contextualInstruction?.(rule,
        explanationContext) || "";
      return { ...task, taskType: selected.taskType, semanticAction: selected.semanticAction,
        entity: selected.entity, knowledgeRule: ruleId,
        knowledgePackId: selected.provenance.packId,
        knowledgePackVersion: selected.provenance.packVersion,
        knowledgeReleaseId: selected.provenance.knowledgeReleaseId,
        confidence: Number.isFinite(selected.confidence) ? selected.confidence : task.confidence,
        reviewSuggested: Number.isFinite(selected.confidence)
          ? selected.confidence < 0.85 : task.reviewSuggested,
        knowledgeResolution: resolution,
        ...(contextualInstruction ? { contextualInstruction,
          instruction: contextualInstruction, description: contextualInstruction,
          semanticActionModel: task.semanticActionModel ? {
            ...task.semanticActionModel, displayText: contextualInstruction
          } : task.semanticActionModel } : {}),
        ...(() => {
          return { ...(instruction ? { userDirective: instruction,
            userDirectiveSourceIds: [...(rule.sourceIds || [])] } : {
              userDirective: undefined, userDirectiveSourceIds: [] }),
          ...(knowledge.explanationEligible(rule, explanationContext, [rule]) ? {
            contextualExplanations: { ...knowledge.localizedExplanations(rule,
              explanationContext) },
            contextualExplanationRuleId: rule.ruleId,
            contextualExplanationConfidence: Number(rule.confidence),
            contextualExplanationSourceIds: [...(rule.sourceIds || [])],
            contextualExplanationSources: (rule.sourceIds || []).map(sourceId =>
              pack?.sources?.find(source => source.sourceId === sourceId))
              .filter(Boolean).map(source => ({ sourceId: source.sourceId,
                title: source.title, sourceUri: source.sourceUri }))
          } : {}) };
        })() };
    });
  }

  function enrichCompatibilityExplanations(tasks = [], packs = []) {
    const available = knowledge.rules(packs);
    const semanticCaptions = { ReleaseDocument: "Release",
      ReopenDocument: "Reopen", PostDocument: "Post" };
    return tasks.map(task => {
      const model = task.semanticActionModel || {};
      const raw = model.rawInteractions || [];
      const observedAction = [...raw].reverse().map(item =>
        item.actionCaption || item.accessibleName || item.label || "")
        .find(Boolean);
      const fieldEvidence = raw.some(item => item.kind === "field-edit")
        ? raw.filter(item => item.kind === "field-edit") : raw;
      const observedField = [...fieldEvidence].reverse().map(item => item.fieldCaption ||
        item.targetControl?.accessibleName || item.targetControl?.caption ||
        item.controlIdentification?.caption || "").find(Boolean);
      const observedPage = [...raw].reverse().map(item =>
        item.pageCaption || item.pageContext?.pageCaption || "").find(Boolean);
      const pageCaption = task.pageCaption || model.pageCaption || observedPage || "";
      const semanticAction = task.semanticAction || model.actionType || task.taskType;
      const actionCaption = task.actionCaption || observedAction ||
        semanticCaptions[semanticAction] || "";
      // Older recordings may retain the edited field caption but have no
      // action caption for a field edit. Let the field-specific matcher use
      // that evidence instead of dropping the step before rule evaluation.
      if (!pageCaption || (!actionCaption && !task.fieldCaption &&
          !observedField && !task.automationId)) {
        return task;
      }
      const baseCandidate = { ...task, pageCaption, actionCaption, semanticAction,
        context: { ...(task.context || {}),
          currentPageCaption: task.context?.currentPageCaption || pageCaption,
          currentEntity: task.entity || task.context?.currentEntity || "" } };
      const candidates = [...new Set([task.fieldCaption, observedField]
        .filter(Boolean))].map(fieldCaption => knowledge.pageEvidence({
        ...baseCandidate, fieldCaption }, packs));
      if (!candidates.length) candidates.push(knowledge.pageEvidence(baseCandidate,
        packs));
      const match = candidates.map(candidate => ({ candidate,
        found: knowledge.match(candidate, available) })).find(item => item.found &&
        knowledge.explanationEligible(item.found.rule, item.candidate, available));
      if (!match) {
        return task;
      }
      const { candidate, found } = match;
      const rule = found.rule;
      return { ...task,
        contextualExplanations: { ...knowledge.localizedExplanations(rule,
          candidate) },
        contextualExplanationRuleId: rule.ruleId,
        contextualExplanationConfidence: Number(rule.confidence),
        contextualExplanationSourceIds: [...(rule.sourceIds || [])],
        contextualExplanationSources: rule.sourceRefs.map(source => ({
          sourceId: source.sourceId, title: source.title,
          sourceUri: source.sourceUri
        })) };
    });
  }

  function applyReleaseFindings(result, input) {
    const baseAnalysis = processAnalysis.build({
      recordingId: input.session?.id, pipelineVersion: VERSION,
      normalizedEvents: result.normalizedEvents, stepGroups: result.stepGroups,
      semanticActions: result.semanticActions, businessTasks: result.businessTasks,
      consolidationDecisions: result.consolidationDecisions,
      supportingEvents: input.supportingEvents,
      languagePolicy: input.languagePolicy,
      groupingDiagnostics: input.groupingDiagnostics
    });
    const analysis = { ...baseAnalysis,
      qualityGate: { ...baseAnalysis.qualityGate,
        findings: [...(baseAnalysis.qualityGate?.findings || [])],
        counts: { ...(baseAnalysis.qualityGate?.counts || {}) } },
      decisions: { ...baseAnalysis.decisions,
        stepGroups: [...(baseAnalysis.decisions?.stepGroups || [])] } };
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
    const unresolvedGroups = new Map((analysis.decisions?.stepGroups || [])
      .filter(decision => decision.outcome === "unresolved")
      .map(decision => [String(decision.subjectId), decision]));
    for (const finding of findings) {
      if (finding.subjectType !== "step-group") continue;
      const id = String(finding.subjectId || "");
      unresolvedGroups.delete(id);
    }
    const groups = result.stepGroups || [];
    unresolvedGroups.forEach((decision, groupId) => {
      const group = groups.find(value => String(value.stepGroupId || "") === groupId);
      if (!group || group.guidance?.ignored || group.status === "ignored") return;
      const meaningful = (group.normalizedEvents || []).filter(event =>
        !["status-message", "dialog-open", "dialog-close", "navigation"]
          .includes(event.kind));
      if (!meaningful.length) return;
      const finding = { code: "BCPS-PROCESS-GUARD-COVERAGE-001",
        severity: "review", subjectType: "step-group", subjectId: groupId,
        evidenceRefs: [...(group.sourceEventIds || [])],
        details: { invariant: "meaningful-observed-group-must-be-explained",
          eventKinds: meaningful.map(event => event.kind),
          reasonCode: decision.reasonCode },
        provenance: { authorship: "derived", source: "session-interpretation-pipeline" } };
      analysis.qualityGate.findings.push(finding);
      analysis.qualityGate.counts.review += 1;
      analysis.qualityGate.counts.total += 1;
      if (analysis.qualityGate.status === "passed") analysis.qualityGate.status = "review-required";
      analysis.decisions.stepGroups = analysis.decisions.stepGroups.map(value =>
        String(value.subjectId) === groupId ? { ...value,
          decisionCodes: [...(value.decisionCodes || []),
          { code: "BCPS-PROCESS-COVERAGE-001", outcome: "unresolved",
            domain: "coverage", registryVersion: "1.0.0" }] } : value);
    });
    analysis.releaseGate = { ...baseAnalysis.releaseGate,
      status: analysis.qualityGate.counts.blocked ? "blocked" :
        analysis.qualityGate.counts.review ? "review-required" :
          baseAnalysis.releaseGate.status,
      reviewFindingCount: analysis.qualityGate.counts.review +
        (baseAnalysis.contradictionAnalysis?.counts?.review || 0),
      blockingFindingCount: analysis.qualityGate.counts.blocked +
        (baseAnalysis.contradictionAnalysis?.counts?.blocked || 0) };
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
      .map((action, index) => ({ ...task(action, index, byId, input.imagePaths),
        language: input.language || input.session?.language || "en-US" }));
    const knowledgeResult = knowledge.apply(baseTasks, input.knowledgePacks || []);
    const repositoryTasks = applyRepositoryResolutions(knowledgeResult.tasks,
      input.knowledgeRepository, input.knowledgeReleaseId, input.language ||
        input.session?.language || "en-US");
    const tasks = repositoryTasks.map((value, index) => ({
      ...value, taskNo: index + 1,
      taskId: `${value.taskType || "Task"}:${refs.stableIdentity(value)}`,
      ...(!value.screenshot ? subsequentPageScreenshot(value,
        input.imagePaths, 10, input.language || input.session?.language ||
          "en-US") || {} : {}),
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
    if (isPlaceholderDominated(tasks) &&
        typeof services.compatibilityInterpret === "function") {
      const compatibility = services.compatibilityInterpret(input);
      if (compatibility?.businessTasks?.length) {
        const result = { ...compatibility, businessTasks:
          enrichCompatibilityExplanations(compatibility.businessTasks,
            input.knowledgePacks || []), pipelineVersion: VERSION,
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
  return { VERSION, applyReleaseFindings, enrichCompatibilityExplanations,
    relatedScreenshotCaption, subsequentPageScreenshot,
    interpret, isPlaceholderDominated };
});
