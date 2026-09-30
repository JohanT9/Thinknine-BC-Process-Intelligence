const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const pack = JSON.parse(fs.readFileSync(path.join(root, 'src/knowledge-packs/services.json'), 'utf8'));
const knowledge = require('../src/engine/knowledge-domain');
const locales = require('../src/engine/language-registry').supported().map(x => x.locale).sort();

const rule = pack.rules.find(r => r.ruleId === 'Services.ConvertAcceptedQuoteToOrder');
assert.ok(rule, 'accepted service quote conversion rule exists');
assert.deepEqual(Object.keys(rule.localizedExplanations).sort(), locales);

for (const [locale, pageCaption, actionCaption] of [
  ['en-US', 'Service Quotes', 'Make Order'],
  ['sv-SE', 'Offerter för tjänstkontrakt', 'Skapa order'],
]) {
  const result = knowledge.apply([{
    taskId: `convert-${locale}`,
    pageCaption,
    actionCaption,
    language: locale,
  }], [pack]).tasks[0];
  assert.equal(result.contextualExplanationRuleId, rule.ruleId);
  assert.ok(result.contextualExplanations[locale].includes(locale === 'sv-SE' ? 'serviceorder' : 'service order'));
  assert.ok(result.contextualExplanationSources.some(s => s.sourceId === 'microsoft-learn-service-create-order'));
}

for (const [pageCaption, actionCaption] of [
  ['Purchase Orders', 'Make Order'],
  ['Service Orders', 'Make Order'],
]) {
  const result = knowledge.apply([{ taskId: 'wrong-context', pageCaption, actionCaption, language: 'en-US' }], [pack]).tasks[0];
  assert.notEqual(result.contextualExplanationRuleId, rule.ruleId, `${pageCaption} must not match quote conversion`);
}

console.log('Service quote conversion context and localized explanations verified.');
