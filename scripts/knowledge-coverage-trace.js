// Preloaded into the knowledge tests by scripts/knowledge-locale-coverage.js. It records
// which rule each explicitly localized task or query resolved to, so the coverage matrix
// shows what the tests exercise rather than what the packs declare.
"use strict";
const fs = require("fs");
const Module = require("module");

const out = process.env.KNOWLEDGE_COVERAGE_TRACE;
const seen = new Set();
const record = (ruleId, language) => {
  if (!out || !ruleId || !language) return;
  const key = `${ruleId}\t${language}`;
  if (seen.has(key)) return;
  seen.add(key);
  fs.appendFileSync(out, key + "\n");
};
const languageOf = task => task?.language || task?.locale || task?.context?.language ||
  task?.context?.locale;
const wrapped = new WeakSet();
const original = Module.prototype.require;
Module.prototype.require = function (id) {
  const value = original.apply(this, arguments);
  if (!value || typeof value !== "object" || wrapped.has(value)) return value;
  if (/knowledge-domain(\.js)?$/.test(id) && typeof value.apply === "function") {
    wrapped.add(value);
    const apply = value.apply;
    value.apply = function (tasks, ...rest) {
      const result = apply.call(this, tasks, ...rest);
      (result?.tasks || []).forEach((task, index) => record(
        task.contextualExplanationRuleId || task.knowledgeRule, languageOf((tasks || [])[index])));
      return result;
    };
    const score = value.score;
    value.score = function (rule, task, ...rest) {
      const result = score.call(this, rule, task, ...rest);
      if (result > 0) record(rule?.ruleId, languageOf(task));
      return result;
    };
  }
  if (/knowledge-repository(\.js)?$/.test(id) && typeof value.createRepository === "function") {
    wrapped.add(value);
    const create = value.createRepository;
    value.createRepository = function (...args) {
      const repository = create.apply(this, args);
      if (!repository || typeof repository.resolveAction !== "function") return repository;
      return Object.freeze({ ...repository, resolveAction(query, ...rest) {
        const result = repository.resolveAction(query, ...rest);
        if (result?.status === "resolved") {
          record(result.candidates?.[0]?.provenance?.ruleId, query?.language);
        }
        return result;
      } });
    };
  }
  return value;
};
