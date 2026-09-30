const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const knowledge = require('../src/engine/knowledge-domain');
const docs = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src/knowledge-packs/electronic-documents.json'), 'utf8'));
const hr = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src/knowledge-packs/human-resources.json'), 'utf8'));
const bank = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src/knowledge-packs/bank-reconciliation.json'), 'utf8'));
const edocMatch = docs.rules.find(rule => rule.ruleId === 'ElectronicDocuments.MatchPurchaseOrderLines');
const edocLink = docs.rules.find(rule => rule.ruleId === 'ElectronicDocuments.UpdatePurchaseOrderLink');
const hrAbsenceCategories = hr.rules.find(rule => rule.ruleId === 'HumanResources.ViewAbsenceByCategories');
const hrAbsenceOverview = hr.rules.find(rule => rule.ruleId === 'HumanResources.OpenAbsenceOverview');
assert.ok(edocMatch);
assert.ok(edocLink);
assert.deepEqual(edocMatch.verifiedRuntimeLocales, ['en-US', 'sv-SE']);
assert.deepEqual(Object.keys(edocMatch.localizedExplanations).sort(), ['da-DK','de-DE','en-US','es-ES','fi-FI','fr-FR','nb-NO','sv-SE']);
assert.deepEqual(edocLink.verifiedRuntimeLocales, ['en-US', 'sv-SE']);
assert.ok(hrAbsenceCategories);
assert.ok(hrAbsenceOverview);
for (const rule of [hrAbsenceCategories, hrAbsenceOverview]) {
  assert.deepEqual(rule.verifiedRuntimeLocales, ['en-US', 'sv-SE']);
  assert.deepEqual(Object.keys(rule.localizedExplanations).sort(), ['da-DK','de-DE','en-US','es-ES','fi-FI','fr-FR','nb-NO','sv-SE']);
}

for (const [pack, ruleId, pageCaption, actionCaption, locale, phrase] of [
  [docs, 'BCExpansion.SendDocument', 'E-Document', 'Send Document', 'en-US', 'Exported means'],
  [docs, 'BCExpansion.SendDocument', 'E-dokument', 'Skicka dokument', 'sv-SE', 'Exporterad betyder'],
  [docs, 'BCExpansion.CreatePurchaseDocument', 'E-Document', 'Create Document', 'en-US', 'Creating the document does not post it'],
  [docs, 'BCExpansion.CreatePurchaseDocument', 'E-dokument', 'Skapa dokument', 'sv-SE', 'Att skapa dokumentet bokför det inte'],
  [docs, 'ElectronicDocuments.MatchPurchaseOrderLines', 'E-Document', 'Match Purchase Order', 'en-US', 'unmatched invoice line can prevent posting'],
  [docs, 'ElectronicDocuments.MatchPurchaseOrderLines', 'E-dokument', 'Matcha inköpsorder', 'sv-SE', 'omatchad fakturarad kan hindra bokföring'],
  [docs, 'ElectronicDocuments.UpdatePurchaseOrderLink', 'E-Document', 'Update Purchase Order Link', 'en-US', 'only before line matching'],
  [docs, 'ElectronicDocuments.UpdatePurchaseOrderLink', 'E-dokument', 'Uppdatera inköpsorderlänk', 'sv-SE', 'endast innan radmatchningen'],
  [hr, 'BCExpansion.CreateEmployee', 'Employees', 'New', 'en-US', 'does not create a user account'],
  [hr, 'BCExpansion.CreateEmployee', 'Anställda', 'Ny', 'sv-SE', 'skapar inget användarkonto'],
  [hr, 'HumanResources.ViewAbsenceByCategories', 'Employees', 'Absences by Categories', 'en-US', 'Show Matrix'],
  [hr, 'HumanResources.ViewAbsenceByCategories', 'Anställda', 'Frånvaro per kategori', 'sv-SE', 'Visa matris'],
  [hr, 'HumanResources.OpenAbsenceOverview', 'Absence Registration', 'Overview by Periods', 'en-US', 'over time'],
  [hr, 'HumanResources.OpenAbsenceOverview', 'Frånvaroregistrering', 'Översikt per kategori', 'sv-SE', 'kategoriöversikten'],
  [bank, 'BCExpansion.MatchAutomatically', 'Bank Acc. Reconciliation', 'Match Automatically', 'en-US', 'Review Match Details'],
  [bank, 'BCExpansion.MatchAutomatically', 'Bankkontoavstämning', 'Matcha automatiskt', 'sv-SE', 'Granska matchningsdetaljer'],
  [bank, 'BCExpansion.PostReconciliation', 'Bank Acc. Reconciliation', 'Post', 'en-US', 'Difference = 0'],
  [bank, 'BCExpansion.PostReconciliation', 'Bankkontoavstämning', 'Bokföra', 'sv-SE', 'Differens = 0'],
]) {
  const result = knowledge.apply([{taskId: ruleId + locale, pageCaption, actionCaption, language: locale}], [pack]).tasks[0];
  assert.equal(result.contextualExplanationRuleId, ruleId);
  assert.ok(result.contextualExplanations[locale].includes(phrase));
}

for (const [pack, pageCaption, actionCaption] of [
  [docs, 'Purchase Orders', 'Send Document'],
  [docs, 'Purchase Orders', 'Match Purchase Order'],
  [docs, 'E-Document', 'Post'],
  [hr, 'Vendor Card', 'New'],
  [hr, 'Absence Registration', 'Post'],
  [bank, 'Payment Reconciliation Journal', 'Post'],
]) {
  const result = knowledge.apply([{taskId: 'wrong-context', pageCaption, actionCaption, language: 'en-US'}], [pack]).tasks[0];
  assert.ok(!String(result.contextualExplanationRuleId || '').startsWith('BCExpansion.'));
}

console.log('E-document, Human Resources and bank reconciliation contexts and boundaries verified.');
