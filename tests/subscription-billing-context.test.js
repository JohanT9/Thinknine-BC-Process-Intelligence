const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const pack = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src/knowledge-packs/subscription-billing.json'), 'utf8'));
const knowledge = require('../src/engine/knowledge-domain');

const manual=pack.rules.find(r=>r.ruleId==='SubscriptionBilling.ManualContractLine');
assert.ok(manual);
assert.deepEqual(manual.verifiedRuntimeLocales,['en-US']);
assert.match(manual.localizedExplanations['sv-SE'],/obligatoriska fält/);
assert.match(manual.localizedExplanations['sv-SE'],/negativt antal/);
for(const [page,field,locale] of [['Customer Subscription Contract','Type','en-US'],['Vendor Subscription Contract Card','Type','en-US']]){const result=knowledge.apply([{taskId:'manual-line',pageCaption:page,fieldCaption:field,language:locale}], [pack]).tasks[0];assert.equal(result.contextualExplanationRuleId,'SubscriptionBilling.ManualContractLine');}
for(const [page,field] of [['Purchase Order','Type'],['Customer Card','Type']]){const result=knowledge.apply([{taskId:'manual-line-wrong',pageCaption:page,fieldCaption:field,language:'en-US'}],[pack]).tasks[0];assert.notEqual(result.contextualExplanationRuleId,'SubscriptionBilling.ManualContractLine');}

for (const [ruleId, pageCaption, actionCaption, locale, phrase] of [
  ['BCExpansion.CreateProposal', 'Recurring Billing', 'Create Billing Proposal', 'en-US', 'Next Billing Date'],
  ['BCExpansion.CreateProposal', 'Återkommande fakturering', 'Skapa faktureringsförslag', 'sv-SE', 'Nästa faktureringsdatum'],
  ['BCExpansion.CreateDocuments', 'Recurring Billing', 'Create Documents', 'en-US', 'contract partner'],
  ['BCExpansion.CreateDocuments', 'Återkommande fakturering', 'Skapa dokument', 'sv-SE', 'avtalspart'],
]) {
  const result = knowledge.apply([{taskId: ruleId + locale, pageCaption, actionCaption, language: locale}], [pack]).tasks[0];
  assert.equal(result.contextualExplanationRuleId, ruleId);
  assert.ok(result.contextualExplanations[locale].includes(phrase));
}

for (const [pageCaption, actionCaption] of [
  ['Purchase Orders', 'Create Documents'],
  ['Sales Invoices', 'Create Billing Proposal'],
]) {
  const result = knowledge.apply([{taskId: 'wrong-context', pageCaption, actionCaption, language: 'en-US'}], [pack]).tasks[0];
  assert.ok(!['BCExpansion.CreateProposal', 'BCExpansion.CreateDocuments'].includes(result.contextualExplanationRuleId));
}

console.log('Subscription billing contexts and boundaries verified.');
