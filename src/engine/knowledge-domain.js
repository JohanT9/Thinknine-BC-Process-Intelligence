(function (root, factory) {
  const consolidation = typeof module === "object" && module.exports
    ? require("./task-consolidation") : root.T9TaskConsolidation;
  const api = factory(consolidation);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9KnowledgeDomain = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (consolidation) {
  "use strict";
  const VERSION = "2.1.0";
  const text = value => String(value || "");

  function rules(packs = []) {
    return packs.flatMap(pack => (pack.rules || []).map(rule => ({
      ...rule, packId: pack.packId, packName: pack.name,
      packVersion: pack.version, packPriority: pack.priority || 0
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

  function score(rule, task) {
    const match = rule.match || {};
    const context = task.context || {};
    const checks = [["pagePatterns", task.pageCaption ||
      context.currentPageCaption || context.previousPageCaption],
    ["actionPatterns", task.actionCaption], ["fieldPatterns", task.fieldCaption],
    ["automationIdPatterns", task.automationId]];
    let value = 0; let matched = 0; let required = 0;
    for (const [key, candidate] of checks) {
      const declared = match[key] || [];
      if (!declared.length) continue;
      required += 1;
      if (patternsMatch(declared, candidate)) { matched += 1; value += 25; }
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

  function apply(tasks = [], packs = []) {
    const availableRules = rules(packs); const unmatched = [];
    const enriched = tasks.map(task => {
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
      return { ...task, taskType: rule.taskType || task.taskType,
        semanticAction: rule.semanticAction || task.semanticAction,
        entity: rule.entity || task.entity || "", knowledgeFrameworkVersion: VERSION,
        knowledgeMatched: true, knowledgeRule: rule.ruleId,
        knowledgePackId: rule.packId, knowledgePackName: rule.packName,
        knowledgePackVersion: rule.packVersion,
        confidence: rule.confidence || task.confidence || 0.8,
        reviewSuggested: (rule.confidence || 0.8) < 0.85,
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
      if (rules.length !== 1) return task;
      const matched = matches.find(item => item.knowledgeRule === rules[0]);
      return { ...task, knowledgeMatched: true,
        knowledgeRule: matched.knowledgeRule,
        knowledgePackId: matched.knowledgePackId,
        knowledgePackName: matched.knowledgePackName,
        knowledgePackVersion: matched.knowledgePackVersion,
        knowledgeFrameworkVersion: matched.knowledgeFrameworkVersion,
        ...(directives.length === 1 ? { userDirective: directives[0],
          userDirectiveSourceIds: sourceIds } : {}) };
    });
    return { tasks: tasksWithKnowledge,
      consolidationDecisions: consolidated.decisions,
      unmatched, rules: availableRules };
  }
  return { VERSION, apply, match, patternsMatch, rules, score, localizedInstruction };
});
