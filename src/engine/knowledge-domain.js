(function (root, factory) {
  const consolidation = typeof module === "object" && module.exports
    ? require("./task-consolidation") : root.T9TaskConsolidation;
  const explanationCatalog = typeof module === "object" && module.exports
    ? require("./knowledge-explanation-catalog") : root.T9KnowledgeExplanationCatalog;
  const pageIdentification = typeof module === "object" && module.exports
    ? require("./page-identification-engine") : root.T9PageIdentificationEngine;
  const api = factory(consolidation, explanationCatalog, pageIdentification);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9KnowledgeDomain = api;
})(typeof globalThis !== "undefined" ? globalThis : this,
function (consolidation, explanationCatalog, pageIdentification) {
  "use strict";
  const VERSION = "2.2.0";
  const text = value => String(value || "");

  function rules(packs = []) {
    return packs.flatMap(pack => (pack.rules || []).map(rule => ({
      ...rule, packId: pack.packId, packName: pack.name,
      packVersion: pack.version, packPriority: pack.priority || 0,
      sourceRefs: (rule.sourceIds || []).map(sourceId =>
        (pack.sources || []).find(source => source.sourceId === sourceId))
        .filter(Boolean)
    }))).sort((a, b) =>
      (b.priority + b.packPriority) - (a.priority + a.packPriority));
  }

  function patternsMatch(patterns, value) {
    if (!patterns?.length) return true;
    return patterns.some(pattern => {
      try { return new RegExp(pattern, "i").test(text(value)); }
      catch { return false; }
    });
  }

  function pageEvidence(task, packs) {
    const pageObjectId = task.pageObjectId || task.pageId ||
      task.pageIdentification?.pageObjectId ||
      task.pageContext?.pageObjectId || task.context?.currentPageObjectId;
    const definition = pageObjectId && pageIdentification?.getPageDefinition(
      pageObjectId, packs);
    if (!definition) return task;
    const language = text(task.language || task.locale || task.context?.language ||
      task.context?.locale || "en-US");
    const definitions = packs.flatMap(pack => pack.pageDefinitions || [])
      .filter(item => String(item.pageObjectId || "") === String(pageObjectId) &&
        (!definition.entity || item.entity === definition.entity));
    const preferred = definitions.find(item => item.ruleId === definition.ruleId);
    const localized = definitions.map(item => item.localizedCaptions || {});
    const captions = localized.find(item => item[language]?.length ||
      item[language.split("-")[0]]?.length) || preferred?.localizedCaptions ||
      localized[0] || {};
    const caption = captions[language]?.[0] ||
      captions[language.split("-")[0]]?.[0] ||
      Object.values(captions).flat()[0] || task.pageCaption || "";
    return { ...task, knowledgePageCaption: caption,
      pageObjectId: String(pageObjectId),
      context: { ...(task.context || {}),
        currentEntity: task.context?.currentEntity || definition.entity || "",
        currentPageCaption: task.context?.currentPageCaption || caption,
        currentPageObjectId: String(pageObjectId) } };
  }

  function score(rule, task) {
    const match = rule.match || {};
    const context = task.context || {};
    const pageObjectIds = match.pageObjectIds || [];
    const observedPageObjectId = text(task.pageObjectId || task.pageId ||
      task.pageIdentification?.pageObjectId || context.currentPageObjectId);
    if (pageObjectIds.length && !pageObjectIds.map(String)
      .includes(observedPageObjectId)) return 0;
    const ruleEntity = text(rule.entity).trim().toLowerCase();
    const observedEntity = text(task.entity || context.currentEntity)
      .trim().toLowerCase();
    const pageCaption = task.knowledgePageCaption || task.pageCaption || context.currentPageCaption ||
      context.previousPageCaption;
    const pageMatches = (match.pagePatterns || []).length > 0 &&
      patternsMatch(match.pagePatterns, pageCaption);
    if (ruleEntity && observedEntity && ruleEntity !== observedEntity && !pageMatches) return 0;
    const checks = [["pagePatterns", pageCaption],
      ["actionPatterns", task.actionCaption], ["fieldPatterns", task.fieldCaption],
      ["automationIdPatterns", task.automationId]];
    let value = 0; let matched = 0; let required = 0;
    for (const [key, candidate] of checks) {
      const declared = match[key] || [];
      if (!declared.length) continue;
      required += 1;
      const pageResolvedByEntity = key === "pagePatterns" && ruleEntity &&
        observedEntity === ruleEntity;
      if (patternsMatch(declared, key === "pagePatterns" ? pageCaption : candidate) || pageResolvedByEntity) {
        matched += 1; value += 25;
      }
    }
    if (!required || matched < required) return 0;
    value += Math.round((rule.confidence || 0.5) * 50);
    value += Math.min(25, Math.round((rule.priority || 0) / 50));
    if (context.currentEntity && rule.entity === context.currentEntity) value += 20;
    if (context.followingEntity && rule.entity === context.followingEntity) value += 20;
    if (context.pendingSemanticHint &&
        rule.semanticAction === context.pendingSemanticHint) value += 25;
    return value;
  }

  function match(task, availableRules) {
    return availableRules.reduce((best, rule) => {
      const value = score(rule, task);
      return value > (best?.score || 0) ? { rule, score: value } : best;
    }, null);
  }

  function suggestedRule(task) {
    const context = task.context || {};
    const exact = value => value ? [`^${value}$`] : [];
    return { ruleId: `Custom.${context.currentEntity || task.taskType || "Task"}`,
      taskType: task.taskType || "RunAction", semanticAction: task.semanticAction || "",
      entity: task.entity || "", priority: 500, confidence: 0.75,
      match: { pagePatterns: exact(context.currentPageCaption || task.pageCaption),
        actionPatterns: exact(task.actionCaption), fieldPatterns: exact(task.fieldCaption),
        automationIdPatterns: exact(task.automationId) } };
  }

  function localizedInstruction(rule, language) {
    const localized = rule?.localizedInstructions || {};
    const tag = text(language).trim();
    const base = tag.split("-")[0];
    return localized[tag] || localized[base] || rule?.instructionTemplate || "";
  }

  function explanationEligible(rule, task, availableRules = []) {
    if (!localizedExplanations(rule, task)) return false;
    const matchSpec = rule.match || {};
    const explicitSignal = [
      [matchSpec.actionPatterns, task.actionCaption],
      [matchSpec.fieldPatterns, task.fieldCaption],
      [matchSpec.automationIdPatterns, task.automationId]
    ].some(([patterns, value]) => patterns?.length && patternsMatch(patterns, value));
    if (!explicitSignal) return false;
    if (["Core.ConfirmYes", "Core.ConfirmNo"].includes(rule.ruleId)) return false;
    const observedEntity = text(task.entity || task.context?.currentEntity)
      .trim().toLowerCase();
    const ruleEntity = text(rule.entity).trim().toLowerCase();
    const genericCore = ["Core.SearchAndOpenPage", "Core.CreateNew", "Core.EditRecord",
      "Core.DeleteRecord", "Core.NavigateBack", "Core.Lookup", "Core.ChangeDate"]
      .includes(rule.ruleId);
    if (rule.ruleId === "Core.CreateNew" && !observedEntity &&
        !(task.knowledgePageCaption || task.pageCaption || task.context?.currentPageCaption || task.context?.previousPageCaption)) return false;
    const entitylessCore = genericCore && !observedEntity;
    if (!ruleEntity && !genericCore) return false;
    const pageCaption = task.knowledgePageCaption || task.pageCaption || task.context?.currentPageCaption ||
      task.context?.previousPageCaption || "";
    const pageMatches = matchSpec.pagePatterns?.length &&
      patternsMatch(matchSpec.pagePatterns, pageCaption);
    if (ruleEntity && observedEntity && observedEntity !== ruleEntity && !pageMatches) return false;
    const entityBackedPage = observedEntity === ruleEntity;
    if (!pageMatches && !entityBackedPage && !entitylessCore &&
        !(genericCore && pageCaption)) return false;
    const sources = rule.sourceRefs || [];
    const officialSource = sources.some(source => { const uri = String(source?.sourceUri || ""); return uri.startsWith("https://learn.microsoft.com/") || uri.startsWith("https://erpdocs.apteancloud.com/"); });
    const authoredWorkflow = explanationCatalog?.isAuthored?.(rule) === true;
    const pageContextCreate = rule.ruleId === "Core.CreateNew" && Boolean(pageCaption || observedEntity);
    if (!officialSource && !authoredWorkflow && !pageContextCreate) return false;
    const candidates = availableRules.length ? availableRules : [rule];
    const scored = candidates.map(candidate => ({ candidate,
      score: score(candidate, task) })).filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score);
    const winner = scored[0];
    return winner?.candidate.ruleId === rule.ruleId &&
      (!scored[1] || winner.score - scored[1].score >= 5);
  }

  function localizedExplanation(rule, language) {
    const localized = localizedExplanations(rule) || {};
    const tag = text(language).trim();
    const base = tag.split("-")[0];
    return localized[tag] || localized[base] || "";
  }

  function localizedExplanations(rule, context) {
    return rule?.localizedExplanations || explanationCatalog?.localized(rule, context) || null;
  }

  function apply(tasks = [], packs = []) {
    const availableRules = rules(packs); const unmatched = [];
    const enriched = tasks.map(originalTask => {
      const task = pageEvidence(originalTask, packs);
      const found = match(task, availableRules);
      if (!found) {
        unmatched.push({ pageId: task.pageId || "", pageCaption: task.pageCaption || "",
          actionCaption: task.actionCaption || "", fieldCaption: task.fieldCaption || "",
          selectedCaption: task.selectedCaption || "", automationId: task.automationId || "",
          context: task.context || {}, suggestedRule: suggestedRule(task) });
        return { ...task, knowledgeFrameworkVersion: VERSION,
          knowledgeMatched: false, confidence: task.confidence || 0.55,
          reviewSuggested: true };
      }
      const rule = found.rule;
      const instruction = localizedInstruction(rule, task.language || task.locale ||
        task.context?.language || task.context?.locale || "en-US");
      const explanations = explanationEligible(rule, task, availableRules)
        ? localizedExplanations(rule, task) : null;
      const explanationBasis = explanations
        ? explanationCatalog?.basis?.(rule, task) || "microsoft-learn" : "";
      const pageContextExplanation = explanationBasis === "page-context";
      return { ...task, taskType: rule.taskType || task.taskType,
        semanticAction: rule.semanticAction || task.semanticAction,
        entity: rule.entity || task.entity || "", knowledgeFrameworkVersion: VERSION,
        knowledgeMatched: true, knowledgeRule: rule.ruleId,
        knowledgePackId: rule.packId, knowledgePackName: rule.packName,
        knowledgePackVersion: rule.packVersion,
        confidence: rule.confidence || task.confidence || 0.8,
        reviewSuggested: (rule.confidence || 0.8) < 0.85,
        ...(explanations ? { contextualExplanations: { ...explanations },
          contextualExplanationRuleId: rule.ruleId,
          contextualExplanationConfidence: Number(rule.confidence),
          contextualExplanationSourceIds: pageContextExplanation ? [] : [...(rule.sourceIds || [])],
          contextualExplanationBasis: explanationBasis,
          contextualExplanationSources: pageContextExplanation ? [] : rule.sourceRefs.map(source => ({
            sourceId: source.sourceId, title: source.title, sourceUri: source.sourceUri
          })) } : {}),
        ...(instruction ? { userDirective: instruction,
          userDirectiveSourceIds: [...(rule.sourceIds || [])] } : {}) };
    });
    const consolidated = consolidation.consolidateWithAnalysis(enriched);
    const tasksWithKnowledge = consolidated.tasks.map(task => {
      const sourceTaskIds = new Set(task.sourceTaskIds || [task.taskId]);
      const matches = enriched.filter(item => sourceTaskIds.has(item.taskId) ||
        (item.stepGroupIds || []).some(id => sourceTaskIds.has(id)));
      const rules = [...new Set(matches.map(item => item.knowledgeRule).filter(Boolean))];
      const directives = [...new Set(matches.map(item => item.userDirective).filter(Boolean))];
      const sourceIds = [...new Set(matches.flatMap(item =>
        item.userDirectiveSourceIds || []))];
      const explanationMaps = [...new Map(matches.map(item => item.contextualExplanations)
        .filter(Boolean).map(value => [JSON.stringify(value), value])).values()];
      const explanationSourceIds = [...new Set(matches.flatMap(item =>
        item.contextualExplanationSourceIds || []))];
      const explanationSources = [...new Map(matches.flatMap(item =>
        item.contextualExplanationSources || []).map(source => [source.sourceId, source]))
        .values()];
      const explanationRuleIds = [...new Set(matches.map(item =>
        item.contextualExplanationRuleId).filter(Boolean))];
      const explanationConfidences = [...new Set(matches.map(item =>
        item.contextualExplanationConfidence).filter(Number.isFinite))];
      if (rules.length !== 1) return task;
      const matched = matches.find(item => item.knowledgeRule === rules[0]);
      return { ...task, knowledgeMatched: true,
        knowledgeRule: matched.knowledgeRule,
        knowledgePackId: matched.knowledgePackId,
        knowledgePackName: matched.knowledgePackName,
        knowledgePackVersion: matched.knowledgePackVersion,
        knowledgeFrameworkVersion: matched.knowledgeFrameworkVersion,
        ...(explanationMaps.length === 1 && explanationRuleIds.length === 1 &&
            explanationConfidences.length === 1 ? {
          contextualExplanations: explanationMaps[0],
          contextualExplanationRuleId: explanationRuleIds[0],
          contextualExplanationConfidence: explanationConfidences[0],
          contextualExplanationSourceIds: explanationSourceIds,
          contextualExplanationSources: explanationSources
        } : {}),
        ...(directives.length === 1 ? { userDirective: directives[0],
          userDirectiveSourceIds: sourceIds } : {}) };
    });
    return { tasks: tasksWithKnowledge,
      consolidationDecisions: consolidated.decisions,
      unmatched, rules: availableRules };
  }
  return { VERSION, apply, match, pageEvidence, patternsMatch, rules, score, explanationEligible,
    localizedExplanations, localizedInstruction,
    localizedExplanation };
});
