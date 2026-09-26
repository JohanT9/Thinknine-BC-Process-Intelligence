const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const packDir = path.join(root, 'src', 'knowledge-packs');
const locales = ['en-us', 'sv-se', 'fr-fr', 'de-de', 'es-es', 'da-dk', 'fi-fi', 'nb-no'];
const packs = Object.fromEntries(fs.readdirSync(packDir)
  .filter((file) => file.endsWith('.json'))
  .map((file) => [file.replace(/\.json$/, ''), require(path.join(packDir, file))]));
const sources = Object.values(packs).flatMap((pack) => pack.sources || []);
const byId = new Map(sources.map((source) => [source.sourceId, source]));

for (const source of sources) {
  assert.ok(source.sourceId, `${source.title || 'source'} has a sourceId`);
  assert.ok(source.sourceUri, `${source.sourceId} has a URI`);
  assert.ok(Array.isArray(source.fields) && source.fields.length > 0, `${source.sourceId} has documented fields`);
}

const fallbackSources = sources.filter((source) => /English source fallback|official English source used/i.test(`${source.title} ${source.appliesTo}`));
const expectedFallbackIds = [
  'microsoft-learn-finance-disposal-fi-fi',
  'microsoft-learn-finance-insurance-fi-fi',
  'microsoft-learn-finance-preclose-reports-fi-fi',
  'microsoft-learn-finance-close-statement-reports-nb-no',
  'microsoft-learn-finance-period-end-activities-fi-fi',
];
assert.deepEqual(fallbackSources.map((source) => source.sourceId).sort(), expectedFallbackIds.sort(), 'English fallbacks stay explicit and are reviewed when locale coverage changes');
for (const source of fallbackSources) {
  assert.match(source.sourceUri, /learn\.microsoft\.com\/en-us\//, `${source.sourceId} points to the English source`);
  assert.match(source.appliesTo, /fallback|English source/i, `${source.sourceId} identifies the locale fallback`);
}

const warehouse = packs.warehouse.sources;
const physicalInventory = warehouse.filter((source) => source.sourceId.startsWith('microsoft-learn-warehouse-physical-inventory-'));
assert.equal(physicalInventory.length, locales.length, 'physical inventory source exists for every supported locale');
for (const locale of locales) {
  const source = byId.get(`microsoft-learn-warehouse-physical-inventory-${locale}`);
  assert.ok(source, `physical inventory source exists for ${locale}`);
  assert.match(source.sourceUri, new RegExp(`learn\\.microsoft\\.com/${locale}/`), `${locale} inventory source is localized`);
  assert.doesNotMatch(source.title, /prepayment|förskott|acompte|anzahlung/i, `${locale} inventory title describes inventory`);
}

for (const locale of locales) {
  const shortSuffix = locale === 'en-us' ? '' : locale === 'sv-se' ? '-sv' : `-${locale.split('-')[0]}`;
  const reconciliation = byId.get(`microsoft-learn-payment-reconciliation${shortSuffix}`);
  assert.ok(reconciliation, `payment reconciliation source exists for ${locale}`);
  assert.match(reconciliation.sourceUri, new RegExp(`learn\\.microsoft\\.com/${locale}/`), `${locale} reconciliation source is localized`);
  const vendor = byId.get(`microsoft-learn-vendor-payments${shortSuffix}`);
  assert.ok(vendor, `vendor payment source exists for ${locale}`);
  if (locale !== 'fi-fi') assert.match(vendor.sourceUri, new RegExp(`learn\\.microsoft\\.com/${locale}/.*payables-how-suggest-vendor-payments`), `${locale} source describes vendor payment proposals`);
}
assert.match(byId.get('microsoft-learn-vendor-payments-fi').sourceUri, /fi-fi\/dynamics365\/business-central\/localfunctionality\/finland\//, 'Finnish vendor payment source uses Finnish functionality documentation');

for (const locale of locales) {
  const source = byId.get(`microsoft-learn-finance-vat-submission-${locale}`);
  assert.ok(source, `VAT reporting source exists for ${locale}`);
  assert.ok(source.fields.some((field) => /VAT Settlement/i.test(field)), `${locale} VAT source covers settlement`);
  assert.ok(source.fields.some((field) => /Test Mode/i.test(field)), `${locale} VAT source distinguishes test mode`);
}

const danishContracts = byId.get('microsoft-learn-service-contracts-da-dk');
assert.match(danishContracts.sourceUri, /da-dk\/dynamics365\/business-central\/service-how-to-create-service-contracts-and-service-contract-quotes/);
assert.doesNotMatch(danishContracts.appliesTo, /English source fallback/i);

console.log(`Knowledge source integrity passed (${sources.length} sources, ${locales.length} supported locales, ${fallbackSources.length} explicit English fallbacks).`);
