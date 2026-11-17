#!/usr/bin/env node
"use strict";
// Builds src/document/bc-captions.json: what Business Central's own pages, fields and actions are
// called in every registered language, read from Microsoft's Base Application packages.
//
// A recording keeps each field's and action's AL identity (recorder/al-identity-capture.js): the
// page's AL name and the control's or action's AL name, which are the same in every language. With
// this table a document in another language can name a field as Business Central shows it in that
// language, such as Kreditorennr. for Leverantörsnr.
//
// Each country's package (Microsoft_Base Application_<version>.app from the Business Central
// artifacts, Applications.<COUNTRY>/) holds the AL source and its translation file. A caption is
// resolved the way the client resolves it: the control's own Caption, else the Caption of the
// table field it shows, else the field's name. Each language is resolved from its own country's
// package, so localized pages are read as that country ships them. Only Microsoft's Base
// Application is covered: extensions such as partner apps are not in it.
//
// usage: node scripts/build-bc-captions.js <folder with se.app us.app fr.app de.app es.app dk.app fi.app no.app>
const fs = require("fs");
const path = require("path");
const JSZip = require("jszip");

const COUNTRIES = Object.freeze({ "en-US": "us", "sv-SE": "se", "fr-FR": "fr", "de-DE": "de",
  "es-ES": "es", "da-DK": "dk", "fi-FI": "fi", "nb-NO": "no" });
const LOCALES = Object.keys(COUNTRIES);
const OUT = path.join(__dirname, "..", "src", "document", "bc-captions.json");

const unquote = name => String(name || "").trim().replace(/^"(.*)"$/su, "$1").replace(/""/gu, "\"");
const decode = text => text.replace(/&lt;/gu, "<").replace(/&gt;/gu, ">").replace(/&quot;/gu, "\"")
  .replace(/&apos;/gu, "'").replace(/&amp;/gu, "&");
// A caption as the client shows it: an ampersand marks an access key and is not shown ("&&" is one).
const shown = caption => caption.replace(/&&/gu, "\u0000").replace(/&/gu, "").replace(/\u0000/gu, "&").trim();
const NAME = String.raw`("(?:[^"]|"")+"|[A-Za-z_][\w]*)`;

async function readApp(file) {
  const data = fs.readFileSync(file);
  const zip = await JSZip.loadAsync(data.subarray(data.indexOf(Buffer.from("PK\u0003\u0004", "latin1"))));
  return zip;
}

// The translation file: lookup hint ("Table Purchase Header - Field Buy-from Vendor No. - Property
// Caption") to the shown text. The generated file (.g.xlf) gives the English source.
function readXliff(text, useSource) {
  const result = new Map();
  const unit = /<trans-unit\b[^>]*>([\s\S]*?)<\/trans-unit>/gu;
  let match;
  while ((match = unit.exec(text))) {
    const body = match[1];
    // Translated files name the caption in the developer note (LookupHint=...), the generated
    // file in the generator's note.
    const hint = /LookupHint=([^)]*)\)/u.exec(body)?.[1] ??
      /<note from="Xliff Generator"[^>]*>([^<]+)<\/note>/u.exec(body)?.[1];
    if (!hint || !/ - Property (?:Caption)$/u.test(hint)) continue;
    const value = useSource ? /<source>([\s\S]*?)<\/source>/u.exec(body)?.[1]
      : /<target[^>]*>([\s\S]*?)<\/target>/u.exec(body)?.[1];
    if (value !== undefined) result.set(hint, shown(decode(value)));
  }
  return result;
}

// Pages, page extensions, tables and table extensions from the AL source: each page's source table,
// its fields (control name and source expression) and its actions.
function readSource(files) {
  const pages = new Map(); // page name -> { table, fields: Map(control -> expr), actions: Set, ext: [] }
  const tableExtensions = new Map(); // extension name -> table name
  const page = name => {
    if (!pages.has(name)) pages.set(name, { table: "", fields: new Map(), actions: new Set(), owners: new Map() });
    return pages.get(name);
  };
  for (const source of files) {
    const header = new RegExp(String.raw`^\s*(page|pageextension|tableextension)\s+\d+\s+${NAME}(?:\s+extends\s+${NAME})?`, "imu").exec(source);
    if (!header) continue;
    const kind = header[1].toLowerCase();
    const own = unquote(header[2]);
    if (kind === "tableextension") { tableExtensions.set(own, unquote(header[3])); continue; }
    const target = kind === "page" ? own : unquote(header[3]);
    const entry = page(target);
    // Captions written in a page extension are looked up under the extension's name.
    const owner = kind === "page" ? `Page ${own}` : `PageExtension ${own}`;
    if (kind === "page") {
      const table = /^\s*SourceTable\s*=\s*("(?:[^"]|"")+"|[\w]+)\s*;/imu.exec(source);
      if (table) entry.table = unquote(table[1]);
    }
    const field = new RegExp(String.raw`\bfield\s*\(\s*${NAME}\s*;\s*([^)\r\n]+?)\s*\)\s*$`, "gimu");
    let match;
    while ((match = field.exec(source))) {
      const control = unquote(match[1]);
      entry.fields.set(control, match[2].trim());
      entry.owners.set(`Control ${control}`, owner);
    }
    const action = new RegExp(String.raw`\baction\s*\(\s*${NAME}\s*\)\s*$`, "gimu");
    while ((match = action.exec(source))) {
      const name = unquote(match[1]);
      entry.actions.add(name);
      entry.owners.set(`Action ${name}`, owner);
    }
  }
  return { pages, tableExtensions };
}

// The table field a field control shows: Rec."No.", Rec.Amount or "No.". Anything else (a
// variable, a function call) has no table caption.
function sourceField(expression) {
  const match = /^(?:Rec\s*\.\s*)?("(?:[^"]|"")+"|[A-Za-z_]\w*)$/u.exec(expression.trim());
  return match ? unquote(match[1]) : "";
}

function resolve(locale, source, captions) {
  const fieldCaptions = new Map(); // table|field -> caption, from the table or a table extension
  for (const [hint, caption] of captions) {
    const table = /^Table (.+?) - Field (.+) - Property Caption$/u.exec(hint);
    if (table) { fieldCaptions.set(`${table[1]}|${table[2]}`, caption); continue; }
    const extension = /^TableExtension (.+?) - Field (.+) - Property Caption$/u.exec(hint);
    const extended = extension && source.tableExtensions.get(extension[1]);
    if (extended) fieldCaptions.set(`${extended}|${extension[2]}`, caption);
  }
  const result = new Map();
  for (const [name, entry] of source.pages) {
    const pageCaption = captions.get(`Page ${name} - Property Caption`);
    if (pageCaption) result.set(`p|${name}`, pageCaption);
    for (const [control, expression] of entry.fields) {
      const owner = entry.owners.get(`Control ${control}`);
      let caption = captions.get(`${owner} - Control ${control} - Property Caption`);
      if (caption === undefined) {
        const field = sourceField(expression);
        if (field && entry.table) caption = fieldCaptions.get(`${entry.table}|${field}`) ??
          // A table field without a Caption is shown by its name, in every language.
          (locale === "en-US" ? field : undefined);
      }
      if (caption) result.set(`f|${name}|${control}`, caption);
    }
    for (const action of entry.actions) {
      const owner = entry.owners.get(`Action ${action}`);
      const caption = captions.get(`${owner} - Action ${action} - Property Caption`);
      if (caption) result.set(`a|${name}|${action}`, caption);
    }
  }
  return result;
}

async function main() {
  const folder = process.argv[2];
  if (!folder) throw new Error("usage: node scripts/build-bc-captions.js <folder with the country .app files>");
  const perLocale = {};
  let version = "";
  for (const locale of LOCALES) {
    const file = path.join(folder, `${COUNTRIES[locale]}.app`);
    const zip = await readApp(file);
    const manifest = await zip.file("NavxManifest.xml").async("string");
    version = version || /\bVersion="([^"]+)"/u.exec(manifest)?.[1] || "";
    const sources = await Promise.all(Object.values(zip.files)
      .filter(entry => /^src\/.*\.(?:Page|PageExt|TableExt)\.al$/iu.test(entry.name))
      .map(entry => entry.async("string")));
    // English is the source language: its own file if the package has one, else the generated one.
    const translated = Object.keys(zip.files).find(name => name.endsWith(`.${locale}.xlf`));
    const generated = locale === "en-US" &&
      Object.keys(zip.files).find(name => /^Translations\/.*\.g\.xlf$/u.test(name));
    if (!translated && !generated) throw new Error(`No translation file for ${locale} in ${file}`);
    const captions = readXliff(await zip.file(translated || generated).async("string"), !translated);
    perLocale[locale] = resolve(locale, readSource(sources), captions);
    console.error(`${locale}: ${sources.length} source files, ${perLocale[locale].size} captions`);
  }
  // One row of captions per key, in the order of LOCALES; rows shared by many keys are stored once.
  const keys = [...new Set(LOCALES.flatMap(locale => [...perLocale[locale].keys()]))].sort();
  const rows = [];
  const rowIndex = new Map();
  const index = {};
  for (const key of keys) {
    const row = LOCALES.map(locale => perLocale[locale].get(key) ?? "");
    // A key known in one language only cannot translate anything.
    if (row.filter(Boolean).length < 2) continue;
    const id = JSON.stringify(row);
    if (!rowIndex.has(id)) { rowIndex.set(id, rows.length); rows.push(row); }
    index[key] = rowIndex.get(id);
  }
  const data = { schema: 1, source: "Microsoft Base Application", version, locales: LOCALES, rows, keys: index };
  fs.writeFileSync(OUT, `${JSON.stringify(data)}\n`);
  console.error(`Wrote ${path.relative(process.cwd(), OUT)}: ${Object.keys(index).length} keys, ${rows.length} rows, ` +
    `${(fs.statSync(OUT).size / 1048576).toFixed(1)} MB`);
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
