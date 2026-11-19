#!/usr/bin/env node
"use strict";
// Builds src/bug-report/error-labels.js: Business Central's own wording of a few common error
// messages in every registered language, taken from Microsoft's translations of the Base
// Application. A captured message in any language that matches one of them gets the same kind,
// so a possible cause and its checks are written once per kind instead of once per language.
//
// Only the error labels chosen in KINDS are kept. A label is chosen by its English text; its
// translations are the same translation unit in each country's package. Messages from the
// platform itself (permissions, "must have a value") are not in the Base Application and stay
// with the rules in error-cause.js.
//
// Messages from the platform itself (a field without a value, a missing record, permissions) come
// from the Business Central server's language resources instead: Service/<culture>/
// Microsoft.Dynamics.Nav.Language.resources.dll in the platform artifact, read with
// scripts/dotnet-resources.js. Each message has the same resource name in every language, and
// PLATFORM says which value ({0}, {1}…) is the field, the table or the record, so a suggestion can
// quote those names from the captured message in any language.
//
// The packages are the same as for scripts/build-bc-captions.js (Microsoft_Base Application_<version>.app
// per country); the resource files come from the platform artifact. Neither is ever committed.
//
// src/bug-report/error-known.json holds every error that the AL source of the Base Application and
// Microsoft's other apps shows (src/bug-report/al-errors.js): its wording in each language, the object
// and app that show it, and the actions Microsoft offers in the error (ErrorInfo.AddAction).
// usage: node scripts/build-error-labels.js <folder with us.app se.app fr.app de.app es.app dk.app fi.app no.app>
//          <folder with en-US.dll sv-SE.dll fr-FR.dll de-DE.dll es-ES.dll da-DK.dll fi-FI.dll nb-NO.dll> <platform version>
//          <folder with Microsoft's other .app files, from the Applications and Extensions folders of an artifact>
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const { readStrings } = require("./dotnet-resources");
const { errors: alErrors } = require("../src/bug-report/al-errors.js");
const { openApp, readLabels, appErrors: readAppErrors, knownTable: buildKnownTable } = require("../src/bug-report/app-errors.js");

const LOCALES = ["en-US", "sv-SE", "fr-FR", "de-DE", "es-ES", "da-DK", "fi-FI", "nb-NO"];
const COUNTRIES = { "en-US": "us", "sv-SE": "se", "fr-FR": "fr", "de-DE": "de", "es-ES": "es",
  "da-DK": "dk", "fi-FI": "fi", "nb-NO": "no" };
const OUT = path.join(__dirname, "..", "src", "bug-report", "error-labels.js");
const KNOWN_OUT = path.join(__dirname, "..", "src", "bug-report", "error-known.json");

// The kinds of error kept, each with the English wording of its labels. A question ("Do you
// want…") is not an error and is left out.
const KINDS = [
  { kind: "posting-date", english: [/not within (?:your|the) range of allowed posting dates/u] },
  { kind: "nothing-to-post", english: [/^There is nothing to post/u] },
  { kind: "out-of-balance", english: [/^(?:%1 %2 is|The total of the lines is|As of %1, the lines are) out of balance by %\d\.?$/u] },
  { kind: "already-scheduled", english: [/cannot be posted because it has already been scheduled for posting/u] },
  { kind: "not-on-inventory", english: [/^You have insufficient quantity of Item %1 on inventory\.$/u,
    /^%1 %2 is not on inventory(?: for %3 %4)?\.$/u,
    /^%1 %2 is not available in inventory, it has already been reserved for another document/u] },
  { kind: "dimension-blocked", english: [/^The combination of dimensions used in %1 %2(?:, %3, %4)? is blocked\./u] },
  { kind: "posting-setup-missing", english: [/^VAT Posting Setup does not exist\./u,
    /^Inventory posting setup missing for location code %1\.$/u] },
  { kind: "record-blocked", english: [/^%1 %2 is blocked\.(?: You cannot import entries\.)?$/u] },
  // { pattern, params }: the values of the message that the cause names, by their number.
  { kind: "number-series", english: [{ pattern: /^You cannot assign new numbers from the number series %1(?: on %2| on a date before %2)?\.$/u,
    params: { series: 1 } }] },
  { kind: "posted-number-used", english: [{ pattern: /^Cannot post the .+ because its ID, %1, is already assigned to a record\. Update the number series and try again\.$/u,
    params: { number: 1 } }] },
  { kind: "dimension-mandatory", english: [{ pattern: /^Select a %1 for the %2 %3 for %4 %5\.$/u,
    params: { dimension: [2, 3], record: [4, 5] } }] },
  { kind: "item-tracking-required", english: [{ pattern: /^You must assign a (?:lot|serial|package) number for item %1\.$/u,
    params: { item: 1 } }] },
  { kind: "item-tracking-mismatch", english: [/^%1 in the item tracking assigned to the document line for item %2 is currently %3\. It must be %4\./u,
    /^Qty\. to Handle \(Base\) in the item tracking for item %1 in assembly document %2, line %3 is currently %4\. It must be %5\.$/u] },
  { kind: "approval-required", english: [/^(?:Purchase|Sales) %1 %2 must be approved and released before you can perform this action\.$/u,
    /^Cannot post (?:purchase|sales) document no\. %1 of type %2 (?:because it is pending approval|due to the approval workflow)\.$/u] },
  { kind: "duplicate-external-doc", english: [{ pattern: /^Purchase %1 %2 already exists for this vendor\.$/u,
    params: { document: [1, 2] } }] },
  { kind: "nothing-to-handle", english: [/^(?:There is n|N)othing to handle\b/u] },
  { kind: "warehouse-handling-required", english: [/^Warehouse handling is required for /u, /^Warehouse %1 is required for %2 = %3\.$/u] },
  { kind: "accounting-period-missing", english: [/^The deferral schedule falls outside the accounting periods that have been set up for the company\.$/u,
    /^No accounting periods have been set up\./u, /^There are not enough accounting periods set up/u,
    /^The next accounting period for workdate %1 is not defined\./u] }
];
const kindPatterns = KINDS.flatMap(({ kind, english }) => english.map(item =>
  item instanceof RegExp ? { kind, pattern: item, params: {} } : { kind, ...item }));
const kindOf = english => kindPatterns.find(item => item.pattern.test(english)) || null;

// Platform messages by resource name: the kind, and which value of the message is which name.
// A list of numbers is joined: {0} {1} {2} is the object type, number and name ("TableData 18 Customer").
const PLATFORM = [
  { key: "FieldMustBeNonblank", kind: "required-value", params: { field: 0, table: 1, record: 2 } },
  { key: "FieldMustBeEqualTo", kind: "field-must-equal", params: { field: 0, table: 1, expected: 2, current: 3, record: 4 } },
  { key: "RecordNotFoundError", kind: "record-missing", params: { table: 0, record: 1 } },
  { key: "RelatedRecordNotFound", kind: "related-missing", params: { field: 0, table: 1, value: 2, related: 3 } },
  { key: "DuplicateKeyError", kind: "record-exists", params: { table: 0, record: 1 } },
  { key: "ThisOrAnotherUserChangedTheDataError", kind: "changed-by-other", params: { table: 0, record: 1 } },
  { key: "ThisUserChangedTheDataError", kind: "changed-by-other", params: { table: 0, record: 1 } },
  { key: "ODataConcurrencyCheckErrorMessage", kind: "changed-by-other", params: {} },
  { key: "DeadLockError", kind: "deadlock", params: { table: 0 } },
  { key: "DeadLockErrorNoTable", kind: "deadlock", params: {} },
  { key: "MissingPermissions", kind: "permission", params: { object: [0, 1, 2], permission: 3 } },
  { key: "MissingPermissionsForCompany", kind: "permission", params: { object: [0, 1, 2], permission: 3 } },
  { key: "MissingSystemPermissions", kind: "permission", params: { permission: 0 } },
  { key: "MissingLicensePermissions", kind: "license-permission", params: { object: [0, 1, 2], permission: 3 } },
  { key: "MissingLicensePermissionsForCompany", kind: "license-permission", params: { object: [0, 1, 2], permission: 3 } },
  { key: "00095-50063", kind: "not-an-option", params: { value: 0, options: 1 } },
  // Permissions without names, and a call or connection that failed or timed out, in every
  // language instead of only the English and Swedish wording of the rules.
  { key: "SuperRoleRequired", kind: "permission", params: {} },
  { key: "ScheduledTasksNotAllowed", kind: "permission", params: {} },
  { key: "CannotInsertTableRecords", kind: "permission", params: {} },
  { key: "ErrorNoExecutePermission", kind: "permission", params: {} },
  { key: "HttpRequestError", kind: "network-unavailable", params: {} },
  { key: "HttpRequestErrorWithRequestError", kind: "network-unavailable", params: {} },
  { key: "HttpDefaultError", kind: "network-unavailable", params: {} },
  { key: "TimeoutExceptionString", kind: "network-unavailable", params: {} },
  { key: "RequestTimedOut", kind: "network-unavailable", params: {} },
  { key: "Message_CommunicationErrorTimedOut", kind: "network-unavailable", params: {} },
  { key: "ConnectionNotAvailableDescription", kind: "network-unavailable", params: {} },
  { key: "JsonRPC_GenericConnectionError", kind: "network-unavailable", params: {} },
  { key: "JsonRPC_TimeoutError", kind: "network-unavailable", params: {} },
  { key: "CrmConnectionFailure", kind: "network-unavailable", params: {} },
  { key: "CrmOpenConnectionTimeout", kind: "network-unavailable", params: {} },
  { key: "GraphConnectionFailure", kind: "network-unavailable", params: {} }
];

// An .app file, read with the same code the extension uses for the apps a user adds.
const readApp = file => openApp(fs.readFileSync(file), bytes => zlib.inflateRawSync(bytes));
// Microsoft's apps without their AL source are left out, as their errors cannot be told apart.
const appErrors = (app, perLocale) => readAppErrors(app, { locales: LOCALES, perLocale, alErrors, fromLabels: false });
const knownTable = apps => buildKnownTable(apps, { locales: LOCALES, kindOf });

async function main() {
  const folder = process.argv[2];
  if (!folder) throw new Error("usage: node scripts/build-error-labels.js <folder with the country .app files>");
  const perLocale = {};
  let version = "";
  for (const locale of LOCALES) {
    const file = path.join(folder, `${COUNTRIES[locale]}.app`);
    const zip = await readApp(file);
    const manifest = await zip.text("NavxManifest.xml");
    version = version || /\bVersion="([^"]+)"/u.exec(manifest)?.[1] || "";
    const translated = zip.files.find(name => name.endsWith(`.${locale}.xlf`));
    const generated = locale === "en-US" &&
      zip.files.find(name => /^Translations\/.*\.g\.xlf$/u.test(name));
    if (!translated && !generated) throw new Error(`No translation file for ${locale} in ${file}`);
    perLocale[locale] = readLabels(await zip.text(translated || generated), !translated);
    console.error(`${locale}: ${perLocale[locale].size} labels`);
  }
  const kinds = {};
  for (const { kind } of KINDS) {
    // A label is kept as its text, or as [text, params] when the cause names some of its values.
    const texts = Object.fromEntries(LOCALES.map(locale => [locale, new Map()]));
    for (const [id, source] of perLocale["en-US"]) {
      const found = kindOf(source);
      if (found?.kind !== kind) continue;
      for (const locale of LOCALES) {
        const value = perLocale[locale].get(id);
        if (value) texts[locale].set(value, Object.keys(found.params).length ? [value, found.params] : value);
      }
    }
    // A kind that only other apps have (the number series of Business Foundation) is in the known errors.
    const missing = LOCALES.filter(locale => !texts[locale].size);
    if (missing.length && missing.length < LOCALES.length) throw new Error(`${kind}: no label in ${missing.join(", ")}`);
    kinds[kind] = Object.fromEntries(LOCALES.map(locale => [locale, [...texts[locale].keys()].sort()
      .map(value => texts[locale].get(value))]));
    console.error(`${kind}: ${LOCALES.map(locale => `${locale} ${texts[locale].size}`).join(", ")}`);
  }
  const platform = [];
  const platformFolder = process.argv[3];
  const platformVersion = process.argv[4];
  if (!platformFolder || !platformVersion) throw new Error("the platform resource folder and its version are required");
  const resources = Object.fromEntries(LOCALES.map(locale =>
    [locale, readStrings(fs.readFileSync(path.join(platformFolder, `${locale}.dll`)))]));
  for (const entry of PLATFORM) {
    const texts = Object.fromEntries(LOCALES.map(locale => [locale, resources[locale].get(entry.key)]));
    const missing = LOCALES.filter(locale => !texts[locale]);
    if (missing.length) throw new Error(`${entry.key}: no message in ${missing.join(", ")}`);
    platform.push({ ...entry, texts });
  }
  console.error(`platform: ${platform.length} messages in ${LOCALES.length} languages`);
  const appsFolder = process.argv[5];
  if (!appsFolder) throw new Error("the folder with Microsoft's other apps is required");
  const apps = [await appErrors(await readApp(path.join(folder, "us.app")), perLocale)];
  // Each country's Base Application has errors of its own (a French SIRET number), in its own
  // language and English.
  for (const locale of LOCALES.slice(1)) {
    apps.push(await appErrors(await readApp(path.join(folder, `${COUNTRIES[locale]}.app`))));
  }
  for (const file of fs.readdirSync(appsFolder).filter(name => name.endsWith(".app")).sort()) {
    const app = await appErrors(await readApp(path.join(appsFolder, file)));
    if (app.errors.length) apps.push(app);
  }
  const known = knownTable(apps);
  for (const { kind } of KINDS) {
    if (!kinds[kind]["en-US"].length && !known.errors.some(entry => entry[3] === kind)) {
      throw new Error(`${kind}: no label in any app`);
    }
  }
  fs.writeFileSync(KNOWN_OUT, `${JSON.stringify({ source: `Microsoft Base Application ${version} for ${LOCALES.length} countries and ${known.apps.length - 1} other Microsoft apps`,
    locales: LOCALES, ...known })}
`);
  console.error(`known errors: ${known.errors.length} from ${known.apps.length} apps, ${known.errors.filter(entry => entry[2]?.length).length} with actions`);
  // The version the box names ("Business Central 29.1"): major and minor of the Base Application.
  const data = JSON.stringify({ source: `Microsoft Base Application ${version}`,
    businessCentral: version.split(".").slice(0, 2).join("."),
    platformSource: `Business Central platform ${platformVersion}`, kinds, platform }, null, 1);
  fs.writeFileSync(OUT, `(function (root, data) {
  if (typeof module === "object" && module.exports) module.exports = data;
  root.T9ErrorLabels = data;
})(typeof globalThis !== "undefined" ? globalThis : this,
// Generated by scripts/build-error-labels.js from Microsoft's translations; do not edit by hand.
// %1, %2… are the values Business Central puts into the message.
${data});
`);
  console.error(`Wrote ${path.relative(process.cwd(), OUT)}`);
}

main().catch(error => { console.error(error); process.exit(1); });
