// The license administration is available in Swedish and English: both catalogs have the same
// keys and placeholders, and every key used by the page and its script exists.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const directory = path.join(__dirname, "../services/licensing");
const context = {};
vm.runInNewContext(fs.readFileSync(path.join(directory, "admin-i18n.js"), "utf8") +
  "\nthis.ADMIN_TEXT = ADMIN_TEXT; this.ADMIN_LANGUAGES = ADMIN_LANGUAGES;", context);
const { ADMIN_TEXT, ADMIN_LANGUAGES } = context;

assert.deepEqual(Object.keys(ADMIN_LANGUAGES).sort(), ["en", "sv"]);
const svKeys = Object.keys(ADMIN_TEXT.sv).sort();
assert.deepEqual(Object.keys(ADMIN_TEXT.en).sort(), svKeys, "English has exactly the Swedish keys");
const placeholders = text => (text.match(/\{\w+\}/g) || []).sort();
for (const key of svKeys) {
  assert.deepEqual(placeholders(ADMIN_TEXT.en[key]), placeholders(ADMIN_TEXT.sv[key]), `placeholders of ${key}`);
  assert.ok(ADMIN_TEXT.en[key].trim(), `English text for ${key}`);
}
// Lists split on | keep their columns.
for (const key of ["csv.licenses", "csv.audit"]) {
  assert.equal(ADMIN_TEXT.en[key].split("|").length, ADMIN_TEXT.sv[key].split("|").length, key);
}

const html = fs.readFileSync(path.join(directory, "admin.html"), "utf8");
const script = fs.readFileSync(path.join(directory, "admin-ui.js"), "utf8");
const used = new Set([
  ...[...html.matchAll(/data-i18n(?:-placeholder|-label)?="([^"]+)"/g)].map(match => match[1]),
  ...[...script.matchAll(/\bt\("([a-zA-Z]+\.[\w-]+)"/g)].map(match => match[1]),
  ...[...script.matchAll(/"((?:status|filter|kind|type|deleted|confirm|license|backup|auditFilter|users|message|notifications|action|tenantForm|consultantForm|audit|usage|licenses)\.[\w-]+)"/g)].map(match => match[1])
]);
for (const key of used) assert.ok(key in ADMIN_TEXT.sv, `missing text ${key}`);
// Every status filter, event, actor and entity the script looks up by pattern has a text.
for (const filter of ["all", "active", "trial", "pending", "expiring", "inactive"]) assert.ok(`filter.${filter}` in ADMIN_TEXT.sv);
for (const entity of ["consultant", "tenant", "notification", "backup"]) assert.ok(`entity.${entity}` in ADMIN_TEXT.sv);
const server = fs.readFileSync(path.join(directory, "admin.js"), "utf8") +
  fs.readFileSync(path.join(directory, "server.js"), "utf8");
for (const [, action] of server.matchAll(/action: (?:[^"\n]*\? )?"([a-z-]+)"/g)) {
  assert.ok(`event.${action}` in ADMIN_TEXT.sv, `event label for ${action}`);
}
// The page names the language of every text, and Swedish stays the static default.
assert.match(html, /<option value="en" lang="en">English<\/option>/);
assert.match(html, /Administratörsåtkomst/);
console.log("License administration language tests passed.");
