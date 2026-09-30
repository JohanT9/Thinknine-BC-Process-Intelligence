const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const pack = JSON.parse(fs.readFileSync(path.join(root, 'src/knowledge-packs/intercompany.json'), 'utf8'));
const knowledge = require('../src/engine/knowledge-domain');
const locales = require('../src/engine/language-registry').supported().map(x => x.locale).sort();
const rules = [
  { id: 'BCExpansion.ImportInbox', en: 'on-premises', sv: 'on-premises' },
  { id: 'BCExpansion.CompleteInbox', en: 'does not post', sv: 'bokför dem inte' },
  { id: 'BCExpansion.SendOutbox', en: 'does not reverse', sv: 'återför inte' },
];
const setupRule = pack.rules.find(r => r.ruleId === 'Intercompany.SetupAccountsAndDimensions');
assert.ok(setupRule, 'account and dimension mapping setup scenario exists');
assert.deepEqual(Object.keys(setupRule.localizedExplanations).sort(), locales);
assert.deepEqual(setupRule.verifiedRuntimeLocales, ['en-US', 'sv-SE']);
for (const [locale, pageCaption, actionCaption] of [
  ['en-US', 'Intercompany Setup', 'IC Chart of Accounts'],
  ['sv-SE', 'Företagsintern installation', 'Koncernintern kontoplan'],
]) {
  const task = knowledge.apply([{ taskId: 'ic-setup-' + locale, pageCaption, actionCaption, language: locale }], [pack]).tasks[0];
  assert.equal(task.contextualExplanationRuleId, setupRule.ruleId, `setup maps in ${locale}`);
  assert.ok(task.contextualExplanations[locale]);
  assert.ok(setupRule.sourceIds.some(id => id.endsWith(locale.toLowerCase())));
}
for (const [pageCaption, actionCaption] of [
  ['Intercompany Inbox Transactions', 'Import Transaction File'],
  ['Purchase Orders', 'New'],
  ['Intercompany Setup', 'Import Transaction File'],
]) assert.equal(knowledge.score(setupRule, { pageCaption, actionCaption, entity: '', context: {} }), 0, `${pageCaption} / ${actionCaption} is outside mapping setup`);
for (const locale of locales) {
  assert.match(setupRule.localizedExplanations[locale], /both|både till och från|dans les deux sens|in beide Richtungen|en ambas direcciones|i begge retninger|molempiin suuntiin|begge veier/i, `bidirectional mapping in ${locale}`);
}
for (const expected of rules) {
  const rule = pack.rules.find(r => r.ruleId === expected.id);
  assert.ok(rule, `${expected.id} exists`);
  assert.deepEqual(Object.keys(rule.localizedExplanations).sort(), locales);
  for (const locale of locales) assert.ok(rule.localizedExplanations[locale].length > 150, `${expected.id} has contextual explanation in ${locale}`);
  for (const [locale, pageCaption, actionCaption] of [
    ['en-US', expected.id === rules[2].id ? 'Intercompany Outbox Transactions' : 'Intercompany Inbox Transactions', expected.id === rules[0].id ? 'Import Transaction File' : expected.id === rules[1].id ? 'Complete IC Inbox Action' : 'Send to Intercompany Partner'],
    ['sv-SE', expected.id === rules[2].id ? 'Koncerninterna utkorgstransaktioner' : 'Koncerninterna inkorgstransaktioner', expected.id === rules[0].id ? 'Importera transaktionsfil' : expected.id === rules[1].id ? 'Slutför IC-inkorgsåtgärd' : 'Skicka till en koncernintern partner'],
  ]) {
    const task = knowledge.apply([{ taskId: expected.id + locale, pageCaption, actionCaption, language: locale }], [pack]).tasks[0];
    assert.equal(task.contextualExplanationRuleId, expected.id, `${expected.id} matches ${locale} page/action context`);
    assert.ok(task.contextualExplanations[locale]);
  }
  const wrongContext = knowledge.apply([{ taskId: 'wrong-context', pageCaption: 'Purchase Orders', actionCaption: 'New', language: 'en-US' }], [pack]).tasks[0];
  assert.notEqual(wrongContext.contextualExplanationRuleId, expected.id, `${expected.id} does not match purchase order creation`);
}
assert.match(pack.rules.find(r => r.ruleId === 'BCExpansion.ImportInbox').localizedExplanations['en-US'], /on-premises/);
assert.match(pack.rules.find(r => r.ruleId === 'BCExpansion.ImportInbox').localizedExplanations['sv-SE'], /on-premises/);
assert.match(pack.rules.find(r => r.ruleId === 'BCExpansion.CompleteInbox').localizedExplanations['en-US'], /does not post/);
assert.match(pack.rules.find(r => r.ruleId === 'BCExpansion.CompleteInbox').localizedExplanations['sv-SE'], /bokför dem inte/);
assert.match(pack.rules.find(r => r.ruleId === 'BCExpansion.SendOutbox').localizedExplanations['en-US'], /does not reverse/);
assert.match(pack.rules.find(r => r.ruleId === 'BCExpansion.SendOutbox').localizedExplanations['sv-SE'], /återför inte/);
console.log('Intercompany contexts, eight localized explanations and purchase-order boundary verified.');
