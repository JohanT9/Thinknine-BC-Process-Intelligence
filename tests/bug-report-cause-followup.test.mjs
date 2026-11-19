import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { project as pdfProject } from "../src/bug-report/report-pdf.mjs";

const require = createRequire(import.meta.url);
const cause = require("../src/bug-report/error-cause.js");
const model = require("../src/bug-report/bug-report-model.js");
const generator = require("../src/bug-report/bug-report-generator.js");
const issuePackage = require("../src/bug-report/issue-package.js");
const markdown = require("../src/bug-report/issue-package-markdown.js");
const service = require("../src/bug-report/bug-report-service.js");
const history = require("../src/document/test-history.js");
const languages = require("../src/engine/language-registry.js");
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
// The most common errors of Microsoft's apps, which get a cause of their own.
const COMMON_KINDS = ["number-series", "posted-number-used", "dimension-mandatory", "item-tracking-required",
  "item-tracking-mismatch", "approval-required", "duplicate-external-doc", "nothing-to-handle",
  "warehouse-handling-required", "accounting-period-missing"];

// 1. A possible cause is read only from what the error message says, and every name it shows
// is quoted from the message.
{
  const kind = message => cause.suggest([message])?.kind || null;
  const params = message => cause.suggest([message])?.params;
  assert.equal(kind("Du har inte följande behörigheter för TableData Försäljningsleverans: Infoga."), "permission");
  assert.deepEqual({ ...params("Du har inte följande behörigheter för TableData Försäljningsleverans: Infoga.") },
    { object: "TableData Försäljningsleverans", permission: "Infoga" });
  assert.deepEqual({ ...params("Sorry, the current permissions prevented the action. (TableData 18 Customer Read: Base Application)") },
    { object: "TableData 18 Customer", permission: "Read" });
  assert.deepEqual({ ...params("You do not have the following permissions on TableData Sales Shipment Header: Insert.\n\nContact your system administrator.") },
    { object: "TableData Sales Shipment Header", permission: "Insert" });
  assert.deepEqual({ ...params("Posting Date must have a value in Sales Header: Document Type=Order, No.=1001. It cannot be zero or empty.") },
    { field: "Posting Date", table: "Sales Header", record: "Document Type=Order, No.=1001" });
  assert.deepEqual({ ...params("Bokföringsdatum måste ha ett värde i Inköpshuvud.") },
    { field: "Bokföringsdatum", table: "Inköpshuvud" });
  assert.equal(kind("Det gick inte att ansluta till fjärrtjänsten. HTTP 503 Service Unavailable."), "network-unavailable");
  assert.equal(kind("Die Anfrage ist fehlgeschlagen: HTTP 401"), "network-rejected",
    "a status code is recognized in any language");
  assert.equal(kind("The operation timed out."), "network-unavailable");
  // Messages that say nothing about their cause get none: no guess.
  for (const message of ["Det finns ingenting att bokföra.", "Kundens kreditgräns har överskridits.",
    "Kunden är spärrad och kan inte användas på dokumentet.", "", "Ett fel inträffade."]) {
    assert.equal(cause.suggest([message]), null, message);
  }
  // The primary error comes first; a later error is used when the first says nothing.
  assert.equal(cause.suggest(["Ett fel inträffade.", "Bokföringsdatum måste ha ett värde i Inköpshuvud."]).kind,
    "required-value");
}

// 1b. Business Central's own error messages are recognized in every registered language from
// Microsoft's wording (error-labels.js), and the cause is worded in every language.
{
  const labels = require("../src/bug-report/error-labels.js");
  const locales = languages.supported("ui").map(item => item.locale);
  assert.match(labels.source, /^Microsoft Base Application \d/u);
  const kinds = Object.keys(labels.kinds);
  assert.ok(kinds.length >= 8, "the common errors are in the table");
  for (const kind of kinds) {
    assert.deepEqual(Object.keys(labels.kinds[kind]).sort(), [...locales].sort(), `${kind} covers every language`);
    for (const locale of locales) {
      for (const item of labels.kinds[kind][locale]) {
        // A label is the wording, or the wording and which of its values are names the cause shows.
        const [label, names = {}] = Array.isArray(item) ? item : [item];
        // Business Central fills in the values; a backslash is a line break.
        const message = label.replace(/%(\d+)/gu, (all, number) => `Värde${number} 10${number}0`)
          .replace(/\\+/gu, "\n");
        const found = cause.suggest([message]);
        assert.equal(found?.kind, kind, `${locale} ${kind}: ${message}`);
        assert.equal(found.source, "bc-label");
        assert.deepEqual(Object.keys(found.params).sort(), Object.keys(names).sort(),
          `${locale} ${kind}: only the names the label marks are taken from the message`);
        for (const value of Object.values(found.params)) assert.ok(message.includes(value), `${locale} ${kind} quotes ${value}`);
      }
      const described = cause.describe({ kind, params: {}, source: "bc-label" }, locale);
      assert.ok(described?.text, `${locale} ${kind} text`);
      assert.equal(described.checks.length, 3, `${locale} ${kind} checks`);
      assert.ok(described.why, `${locale} ${kind} why`);
      if (locale !== "en-US") {
        assert.notEqual(described.text, cause.describe({ kind, params: {}, source: "bc-label" }, "en-US").text,
          `${locale} ${kind} is translated`);
      }
    }
  }
  // A field error puts the field and the record around the label; it is still recognized.
  assert.equal(cause.suggest(["Posting Date is not within your range of allowed posting dates in Gen. Journal Line: Journal Template Name=GENERAL, Line No.=10000"]).kind,
    "posting-date");
  assert.equal(cause.suggest(["Bokföringsdatum är inte i ditt tillåtna intervall för bokföringsdatum i Försäljningshuvud: Dokumenttyp=Order, Nr=1001."]).kind,
    "posting-date");
  // A short label must be the whole message or a whole line of it, so ordinary text is not taken for it.
  assert.equal(cause.suggest(["Asiakas 10000 on estetty."]).kind, "record-blocked");
  assert.equal(cause.suggest(["Fehler beim Buchen\nDebitor 10000 ist gesperrt."]).kind, "record-blocked");
  assert.equal(cause.suggest(["Kunden 10000 är spärrad för leverans men ordern skapades ändå."]), null);
  // The most specific label wins: a blocked dimension combination is not a blocked record.
  assert.equal(cause.suggest(["Kombinationen av dimensioner använda i Försäljningshuvud Order, 1001 är spärrad. AVDELNING och PROJEKT kan inte kombineras."]).kind,
    "dimension-blocked");
  // A message the platform table does not have keeps its rule and its quoted names.
  assert.equal(cause.suggest(["You do not have the following permissions on TableData Sales Shipment Header: Insert."]).ruleId,
    "permission-following-en");
}

// 1c. The platform's own messages (a field without a value, a missing record, permissions…) are
// recognized in every registered language, and the names are read from the message itself.
{
  const labels = require("../src/bug-report/error-labels.js");
  const locales = languages.supported("ui").map(item => item.locale);
  assert.match(labels.platformSource, /^Business Central platform \d/u);
  assert.ok(labels.platform.length >= 16, "the common platform messages are in the table");
  for (const entry of labels.platform) {
    assert.deepEqual(Object.keys(entry.texts).sort(), [...locales].sort(), `${entry.key} covers every language`);
    for (const locale of locales) {
      // Business Central fills in every value; the values here are distinct words.
      const message = entry.texts[locale].replace(/\{(\d+)\}/gu, (all, number) => `Namn${number}x`);
      const found = cause.suggest([message]);
      assert.equal(found?.kind, entry.kind, `${locale} ${entry.key}: ${message}`);
      assert.equal(found.source, "bc-platform", `${locale} ${entry.key}`);
      const expected = Object.fromEntries(Object.entries(entry.params).map(([name, numbers]) =>
        [name, [numbers].flat().map(number => `Namn${number}x`).join(" ")]));
      assert.deepEqual({ ...found.params }, expected, `${locale} ${entry.key} names`);
      const described = cause.describe(found, locale);
      assert.ok(described?.text && !/\{\w+\}/u.test(described.text), `${locale} ${entry.key} text`);
      assert.equal(described.checks.length, 3, `${locale} ${entry.key} checks`);
      assert.equal(described.why, cause.describe({ ...found }, locale).why);
      assert.ok(described.why, `${locale} ${entry.key} why`);
      for (const value of Object.values(expected).filter(value => /Namn[1-3]x/u.test(value))) {
        if (["field", "object", "permission", "value"].some(name => expected[name] === value)) {
          assert.ok(`${described.text} ${described.checks.join(" ")}`.includes(value),
            `${locale} ${entry.key} quotes ${value}`);
        }
      }
    }
  }
  // Business Central's real wording, with quotes, a record that has quotes inside and advice after it.
  const params = message => ({ ...cause.suggest([message])?.params });
  assert.deepEqual(params("Status must be equal to 'Released'  in Sales Header: Document Type=Order, No.=1001. Current value is 'Open'."),
    { field: "Status", table: "Sales Header", expected: "Released", current: "Open", record: "Document Type=Order, No.=1001" });
  assert.deepEqual(params("'Buchungsdatum' muss in 'Verkaufskopf' einen Wert enthalten: 'Belegart=Auftrag, Nr.=1001'. Der Wert darf nicht null oder leer sein."),
    { field: "Buchungsdatum", table: "Verkaufskopf", record: "Belegart=Auftrag, Nr.=1001" });
  assert.deepEqual(params("The General Posting Setup does not exist. Identification fields and values: Gen. Bus. Posting Group='DOMESTIC',Gen. Prod. Posting Group='RETAIL'"),
    { table: "General Posting Setup", record: "Gen. Bus. Posting Group='DOMESTIC',Gen. Prod. Posting Group='RETAIL'" });
  assert.deepEqual(params("Nykyiset käyttöoikeudet ovat estäneet toiminnon. (TableData 18 Asiakas Lue: Base Application)"),
    { object: "TableData 18 Asiakas", permission: "Lue" });
  assert.equal(cause.suggest(["Your license does not grant you the following permissions on TableData 5050 Contact: Insert.\n\nTo view details about your permissions, see the Effective Permissions page."]).kind,
    "license-permission", "the advice after the names may change between versions");
  // An empty current value gives the wording without it.
  const empty = cause.suggest(["Status muss in 'Verkaufskopf' gleich 'Freigegeben' sein: 'Belegart=Auftrag, Nr.=1001'. Der aktuelle Wert ist ''."]);
  assert.equal(empty.params.current, undefined);
  assert.equal(cause.describe(empty, "en-US").text, "Status must be Freigegeben for the action, and it is not.");
}

// 1d. Every error message of Microsoft's apps is known in every language it is translated to,
// with the object and app that show it and the actions Microsoft offers in it.
{
  const known = require("../src/bug-report/error-known.json");
  const labels = require("../src/bug-report/error-labels.js");
  const locales = languages.supported("ui").map(item => item.locale);
  assert.deepEqual([...known.locales].sort(), [...locales].sort(), "the known errors cover every language");
  assert.equal(known.apps[0], "Base Application");
  assert.ok(known.apps.length > 30 && known.errors.length > 4000, "the Base Application and Microsoft's other apps");
  const size = readFileSync(new URL("../src/bug-report/error-known.json", import.meta.url)).length;
  assert.ok(size < 6 * 1024 * 1024, `the table stays loadable (${size} bytes)`);
  // A message in any language is recognized as its error, with where it comes from. A label with
  // almost no fixed text ("No %1 for %2 %3.") is too general to be recognized, and a label can
  // have the same wording as another one, so nearly all are found, most with their own object.
  let checked = 0;
  let recognized = 0;
  let exact = 0;
  const missed = [];
  const started = Date.now();
  known.errors.forEach((entry, index) => {
    if (index % 20) return;
    entry[1].forEach((texts, position) => [].concat(texts || []).forEach(label => {
      const message = label.replace(/%(\d+)/gu, (all, number) => `Värde${number}x`).replace(/\\/gu, "\n");
      const found = cause.suggest([message]);
      checked += 1;
      if (!found?.origin?.length) { missed.push(`${known.locales[position]}: ${message}`); return; }
      recognized += 1;
      if (found.origin.some(item => entry[0].some(([app, object]) => known.apps[app] === item.app && object === item.object))) exact += 1;
    }));
  });
  console.log(`known errors: ${recognized} of ${checked} recognized, ${exact} with their own object`);
  assert.ok(checked > 1000, `${checked} messages checked`);
  assert.ok(recognized / checked > 0.97, `recognized ${recognized} of ${checked}: ${missed.slice(0, 20).join(" | ")}`);
  assert.ok(exact / checked > 0.9, `the object is found for ${exact} of ${checked}`);
  assert.ok(Date.now() - started < checked * 20, "recognizing a message stays fast");

  // An error that no other cause names gets the general cause, its origin and its actions.
  const fabric = cause.suggest(["A synchronization run is in progress. Stop the synchronization before resetting a table."]);
  assert.equal(fabric.kind, "known-error");
  assert.equal(fabric.source, "bc-known");
  const described = cause.describe(fabric, "en-US");
  assert.equal(described.origin, 'Codeunit "Fabric Platform Mgt" in Business Central Mirroring to Fabric');
  assert.deepEqual([...described.actions], ["Stop synchronization"]);
  assert.match(described.text, /Microsoft's Business Central Mirroring to Fabric/u);
  // The actions are in the language when Microsoft translated them, else in English.
  const translated = known.errors.find(entry => entry[2]?.some(action => action[1]) && entry[1][1]);
  const swedishMessage = [].concat(translated[1][1])[0].replace(/%(\d+)/gu, "X$1").replace(/\\/gu, "\n");
  const swedish = cause.describe(cause.suggest([swedishMessage]), "sv-SE");
  assert.ok(swedish.actions.includes(translated[2].find(action => action[1])[1]), swedishMessage);
  for (const locale of locales) {
    const worded = cause.describe(fabric, locale);
    assert.equal(worded.checks.length, 3, `${locale} known-error checks`);
    for (const value of [worded.text, ...worded.checks, worded.why, worded.origin]) {
      assert.ok(value && !/\{\w+\}/u.test(value), `${locale} known-error: ${value}`);
    }
    assert.ok(worded.origin.includes('Codeunit "Fabric Platform Mgt"'), `${locale} keeps the object name`);
    assert.ok(cause.labels(locale).origin && cause.labels(locale).actions, `${locale} labels`);
  }
  // Several objects are named together, and the rest are counted.
  const many = cause.describe({ kind: "known-error", params: {}, origin: [{ app: "Base Application", object: 'Table "A"' },
    { app: "Base Application", object: 'Table "B"' }, { app: "Shopify Connector", object: 'Page "C"' }], moreOrigins: 4 }, "sv-SE");
  assert.equal(many.origin, 'Table "A", Table "B" i Base Application; Page "C" i Shopify Connector och 4 till');
  assert.equal(many.text, "En kontroll i Business Central stoppade åtgärden. Meddelandet säger vad som saknas eller är fel.");
  // A cause from Business Central's own labels keeps its own wording and gets the origin too.
  const postingDate = cause.suggest(["Posting Date is not within your range of allowed posting dates."]);
  assert.equal(postingDate.kind, "posting-date");
  assert.ok(postingDate.origin.length, "the curated cause has an origin");
  // A platform message is not shown by an app, so it has no origin.
  assert.equal(cause.suggest(["The Customer does not exist. Identification fields and values: No.='10000'"]).origin, undefined);
  // A message that no app shows gets no cause.
  assert.equal(cause.suggest(["Något helt okänt hände i dag, nummer 42."]), null);
  // The exported cause carries the origin and the actions; older causes without them still export.
  const exportedCause = cause.exported(fabric, "sv-SE");
  assert.equal(exportedCause.originTitle, "Visas troligen av");
  assert.ok(exportedCause.origin.includes("Fabric Platform Mgt"));
  assert.deepEqual([...exportedCause.actions], ["Stop synchronization"]);
  assert.deepEqual([...cause.exported({ kind: "permission", params: {} }, "sv-SE").actions], []);
  assert.equal(cause.exported({ kind: "permission", params: {} }, "sv-SE").origin, "");
  // Errors raised through a helper are known with the caller as origin and the helper's actions:
  // the number series errors offer Open No. Series Lines, translated by Microsoft.
  const series = known.errors.find(entry => entry[1][0] === "You cannot assign new numbers from the number series %1.");
  const seriesCause = cause.suggest([series[1][1].replace("%1", "INKOP")]);
  const seriesSwedish = cause.describe(seriesCause, "sv-SE");
  assert.equal(seriesSwedish.origin, 'Codeunit "No. Series - Impl." i Business Foundation');
  assert.deepEqual([...seriesSwedish.actions], [series[2][0][1]]);
  assert.deepEqual([...cause.describe(seriesCause, "en-US").actions], ["Open No. Series Lines"]);
  // Each country's own errors: its Base Application and its local apps, in its language.
  for (const app of ["DK Core", "FI Core", "OIOUBL", "ELSTER VAT Localization for Germany", "FEC Audit File",
    "Document Registration in Spain", "Standard Audit File - Tax Localization for Norway", "Standard Import Export (SIE)", "IRS Forms"]) {
    assert.ok(known.apps.includes(app), `${app} is in the table`);
  }
  const siret = known.errors.find(entry => /^SIRET No\. must be exactly 14 digits\.$/u.test(entry[1][0]));
  const french = cause.suggest([siret[1][known.locales.indexOf("fr-FR")]]);
  assert.equal(cause.describe(french, "fr-FR").origin, 'Table "Company Information" dans Base Application');
  // The platform's messages about a failed connection or a missing permission are known in every
  // language, not only in the English and Swedish wording of the rules.
  for (const key of ["HttpRequestError", "TimeoutExceptionString", "SuperRoleRequired"]) {
    const entry = labels.platform.find(item => item.key === key);
    for (const locale of locales) {
      assert.equal(cause.suggest([entry.texts[locale]])?.kind, entry.kind, `${locale} ${key}`);
    }
  }
  // The most common errors get a concrete cause in every language, with the names read from the
  // message, and keep their origin and actions.
  const fillIn = text => text.replace(/\\+/gu, "\n").replace(/%(\d+)/gu, (_, n) => ["", "INKOP", "Dimensionskod OMRÅDE", "BETA 7", "Kund", "10000"][n] || `X${n}`);
  for (const kind of COMMON_KINDS) {
    const entries = known.errors.filter(entry => entry[3] === kind);
    assert.ok(entries.length > 0 || labels.kinds[kind], `${kind} is in the tables`);
    for (const entry of entries) {
      for (const locale of locales) {
        for (const text of [].concat(entry[1][known.locales.indexOf(locale)] || entry[1][0])) {
          assert.equal(cause.suggest([fillIn(text)])?.kind, kind, `${locale} ${kind}: ${text}`);
        }
      }
    }
  }
  const numberSeries = cause.suggest(["You cannot assign new numbers from the number series INKOP on 2026-11-19."]);
  assert.equal(numberSeries.kind, "number-series");
  assert.deepEqual({ ...numberSeries.params }, { series: "INKOP" });
  assert.match(cause.describe(numberSeries, "sv-SE").text, /^Nummerserien INKOP kan inte/u);
  assert.ok(cause.describe(numberSeries, "sv-SE").origin.includes("No. Series"));
  assert.ok(cause.describe(numberSeries, "da-DK").actions.length > 0, "the number series error keeps its action");
  const dimension = cause.suggest(["Select a Dimension Value Code for the Dimension Code AREA for Customer 10000."]);
  assert.deepEqual({ ...dimension.params }, { dimension: "Dimension Code AREA", record: "Customer 10000" });
  assert.equal(cause.suggest(["You must assign a lot number for item 1000."]).params.item, "1000");
  // In a page, the table loaded by one copy of the module (the PDF bundle has its own) is used by the others.
  const page = vm.createContext({ console });
  vm.runInContext(read("src/bug-report/error-cause.js"), page);
  const first = page.T9ErrorCause;
  vm.runInContext(read("src/bug-report/error-cause.js"), page);
  assert.notEqual(page.T9ErrorCause, first);
  assert.equal(first.suggest(["A synchronization run is in progress. Stop the synchronization before resetting a table."]), null,
    "without the table nothing is known");
  page.T9ErrorCause.useKnown(known);
  assert.equal(first.suggest(["A synchronization run is in progress. Stop the synchronization before resetting a table."]).kind, "known-error");
}

// 1e. An app the user adds (a partner's or their own) is read on the computer from its .app file,
// and its errors get their origin and actions like Microsoft's.
{
  const JSZip = require("jszip");
  const appErrors = require("../src/bug-report/app-errors.js");
  require("../src/bug-report/al-errors.js");
  const locales = languages.supported("ui").map(item => item.locale);
  const unit = (id, note, source, target) => `<trans-unit id="${id}" translate="yes"><source>${source}</source>` +
    `${target ? `<target state="translated">${target}</target>` : ""}<note from="Xliff Generator" annotates="general" priority="3">${note}</note></trans-unit>`;
  const units = target => [
    unit("Codeunit 1234 - NamedType 1", "Codeunit Fleet Post - NamedType VehicleBlockedErr",
      "Vehicle %1 is blocked for posting until the inspection &quot;%2&quot; is approved.",
      target && "Fordonet %1 är spärrat för bokföring tills besiktningen &quot;%2&quot; är godkänd."),
    unit("Codeunit 1234 - NamedType 2", "Codeunit Fleet Post - NamedType OpenInspectionLbl",
      "Open inspection", target && "Öppna besiktning"),
    unit("Codeunit 1234 - NamedType 3", "Codeunit Fleet Post - NamedType PostedMsg", "The vehicle was posted.", target && "Fordonet bokfördes.")
  ].join("");
  const xlf = target => `<?xml version="1.0" encoding="utf-8"?><xliff version="1.2"><file target-language="${target || "en-US"}"><body><group id="body">${units(target)}</group></body></file></xliff>`;
  const al = `codeunit 50100 "Fleet Post"
{
    procedure Post(VehicleNo: Code[20])
    var
        Info: ErrorInfo;
        VehicleBlockedErr: Label 'Vehicle %1 is blocked for posting until the inspection "%2" is approved.';
        OpenInspectionLbl: Label 'Open inspection';
        PostedMsg: Label 'The vehicle was posted.';
    begin
        Info.Message(StrSubstNo(VehicleBlockedErr, VehicleNo, 'Annual'));
        Info.AddAction(OpenInspectionLbl, Codeunit::"Fleet Post", 'OpenInspection');
        Error(Info);
        Message(PostedMsg);
    end;
}`;
  const build = async withSource => {
    const zip = new JSZip();
    zip.file("NavxManifest.xml", `<Package><App Id="1" Name="Fleet &amp; Vehicles" Publisher="Contoso Partner" Version="2.3.0.0" /></Package>`);
    zip.file("Translations/Fleet.g.xlf", xlf(""));
    zip.file("Translations/Fleet.sv-SE.xlf", xlf("sv-SE"));
    if (withSource) zip.file("src/FleetPost.Codeunit.al", al);
    const body = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
    // An .app starts with a short header before the zip.
    return Buffer.concat([Buffer.from("NAVX".padEnd(40, "\0"), "latin1"), body]);
  };
  const app = await appErrors.readUserApp(await build(true), { locales, fileName: "Fleet.app", now: new Date("2026-11-19T10:00:00Z") });
  assert.deepEqual({ name: app.name, publisher: app.publisher, version: app.version, from: app.from, errorCount: app.errorCount, actionCount: app.actionCount },
    { name: "Fleet & Vehicles", publisher: "Contoso Partner", version: "2.3.0.0", from: "source", errorCount: 1, actionCount: 1 },
    "the error is found, not the message or the action caption");
  // The table is keyed by English wording, whatever order the languages are registered in.
  assert.equal(app.table.locales[0], "en-US");
  assert.equal(app.table.errors[0][1][0], "Vehicle %1 is blocked for posting until the inspection \"%2\" is approved.");
  const message = "Fordonet TRUCK-07 är spärrat för bokföring tills besiktningen \"Annual\" är godkänd.";
  assert.equal(cause.suggest([message]), null, "unknown before the app is added");
  assert.equal(cause.useAppErrors([app]), 1);
  const found = cause.suggest([message]);
  assert.equal(found.kind, "known-error");
  const described = cause.describe(found, "sv-SE");
  assert.equal(described.origin, 'Codeunit "Fleet Post" i Fleet & Vehicles');
  assert.deepEqual([...described.actions], ["Öppna besiktning"]);
  // A language the app is not translated to gets the English caption; Microsoft's errors still work.
  assert.deepEqual([...cause.describe(cause.suggest(["Vehicle A is blocked for posting until the inspection \"B\" is approved."]), "fi-FI").actions], ["Open inspection"]);
  assert.equal(cause.suggest(["You must assign a lot number for item 1000."]).kind, "item-tracking-required");
  // An app without its AL source: the labels named as errors are taken, without actions.
  const labelsOnly = await appErrors.readUserApp(await build(false), { locales });
  assert.equal(labelsOnly.from, "labels");
  assert.equal(labelsOnly.errorCount, 1);
  assert.equal(labelsOnly.table.errors[0][0][0][1], 'Codeunit "Fleet Post"');
  // A file that is not an app is refused with a reason the settings can show.
  await assert.rejects(appErrors.readUserApp(Buffer.from("not an app"), { locales }), error => error.code === "not-an-app");
  // Removing the app removes its errors.
  cause.useAppErrors([]);
  assert.equal(cause.suggest([message]), null);
  // The apps are read from the browser's storage when the table is loaded.
  const page = vm.createContext({ console, chrome: { storage: { local: { get: async key => ({ [key]: { apps: [app] } }) } } } });
  vm.runInContext(read("src/engine/storage-keys.js"), page);
  vm.runInContext(read("src/bug-report/error-cause.js"), page);
  page.T9ErrorCause.useKnown(require("../src/bug-report/error-known.json"));
  await page.T9ErrorCause.loadKnown();
  assert.equal(page.T9ErrorCause.suggest([message])?.kind, "known-error", "loaded from storage");
}

// 2. Every kind is worded in every registered language: a statement, three checks and why,
// with no placeholder left unfilled; the box's labels exist in every language.
{
  const values = { object: "TableData 18 Customer", permission: "Read", field: "Posting Date",
    table: "Sales Header", status: "503", app: "Base Application", series: "INKOP", number: "PF-1001",
    dimension: "AREA", record: "Customer 10000", item: "1000", document: "Invoice 107203" };
  const locales = languages.supported("ui").map(item => item.locale);
  assert.deepEqual([...cause.LOCALES].sort(), [...locales].sort(), "the cause texts cover every language");
  for (const locale of locales) {
    for (const kind of ["permission", "required-value", "network-unavailable", "network-rejected", "known-error", ...COMMON_KINDS]) {
      // The common kinds are worded also without the names.
      if (COMMON_KINDS.includes(kind)) assert.equal(cause.describe({ kind, params: {} }, locale)?.checks.length, 3, `${locale} ${kind} plain`);
      // The common kinds are only suggested from Microsoft's wording, and say so in why.
      const source = COMMON_KINDS.includes(kind) ? "bc-known" : undefined;
      const described = cause.describe({ kind, params: values, source }, locale);
      assert.ok(described, `${locale} ${kind}`);
      assert.equal(described.checks.length, 3, `${locale} ${kind} checks`);
      for (const text of [described.text, ...described.checks, described.why]) {
        assert.ok(text && !/\{\w+\}/u.test(text), `${locale} ${kind}: ${text}`);
      }
      if (locale !== "en-US") assert.notEqual(described.text,
        cause.describe({ kind, params: values }, "en-US").text, `${locale} ${kind} is translated`);
    }
    // A cause read from Microsoft's wording names the Business Central version it was compared with.
    const version = require("../src/bug-report/error-labels.js").businessCentral;
    assert.match(version, /^\d+\.\d+$/u);
    for (const source of ["bc-label", "bc-platform", "bc-known"]) {
      const basis = cause.describe({ kind: "known-error", params: {}, source }, locale).basis;
      assert.ok(basis.includes(`Business Central ${version}`) && !/\{\w+\}/u.test(basis), `${locale} ${source} basis`);
    }
    assert.equal(cause.describe({ kind: "permission", params: {}, source: "rule" }, locale).basis, "", "a rule names no version");
    const labels = cause.labels(locale);
    for (const [key, value] of Object.entries(labels)) assert.ok(value, `${locale} label ${key}`);
    // Without the names the message did not give, the general wording is used.
    assert.ok(cause.describe({ kind: "permission", params: {} }, locale).text);
    assert.ok(cause.describe({ kind: "required-value", params: { field: "Nr" } }, locale).text.includes("Nr"));
    assert.equal(cause.describe({ kind: "required-value", params: {} }, locale), null);
  }
}

// 3. The report keeps the user's choices, and whether the problem is resolved, without
// treating either as a change of what the report says.
const errorEvidence = [{ errorEvidenceId: "e1",
  rawMessage: "Du har inte följande behörigheter för TableData Försäljningsleverans: Infoga." }];
const base = model.normalize({ bugReportId: "b1", recordingId: "r1", documentLanguage: "sv-SE",
  summary: { title: "Bokföring stoppas" }, expectedResult: { text: "Ordern levereras." } });
{
  assert.equal(base.resolution, undefined, "a report is open until it is marked resolved");
  assert.equal(model.isResolved(base), false);
  const resolved = model.updateHumanContent(base, { resolution: { state: "resolved", note: "Lagat i 28.3" } },
    "2026-11-18T10:00:00.000Z");
  assert.equal(resolved.resolution.state, "resolved");
  assert.equal(resolved.resolution.note, "Lagat i 28.3");
  assert.equal(resolved.resolution.changedAt, "2026-11-18T10:00:00.000Z");
  assert.equal(model.contentRevision(resolved), model.contentRevision(base),
    "marking resolved does not change what the report says");
  const reopened = model.setResolution(resolved, { state: "open" }, "2026-11-18T11:00:00.000Z");
  assert.equal(model.isResolved(reopened), false);
  const fromTest = model.setResolution(base, { state: "resolved", testRunId: "run-2", stepId: "s3" },
    "2026-11-18T12:00:00.000Z");
  assert.equal(fromTest.resolution.testRunId, "run-2");
  assert.equal(model.setResolution(fromTest, { state: "open" }, "2026-11-18T13:00:00.000Z").resolution.testRunId,
    undefined, "opened again, the report no longer names the test that resolved it");
  // A report tab that was open before the report was resolved from a test keeps the later choice.
  assert.equal(model.laterResolution(fromTest.resolution, undefined).state, "resolved");
  assert.equal(model.laterResolution(fromTest.resolution, reopened.resolution).state, "resolved");
  assert.equal(model.laterResolution(reopened.resolution, resolved.resolution).state, "open");
  assert.throws(() => model.setResolution(base, { state: "maybe" }));
  // Hiding or including the possible cause is kept, and including it changes what is sent.
  const included = model.updateHumanContent(base, { causeHint: { include: true } });
  assert.deepEqual(included.causeHint, { dismissed: false, include: true });
  assert.notEqual(model.contentRevision(included), model.contentRevision(base));
  assert.deepEqual(model.updateHumanContent(included, { causeHint: { dismissed: true } }).causeHint,
    { dismissed: true, include: true });
  // Unknown fields of a later version are kept.
  assert.equal(model.normalize({ ...resolved, resolution: { ...resolved.resolution, by: "Anna" } })
    .resolution.by, "Anna");
}

// 4. The possible cause is in the report view's projection, and in what is sent only when
// the user included it and did not hide it.
{
  const section = report => generator.project(report, { errorEvidence }).sections
    .find(item => item.id === "possible-cause").content;
  assert.equal(section(base).cause.kind, "permission");
  assert.equal(section(base).include, false);
  const packaged = report => issuePackage.build(report, { errorEvidence }, { generatedAt: "2026-11-18" });
  assert.equal(packaged(base).possibleCause, null, "left out of what is sent by default");
  const included = model.updateHumanContent(base, { causeHint: { include: true } });
  assert.equal(packaged(included).possibleCause.kind, "permission");
  assert.equal(packaged(model.updateHumanContent(included, { causeHint: { dismissed: true } })).possibleCause,
    null, "a hidden cause is never sent");
  const text = markdown.markdown(packaged(included));
  assert.match(text, /## Möjlig orsak \(inte bekräftad\)/u);
  assert.match(text, /Användaren saknar troligen behörigheten Infoga för TableData Försäljningsleverans\./u);
  assert.doesNotMatch(markdown.markdown(packaged(base)), /Möjlig orsak/u);
  const pdf = pdfProject({ ...packaged(included), reproduction: [], callStack: [], diagnostics: { rows: [] } });
  const pdfCause = pdf.sections.find(item => item.id === "cause");
  assert.equal(pdfCause.title, "Möjlig orsak (inte bekräftad)");
  assert.equal(pdfCause.rows.length, 5, "statement, heading and three checks");
  assert.equal(pdf.sections.findIndex(item => item.id === "cause"),
    pdf.sections.findIndex(item => item.id === "actual") + 1, "the cause follows the error");
  assert.equal(pdfProject({ ...packaged(base), reproduction: [], callStack: [], diagnostics: { rows: [] } })
    .sections.some(item => item.id === "cause"), false);
  // In another document language the exported cause is in that language.
  const english = model.normalize({ ...included, documentLanguage: "en-US" });
  assert.match(markdown.markdown(packaged(english)), /## Possible cause \(not confirmed\)/u);
  // A known error exports where it comes from and the actions offered in it.
  const fabricEvidence = [{ errorEvidenceId: "e1",
    rawMessage: "A synchronization run is in progress. Stop the synchronization before resetting a table." }];
  const fabricPackage = issuePackage.build(included, { errorEvidence: fabricEvidence }, { generatedAt: "2026-11-18" });
  const fabricText = markdown.markdown(fabricPackage);
  assert.match(fabricText, /\*\*Visas troligen av:\*\* Codeunit "Fabric Platform Mgt" i Business Central Mirroring to Fabric/u);
  assert.match(fabricText, /\*\*Åtgärder som erbjuds i felmeddelandet\*\*\n- Stop synchronization/u);
  const fabricPdf = pdfProject({ ...fabricPackage, reproduction: [], callStack: [], diagnostics: { rows: [] } })
    .sections.find(item => item.id === "cause");
  assert.ok(fabricPdf.rows.includes('Visas troligen av: Codeunit "Fabric Platform Mgt" i Business Central Mirroring to Fabric'));
  assert.deepEqual(fabricPdf.rows.slice(-2), ["Åtgärder som erbjuds i felmeddelandet:", "- Stop synchronization"]);
  // Regenerating from the recording keeps the choices and the resolution.
  const canonical = require("../src/engine/canonical-recording.js");
  const recording = canonical.finish(canonical.create({ id: "cause", startedAt: "2026-11-18T09:00:00Z",
    recordingPurpose: "bug-report" }), "2026-11-18T09:01:00Z");
  const created = service.createBugReportFromRecording(recording, [], { bugReportId: "b2",
    documentLanguage: "sv-SE", now: "2026-11-18T09:01:00Z" });
  const chosen = model.setResolution(model.updateHumanContent(created, { causeHint: { include: true } }),
    { state: "resolved", note: "Lagat" }, "2026-11-18T10:00:00.000Z");
  const regenerated = service.regenerate(chosen, recording, [], {});
  assert.equal(regenerated.resolution.state, "resolved");
  assert.equal(regenerated.resolution.note, "Lagat");
  assert.equal(regenerated.causeHint.include, true);
}

// 5. A test step's bug reports are found on the step itself and on the same step in earlier
// runs of the same document.
{
  const run = { testRunId: "r3", sessionId: "doc", createdAt: "2026-11-18", steps: [
    { stepId: "a", status: "passed" }, { stepId: "b", status: "passed", bugReportId: "own" },
    { stepId: "c", status: "not-run" }] };
  const earlier = { testRunId: "r2", sessionId: "doc", createdAt: "2026-11-10", steps: [
    { stepId: "a", status: "failed", bugReportId: "old" }, { stepId: "b", status: "failed", bugReportId: "own" }] };
  const other = { testRunId: "x", sessionId: "other", createdAt: "2026-11-01", steps: [
    { stepId: "a", status: "failed", bugReportId: "elsewhere" }] };
  const later = { testRunId: "r4", sessionId: "doc", createdAt: "2026-11-20", steps: [
    { stepId: "c", status: "failed", bugReportId: "future" }] };
  const linked = history.linkedReports(run, [run, earlier, other, later]);
  assert.deepEqual(linked.get("a"), ["old"]);
  assert.deepEqual(linked.get("b"), ["own"], "a report is listed once");
  assert.equal(linked.has("c"), false, "a later run's report is not this run's");
}

// 6. The report view shows the cause box and the status choice in every interface language.
{
  const ui = vm.createContext({ T9LanguageRegistry: languages, console });
  vm.runInContext(read("src/ui/i18n.js"), ui);
  globalThis.T9UiI18n = ui.T9UiI18n;
  globalThis.T9ErrorCause = cause;
  globalThis.T9BugReportGenerator = generator;
  const keys = ["technical.statusLabel", "technical.statusOpen", "technical.statusResolved",
    "technical.resolvedOn", "technical.resolvedByTest", "technical.resolutionNote",
    "technical.resolutionNotePlaceholder", "library.openBugs", "library.bugOpen", "library.bugResolved",
    "library.noOpenBugs", "test.reportStillOpen", "test.markResolved", "test.notNow",
    "test.reportResolved", "test.undoResolve", "test.resolveFailed"];
  for (const { locale } of languages.supported("ui")) {
    for (const key of keys) {
      const value = ui.T9UiI18n.translate(key, locale);
      assert.notEqual(value, key, `${locale} ${key}`);
      for (const placeholder of ui.T9UiI18n.translate(key, "en-US").match(/\{\w+\}/gu) || []) {
        assert.ok(value.includes(placeholder), `${locale} ${key} ${placeholder}`);
      }
    }
  }
  class Element {
    constructor(tag) { this.tagName = tag; this.children = []; this.dataset = {}; this.attributes = {};
      this._text = ""; this.className = ""; this.value = ""; this.listeners = {}; }
    get textContent() { return this._text + this.children.map(child =>
      typeof child === "string" ? child : child.textContent).join(""); }
    set textContent(value) { this._text = String(value); this.children = []; }
    appendChild(child) { this.children.push(child); return child; }
    append(...children) { children.forEach(child => this.appendChild(child)); }
    replaceChildren(...children) { this.children = []; this.append(...children); }
    setAttribute(name, value) { this.attributes[name] = String(value); }
    removeAttribute(name) { delete this.attributes[name]; }
    addEventListener(type, listener) { (this.listeners[type] ||= []).push(listener); }
    fire(type) { (this.listeners[type] || []).forEach(listener => listener({})); }
    all() { return this.children.filter(child => typeof child !== "string")
      .flatMap(child => [child, ...child.all()]); }
    find(className) { return this.all().find(item => item.className.split(" ").includes(className)) || null; }
    querySelector(selector) { return this.find(selector.slice(1)); }
  }
  const doc = { createElement: tag => new Element(tag) };
  const view = require("../src/ui/technical-report-workspace-view.js");
  const state = report => ({ report, document: generator.project(report, { errorEvidence }),
    saveState: "saved", revision: 1, contentRevision: model.contentRevision(report) });
  const edits = [];
  const options = locale => ({ locale, onEdit: (name, value) => edits.push([name, value]) });
  for (const { locale } of languages.supported("ui")) {
    const container = new Element("main");
    view.render(container, state(base), options(locale), doc);
    const box = container.find("report-cause");
    assert.ok(box, `${locale} shows the possible cause`);
    assert.ok(box.textContent.includes(cause.labels(locale).unconfirmed), `${locale} marks it not confirmed`);
    assert.ok(box.textContent.includes("TableData Försäljningsleverans"), "the names are quoted from the message");
    const choice = container.find("report-resolution-choice");
    assert.deepEqual(choice.children.map(button => button.attributes["aria-pressed"]), ["true", "false"]);
    assert.equal(choice.attributes.role, "group");
  }
  const container = new Element("main");
  view.render(container, state(base), options("sv-SE"), doc);
  container.find("report-resolution-choice").children[1].fire("click");
  container.find("report-cause-link").fire("click");
  assert.deepEqual(edits.slice(-2), [["resolution", { state: "resolved" }], ["causeHint", { dismissed: true }]]);
  // Hidden, the box leaves a line to show it again; resolved, the report says when.
  const hidden = model.setResolution(model.updateHumanContent(base, { causeHint: { dismissed: true } }),
    { state: "resolved", testRunId: "run-2" }, "2026-11-18T10:00:00.000Z");
  view.render(container, state(hidden), options("sv-SE"), doc);
  assert.equal(container.find("report-cause"), null);
  assert.match(container.find("report-cause-hidden").textContent, /Den möjliga orsaken är dold\. Visa igen/u);
  assert.match(container.find("report-resolution-info").textContent,
    /^Markerad som löst .+ när steget godkändes i ett test\.$/u);
  // A report whose error says nothing about its cause shows no box.
  const unknown = { ...state(base), document: generator.project(base, { errorEvidence: [
    { errorEvidenceId: "e1", rawMessage: "Det finns ingenting att bokföra." }] }) };
  view.render(container, unknown, options("sv-SE"), doc);
  assert.equal(container.find("report-cause"), null);
  assert.equal(container.find("report-cause-hidden"), null);
  // A known error shows where it comes from and the actions offered in it, in every language.
  const fabric = { ...state(base), document: generator.project(base, { errorEvidence: [{ errorEvidenceId: "e1",
    rawMessage: "A synchronization run is in progress. Stop the synchronization before resetting a table." }] }) };
  for (const { locale } of languages.supported("ui")) {
    view.render(container, fabric, options(locale), doc);
    const facts = container.find("report-cause-facts");
    assert.ok(facts.textContent.includes(cause.labels(locale).origin), `${locale} names the origin`);
    assert.ok(container.find("report-cause-origin").textContent.includes('Codeunit "Fabric Platform Mgt"'));
    assert.ok(facts.textContent.includes(cause.labels(locale).actions), `${locale} names the actions`);
    assert.equal(container.find("report-cause-offered").textContent, "Stop synchronization");
  }
  view.render(container, state(base), options("sv-SE"), doc);
  assert.equal(container.find("report-cause-facts"), null, "a cause without origin or actions has no facts");
}

// 7. The pages load what they use, and the library offers Open bugs.
{
  assert.ok(read("src/ui/technical-report.html").indexOf("bug-report/error-cause.js") <
    read("src/ui/technical-report.html").indexOf("bug-report/bug-report-generator.js"));
  assert.ok(read("src/recorder/background.js").indexOf('importScripts("bug-report/error-cause.js")') <
    read("src/recorder/background.js").indexOf('importScripts("bug-report/bug-report-generator.js")'));
  // Business Central's error labels are loaded before the possible cause that reads them.
  const reportPage = read("src/ui/technical-report.html");
  assert.ok(reportPage.indexOf("bug-report/error-labels.js") > 0 &&
    reportPage.indexOf("bug-report/error-labels.js") < reportPage.indexOf("bug-report/error-cause.js"));
  const background = read("src/recorder/background.js");
  assert.ok(background.indexOf('importScripts("bug-report/error-labels.js")') > 0 &&
    background.indexOf('importScripts("bug-report/error-labels.js")') <
    background.indexOf('importScripts("bug-report/error-cause.js")'));
  // Microsoft's known error messages are loaded before the report is shown or packaged.
  const reportScript = read("src/ui/technical-report.js");
  assert.ok(reportScript.indexOf("loadKnown?.()") > 0 &&
    reportScript.indexOf("await knownErrors;") < reportScript.indexOf("await start();", reportScript.indexOf("await knownErrors;")));
  assert.ok(background.indexOf("await globalThis.T9ErrorCause?.loadKnown?.();") > 0 &&
    background.indexOf("await globalThis.T9ErrorCause?.loadKnown?.();") <
    background.indexOf("globalThis.T9IssuePackage.build(report,"));
  for (const page of ["src/ui/test-run.html", "src/ui/test-panel.html"]) {
    assert.match(read(page), /<script src="test-report-followup\.js"><\/script>/u, page);
  }
  assert.match(read("src/ui/dashboard.html"), /data-library-filter="open-bugs"[^>]*><span data-i18n="library\.openBugs">/u);
  const dashboard = read("src/ui/dashboard.js");
  assert.match(dashboard, /"open-bugs": record => !record\.archived &&/u);
  assert.match(dashboard, /bugStatus: libraryCardBugStatus/u);
  // A passed step with an open report keeps the panel on the step so the offer is seen.
  assert.match(read("src/ui/test-panel.js"), /status === "passed" && !followUp\?\.hasOffer\(stepId\)/u);
}

// 8. The offer in a test run: shown under a passed step with an open report, resolved on the
// tester's choice, with Undo; Not now hides it.
{
  const followUp = require("../src/ui/test-report-followup.js");
  const sent = [];
  const changes = [];
  const messages = [];
  const send = async payload => {
    sent.push(payload);
    if (payload.type === "T9_TEST_RUN_OPEN_REPORTS") return { ok: true, steps: { s1: [{ bugReportId: "b1", title: "Bokföring stoppas" }] } };
    return { ok: true };
  };
  class Node {
    constructor(tag) { this.tagName = tag; this.children = []; this.className = ""; this.textContent = "";
      this.attributes = {}; this.listeners = {}; this.disabled = false; }
    append(...children) { this.children.push(...children); }
    setAttribute(name, value) { this.attributes[name] = value; }
    addEventListener(type, listener) { this.listeners[type] = listener; }
    all() { return this.children.flatMap(child => [child, ...child.all()]); }
    find(className) { return this.all().find(item => item.className.split(" ").includes(className)); }
  }
  const doc = { createElement: tag => new Node(tag) };
  const t = key => ({ "test.reportStillOpen": "Rapporten {title} är öppen.", "test.reportResolved": "{title} är löst.",
    "test.markResolved": "Markera som löst", "test.notNow": "Inte nu", "test.undoResolve": "Ångra",
    "test.resolveFailed": "Misslyckades." })[key];
  const offer = followUp.create({ send, t, testRunId: "run-2", doc,
    onChange: (stepId, focus) => changes.push([stepId, focus]), onMessage: text => messages.push(text) });
  await offer.refresh();
  assert.deepEqual(changes.at(-1), ["s1", undefined]);
  assert.equal(offer.render({ stepId: "s1", status: "failed" }), null, "only a passed step offers it");
  assert.equal(offer.hasOffer("s1"), true);
  const box = offer.render({ stepId: "s1", status: "passed" });
  assert.equal(box.find("run-followup-row").children[0].textContent, "Rapporten Bokföring stoppas är öppen.");
  await box.find("run-followup-resolve").listeners.click();
  assert.deepEqual(sent.at(-1), { type: "T9_SET_BUG_REPORT_RESOLUTION", bugReportId: "b1", state: "resolved",
    testRunId: "run-2", stepId: "s1" });
  assert.equal(messages.at(-1), "Bokföring stoppas är löst.");
  assert.deepEqual(changes.at(-1), ["s1", ".run-followup-undo"]);
  assert.equal(offer.hasOffer("s1"), false);
  const resolvedBox = offer.render({ stepId: "s1", status: "passed" });
  await resolvedBox.find("run-followup-undo").listeners.click();
  assert.equal(sent.at(-1).state, "open", "Undo opens the report again");
  assert.equal(offer.hasOffer("s1"), true);
  offer.render({ stepId: "s1", status: "passed" }).find("run-followup-later").listeners.click();
  assert.equal(offer.hasOffer("s1"), false, "Not now hides the offer");
  assert.equal(offer.render({ stepId: "s1", status: "passed" }), null);
  // A failed update says so and changes nothing.
  const failing = followUp.create({ send: async payload => { if (payload.type === "T9_SET_BUG_REPORT_RESOLUTION") throw new Error("x");
    return send(payload); }, t, testRunId: "run-2", doc, onMessage: text => messages.push(text) });
  await failing.refresh();
  await failing.render({ stepId: "s1", status: "passed" }).find("run-followup-resolve").listeners.click();
  assert.equal(messages.at(-1), "Misslyckades.");
  assert.equal(failing.hasOffer("s1"), true);
}

console.log("Bug report possible cause and follow-up tests passed in all registered languages.");
