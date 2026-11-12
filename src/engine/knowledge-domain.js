(function (root, factory) {
  const consolidation = typeof module === "object" && module.exports
    ? require("./task-consolidation") : root.T9TaskConsolidation;
  const explanationCatalog = typeof module === "object" && module.exports
    ? require("./knowledge-explanation-catalog") : root.T9KnowledgeExplanationCatalog;
  const pageIdentification = typeof module === "object" && module.exports
    ? require("./page-identification-engine") : root.T9PageIdentificationEngine;
  const clientCaptions = typeof module === "object" && module.exports
    ? require("./bc-client-captions") : root.T9BCClientCaptions;
  const stepText = typeof module === "object" && module.exports
    ? require("./step-text") : root.T9StepText;
  const api = factory(consolidation, explanationCatalog, pageIdentification, clientCaptions,
    stepText);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.T9KnowledgeDomain = api;
})(typeof globalThis !== "undefined" ? globalThis : this,
function (consolidation, explanationCatalog, pageIdentification, clientCaptions, stepText) {
  "use strict";
  const VERSION = "2.3.0";
  const text = value => String(value || "");
  const patternCache = new Map();
  const confidenceValue = (value, fallback) => Number.isFinite(value)
    ? Math.max(0, Math.min(1, value)) : fallback;

  function patternRegex(pattern) {
    const key = String(pattern);
    if (patternCache.has(key)) return patternCache.get(key);
    let regex = null;
    try { regex = new RegExp(key, "i"); } catch { /* invalid packs are non-matching */ }
    if (patternCache.size >= 4096) patternCache.clear();
    patternCache.set(key, regex);
    return regex;
  }

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
    const candidate = text(value);
    return patterns.some(pattern => patternRegex(pattern)?.test(candidate) || false);
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
    const entityCaption = createdEntityNames[definition.entity]?.[language] ||
      createdEntityNames[definition.entity]?.[language.split("-")[0]] || "";
    const localizedEntityCaption = entityCaption
      ? `${entityCaption.slice(0, 1).toLocaleUpperCase(language)}${entityCaption.slice(1)}` : "";
    const caption = captions[language]?.[0] ||
      captions[language.split("-")[0]]?.[0] ||
      localizedEntityCaption || Object.values(captions).flat()[0] || task.pageCaption || "";
    // The object ID is stronger evidence than the document title/company name,
    // which is commonly all that the browser-level capture has for BC pages.
    return { ...task, pageCaption: caption, knowledgePageCaption: caption,
      entity: task.entity || definition.entity || "",
      pageObjectId: String(pageObjectId),
      context: { ...(task.context || {}),
        currentEntity: task.context?.currentEntity || definition.entity || "",
        currentPageCaption: caption,
        currentPageObjectId: String(pageObjectId) } };
  }

  const captionEntityCaches = new WeakMap();
  function captionEntity(caption, language, packs) {
    const cacheOwner = Array.isArray(packs) ? packs : captionEntity;
    if (!captionEntityCaches.has(cacheOwner)) captionEntityCaches.set(cacheOwner, new Map());
    const captionEntityCache = captionEntityCaches.get(cacheOwner);
    const key = `${text(language)}\u001f${text(caption)}`;
    if (captionEntityCache.has(key)) return captionEntityCache.get(key);
    let entity = "";
    try {
      entity = text(pageIdentification?.resolvePageIdentity?.({ pageCaption: caption,
        language }, packs)?.entity).trim().toLowerCase();
    } catch { /* page identification is optional evidence */ }
    if (captionEntityCache.size >= 2048) captionEntityCache.clear();
    captionEntityCache.set(key, entity);
    return entity;
  }

  function score(rule, task, packs = []) {
    const match = rule.match || {};
    const context = task.context || {};
    const pageObjectIds = match.pageObjectIds || [];
    const observedPageObjectId = text(task.pageObjectId || task.pageId ||
      task.pageIdentification?.pageObjectId || task.pageContext?.pageObjectId ||
      context.currentPageObjectId);
    if (pageObjectIds.length && observedPageObjectId &&
        !pageObjectIds.map(String).includes(observedPageObjectId)) return 0;
    const pageResolvedByObjectId = pageObjectIds.length > 0 &&
      pageObjectIds.map(String).includes(observedPageObjectId);
    const ruleEntity = text(rule.entity).trim().toLowerCase();
    const observedEntity = text(task.entity || context.currentEntity)
      .trim().toLowerCase();
    const pageCaption = task.knowledgePageCaption || task.pageCaption || context.currentPageCaption ||
      context.previousPageCaption;
    const pageMatches = (match.pagePatterns || []).length > 0 &&
      (patternsMatch(match.pagePatterns, pageCaption) || pageResolvedByObjectId);
    if (ruleEntity && observedEntity && ruleEntity !== observedEntity && !pageMatches) return 0;
    const checks = [["pagePatterns", pageCaption],
      ["actionPatterns", task.actionCaption], ["fieldPatterns", task.fieldCaption],
      ["automationIdPatterns", task.automationId]];
    // An identified entity may stand in for the page unless the caption is a
    // reliably identified page of a different entity. Missing, low-confidence or
    // unidentifiable captions (for example a company name used as page title) and
    // other pages of the same entity (card versus list) do not contradict it.
    const pageConfidence = Number(task.pageIdentificationConfidence ??
      context.pageIdentificationConfidence ?? NaN);
    const entityStandsInForPage = () => {
      if (!pageCaption || (Number.isFinite(pageConfidence) && pageConfidence < 0.6)) return true;
      const identified = captionEntity(pageCaption, task.language || context.language, packs);
      if (identified) return identified === ruleEntity;
      // An unmapped caption only yields to the entity when nobody vouched for it.
      return !Number.isFinite(pageConfidence);
    };
    let value = 0; let matched = 0; let required = 0;
    for (const [key, candidate] of checks) {
      const declared = match[key] || [];
      if (!declared.length) continue;
      required += 1;
      const pageResolvedByEntity = key === "pagePatterns" && ruleEntity &&
        observedEntity === ruleEntity;
      if (patternsMatch(declared, key === "pagePatterns" ? pageCaption : candidate) ||
          (key === "pagePatterns" && pageResolvedByObjectId) ||
          (pageResolvedByEntity && entityStandsInForPage())) {
        matched += 1; value += 25;
      }
    }
    if (!required || matched < required) return 0;
    value += Math.round(confidenceValue(rule.confidence, 0.5) * 50);
    value += Math.min(25, Math.round((rule.priority || 0) / 50));
    if (context.currentEntity && rule.entity === context.currentEntity) value += 20;
    if (context.followingEntity && rule.entity === context.followingEntity) value += 20;
    if (context.pendingSemanticHint &&
        rule.semanticAction === context.pendingSemanticHint) value += 25;
    return value;
  }

  function match(task, availableRules, packs) {
    const [winner, runnerUp] = topMatches(task, availableRules, 2, packs);
    if (!winner) return null;
    if (runnerUp && winner.score - runnerUp.score < 5) return null;
    return winner;
  }

  function ruleIdentity(rule) {
    return [rule.taskType || "", rule.semanticAction || "",
      text(rule.entity).trim().toLowerCase()].join("\u001f");
  }

  function topMatches(task, availableRules, limit, packs) {
    const ranked = [];
    for (const rule of availableRules) {
      const value = score(rule, task, packs);
      if (value <= 0) continue;
      const item = { rule, score: value };
      const duplicate = ranked.findIndex(candidate =>
        ruleIdentity(candidate.rule) === ruleIdentity(rule));
      if (duplicate >= 0) {
        if (value <= ranked[duplicate].score) continue;
        ranked.splice(duplicate, 1);
      }
      const position = ranked.findIndex(candidate => value > candidate.score);
      if (position < 0) {
        if (ranked.length < limit) ranked.push(item);
      } else {
        ranked.splice(position, 0, item);
        if (ranked.length > limit) ranked.pop();
      }
    }
    return ranked;
  }

  function ambiguousCandidates(task, availableRules, packs) {
    const ranked = topMatches(task, availableRules, 4, packs);
    const [winner, runnerUp] = ranked;
    if (!winner || !runnerUp || winner.score - runnerUp.score >= 5) return [];
    return ranked.slice(0, 4).map(item => ({ ruleId: item.rule.ruleId,
      taskType: item.rule.taskType || "", semanticAction: item.rule.semanticAction || "",
      entity: item.rule.entity || "", score: item.score }));
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

  // What a step creates, in each language: the same words as the step's own sentence.
  const createdEntityNames = stepText.ENTITY_NAMES;
  function isNewActionCaption(value) {
    // Only enrich the literal New action. Other actions whose semantic type
    // starts with Create (for example creating a warehouse receipt from a
    // purchase order) are different business operations and must retain their
    // own instruction instead of being rewritten as a new record.
    return /^(?:(?:ny(?:tt)?(?:\s+(?:post|order|faktura|kreditnota))?)|(?:new(?:\s+(?:record|order|invoice|credit memo))?)|(?:skapa ny|create new|nouveau|nouvelle|neu(?:e|er|es)?|nuevo|nueva|uusi|opret|opprett(?:e)?))$/iu
      .test(text(value).trim().replace(/\.$/u, ""));
  }
  // The language a task was interpreted in, as one of the step text languages.
  function taskLanguage(task) {
    const language = text(task.language || task.locale || task.context?.language || "sv-SE");
    return stepText.LOCALES.find(locale => locale === language) ||
      stepText.LOCALES.find(locale => locale.split("-")[0] === language.split("-")[0]) || "sv-SE";
  }

  // The description of a step that starts a new record: what it creates, the action and the
  // page as Business Central showed it, so the caption reads as on the reader's screen.
  function contextualCreateStep(rule, task) {
    if (!/^Create/u.test(String(rule?.taskType || rule?.semanticAction || ""))) return null;
    // The page is named without the record or the product title after it.
    const page = clientCaptions.pageName(text(task.semanticActionModel?.pageCaption ||
      task.capturedPageCaption || task.knowledgePageCaption || task.pageCaption ||
      task.context?.currentPageCaption || task.context?.previousPageCaption));
    const action = text(task.actionCaption);
    if (!page || !isNewActionCaption(action)) return null;
    const entity = rule.entity || task.entity;
    return createdEntityNames[entity]
      ? stepText.describe("create", { entity, action, page })
      : stepText.describe("createRecord", { action, page });
  }

  function contextualCreateInstruction(rule, task) {
    const described = contextualCreateStep(rule, task);
    return described ? stepText.markdown(described, taskLanguage(task)) : "";
  }

  function explanationEligible(rule, task, availableRules = [], packs = []) {
    if (!localizedExplanations(rule, task)) return false;
    const matchSpec = rule.match || {};
    const explicitSignal = [
      [matchSpec.actionPatterns, task.actionCaption],
      [matchSpec.fieldPatterns, task.fieldCaption],
      [matchSpec.automationIdPatterns, task.automationId]
    ].some(([patterns, value]) => patterns?.length && patternsMatch(patterns, value));
    if (!explicitSignal) return false;
    const observedEntity = text(task.entity || task.context?.currentEntity)
      .trim().toLowerCase();
    const ruleEntity = text(rule.entity).trim().toLowerCase();
    const genericCore = ["Core.SearchAndOpenPage", "Core.CreateNew", "Core.EditRecord",
      "Core.DeleteRecord", "Core.NavigateBack", "Core.Lookup", "Core.ChangeDate",
      "Core.ConfirmYes", "Core.ConfirmNo"]
      .includes(rule.ruleId);
    // A bare Yes/No says nothing about what was confirmed; only explain it when
    // the page or entity gives the decision context.
    if (["Core.ConfirmYes", "Core.ConfirmNo"].includes(rule.ruleId) && !observedEntity &&
        !(task.knowledgePageCaption || task.pageCaption || task.context?.currentPageCaption ||
          task.context?.previousPageCaption)) return false;
    if (rule.ruleId === "Core.CreateNew" && !observedEntity &&
        !(task.knowledgePageCaption || task.pageCaption || task.context?.currentPageCaption || task.context?.previousPageCaption)) return false;
    const entitylessCore = genericCore && !observedEntity;
    if (!ruleEntity && !genericCore) return false;
    const pageCaption = task.knowledgePageCaption || task.pageCaption || task.context?.currentPageCaption ||
      task.context?.previousPageCaption || "";
    const pageObjectId = text(task.pageObjectId || task.pageId ||
      task.pageIdentification?.pageObjectId || task.pageContext?.pageObjectId ||
      task.context?.currentPageObjectId);
    const pageMatches = Boolean(matchSpec.pagePatterns?.length &&
      (patternsMatch(matchSpec.pagePatterns, pageCaption) ||
        (matchSpec.pageObjectIds || []).map(String).includes(pageObjectId)));
    if (ruleEntity && observedEntity && observedEntity !== ruleEntity && !pageMatches) return false;
    const entityBackedPage = observedEntity === ruleEntity;
    if (!pageMatches && !entityBackedPage && !entitylessCore &&
        !(genericCore && pageCaption)) return false;
    const sources = rule.sourceRefs || [];
    const officialSource = sources.some(source => { const uri = String(source?.sourceUri || ""); return uri.startsWith("https://learn.microsoft.com/") || uri.startsWith("https://erpdocs.apteancloud.com/"); });
    const authoredWorkflow = explanationCatalog?.isAuthored?.(rule) === true;
    const pageContextAction = rule.ruleId?.startsWith("Core.") && Boolean(pageCaption || observedEntity);
    if (!officialSource && !authoredWorkflow && !pageContextAction) return false;
    const candidates = availableRules.length ? availableRules : [rule];
    const scored = candidates.map(candidate => ({ candidate,
      score: score(candidate, task, packs) })).filter(item => item.score > 0)
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
    const localized = rule?.localizedExplanations || explanationCatalog?.localized(rule, context) || null;
    if (!localized) return null;
    const action = text(context?.actionCaption || context?.context?.actionCaption).trim();
    const createAction = rule?.ruleId === "Core.CreateNew" ||
      rule?.taskType === "CreateNew" || rule?.semanticAction === "CreateNew" ||
      isNewActionCaption(action);
    const page = text(context?.knowledgePageCaption || context?.pageCaption ||
      context?.context?.currentPageCaption || context?.context?.previousPageCaption).trim();
    if (!createAction || !page) return localized;
    return Object.fromEntries(Object.entries(localized).map(([locale, explanation]) => {
      const current = text(explanation);
      const escapedPage = page.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const pageReference = new RegExp(`(?:page\\s+${escapedPage}|(?:the\\s+)?${escapedPage}\\s+page|sidan\\s+${escapedPage}|siden\\s+${escapedPage}|seite\\s+${escapedPage}|página\\s+${escapedPage}|pagina\\s+${escapedPage}|sivulla\\s+${escapedPage})`, "iu");
      const actionLabel = action || ({
        "sv-SE": "Ny", "en-US": "New", "fr-FR": "Nouveau", "de-DE": "Neu",
        "es-ES": "Nuevo", "da-DK": "Opret", "fi-FI": "Uusi", "nb-NO": "Opprett"
      })[locale] || "New";
      if (pageReference.test(current) && current.includes(actionLabel)) return [locale, current];
      const prefix = {
        "sv-SE": `På sidan **${page}**, när du väljer **${actionLabel}**: `,
        "en-US": `On the **${page}** page, after selecting **${actionLabel}**: `,
        "fr-FR": `Sur la page **${page}**, après avoir choisi **${actionLabel}** : `,
        "de-DE": `Auf der Seite **${page}**, nach Auswahl von **${actionLabel}**: `,
        "es-ES": `En la página **${page}**, al seleccionar **${actionLabel}**: `,
        "da-DK": `På siden **${page}**, efter valg af **${actionLabel}**: `,
        "fi-FI": `Sivulla **${page}**, kun valitset **${actionLabel}**: `,
        "nb-NO": `På siden **${page}**, etter at du velger **${actionLabel}**: `
      }[locale] || `On **${page}**, after selecting **${actionLabel}**: `;
      return [locale, `${prefix}${current}`];
    }));
  }

  function sourceLanguage(source) {
    const uri = text(source?.sourceUri);
    const locale = uri.match(/^https:\/\/learn\.microsoft\.com\/([^/]+)\//i)?.[1];
    if (!locale) return "";
    const language = locale.split("-")[0].toLowerCase();
    const names = { en: "English", sv: "Swedish", fr: "French", de: "German",
      es: "Spanish", da: "Danish", fi: "Finnish", nb: "Norwegian" };
    return names[language] || locale;
  }

  function sourceMatchesLanguage(source, task) {
    const uri = text(source?.sourceUri);
    const sourceLocale = uri.match(/^https:\/\/learn\.microsoft\.com\/([^/]+)\//i)?.[1];
    if (!sourceLocale) return true;
    const requested = text(task?.language || task?.locale || task?.context?.language ||
      task?.context?.locale || "en-US").toLowerCase().split("-")[0];
    const actual = sourceLocale.toLowerCase().split("-")[0];
    return requested === actual || (requested === "nb" && actual === "no") ||
      (requested === "no" && actual === "nb");
  }

  function apply(tasks = [], packs = [], { mergeSteps = true } = {}) {
    const availableRules = rules(packs); const unmatched = [];
    const enriched = tasks.map(originalTask => {
      const task = pageEvidence(originalTask, packs);
      const found = match(task, availableRules, packs);
      if (!found) {
        const ambiguous = ambiguousCandidates(task, availableRules, packs);
        unmatched.push({ pageId: task.pageId || "", pageCaption: task.pageCaption || "",
          actionCaption: task.actionCaption || "", fieldCaption: task.fieldCaption || "",
          selectedCaption: task.selectedCaption || "", automationId: task.automationId || "",
          context: task.context || {},
          ambiguousCandidates: ambiguous,
          suggestedRule: suggestedRule(task) });
        return { ...task, knowledgeFrameworkVersion: VERSION,
          knowledgeMatched: false,
          confidence: confidenceValue(task.confidence, 0.55),
          reviewSuggested: true,
          ...(ambiguous.length ? { knowledgeMatchAmbiguous: true,
            ambiguousCandidates: ambiguous } : {}) };
      }
      const rule = found.rule;
      const instruction = localizedInstruction(rule, task.language || task.locale ||
        task.context?.language || task.context?.locale || "en-US");
      const contextualStep = contextualCreateStep(rule, task);
      const contextualInstruction = contextualStep
        ? stepText.markdown(contextualStep, taskLanguage(task)) : "";
      const effectiveInstruction = contextualInstruction || instruction;
      const explanations = explanationEligible(rule, task, availableRules, packs)
        ? localizedExplanations(rule, task) : null;
      const explanationBasis = explanations
        ? explanationCatalog?.basis?.(rule, task) || "microsoft-learn" : "";
      const pageContextExplanation = explanationBasis === "page-context";
      const confidence = confidenceValue(rule.confidence,
        confidenceValue(task.confidence, 0.8));
      return { ...task, taskType: rule.taskType || task.taskType,
        semanticAction: rule.semanticAction || task.semanticAction,
        entity: rule.entity || task.entity || "", knowledgeFrameworkVersion: VERSION,
        knowledgeMatched: true, knowledgeRule: rule.ruleId,
        knowledgePackId: rule.packId, knowledgePackName: rule.packName,
        knowledgePackVersion: rule.packVersion,
        confidence,
        reviewSuggested: confidence < 0.85,
        ...(contextualInstruction ? { contextualInstruction,
          instruction: contextualInstruction, description: contextualInstruction,
          semanticActionModel: task.semanticActionModel ? {
            ...task.semanticActionModel, displayText: contextualInstruction,
            stepText: contextualStep
          } : task.semanticActionModel } : {}),
        ...(explanations ? { contextualExplanations: { ...explanations },
          contextualExplanationRuleId: rule.ruleId,
          contextualExplanationConfidence: Number(rule.confidence),
          contextualExplanationSourceIds: pageContextExplanation ? [] : [...(rule.sourceIds || [])],
          contextualExplanationBasis: explanationBasis,
          contextualExplanationSources: pageContextExplanation ? [] : rule.sourceRefs.map(source => ({
            sourceId: source.sourceId, title: source.title, sourceUri: source.sourceUri,
            sourceLanguage: sourceLanguage(source),
            sourceMatchesExplanationLanguage: sourceMatchesLanguage(source, task)
          })) } : {}),
        ...(effectiveInstruction ? { userDirective: effectiveInstruction,
          userDirectiveSourceIds: [...(rule.sourceIds || [])] } : {}) };
    });
    const consolidated = consolidation.consolidateWithAnalysis(enriched, { mergeSteps });
    const tasksWithKnowledge = consolidated.tasks.map(task => {
      const sourceTaskIds = new Set(task.sourceTaskIds || [task.taskId]);
      const matches = enriched.filter(item => sourceTaskIds.has(item.taskId) ||
        (item.stepGroupIds || []).some(id => sourceTaskIds.has(id)));
      const rules = [...new Set(matches.map(item => item.knowledgeRule).filter(Boolean))];
      const directives = [...new Set(matches.map(item => item.userDirective).filter(Boolean))];
      const contextualInstructions = [...new Set(matches.map(item =>
        item.contextualInstruction).filter(Boolean))];
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
      const contextualInstruction = contextualInstructions.length === 1
        ? contextualInstructions[0] : "";
      return { ...task,
        entity: matched.entity || task.entity || "",
        ...(contextualInstruction ? { instruction: contextualInstruction,
          description: contextualInstruction,
          semanticActionModel: task.semanticActionModel ? {
            ...task.semanticActionModel, displayText: contextualInstruction,
            stepText: matches.find(item => item.contextualInstruction === contextualInstruction)
              ?.semanticActionModel?.stepText
          } : task.semanticActionModel } : {}),
        knowledgeMatched: true,
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
  return { VERSION, apply, match, ambiguousCandidates, pageEvidence, patternsMatch, rules, score, explanationEligible,
    localizedExplanations, localizedInstruction,
    contextualInstruction: contextualCreateInstruction,
    contextualStep: contextualCreateStep,
    localizedExplanation };
});
