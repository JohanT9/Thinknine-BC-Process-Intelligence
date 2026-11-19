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

const { readXliff, readSource, resolve, captionTable } = require("../src/document/app-captions");

async function readApp(file) {
  const data = fs.readFileSync(file);
  const zip = await JSZip.loadAsync(data.subarray(data.indexOf(Buffer.from("PK\u0003\u0004", "latin1"))));
  return zip;
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
  // One row of captions per key, in the order of LOCALES; a key known in one language only cannot
  // translate anything.
  const data = captionTable(perLocale, LOCALES, { minLanguages: 2, source: "Microsoft Base Application", version });
  const index = data.keys;
  const rows = data.rows;
  fs.writeFileSync(OUT, `${JSON.stringify(data)}\n`);
  console.error(`Wrote ${path.relative(process.cwd(), OUT)}: ${Object.keys(index).length} keys, ${rows.length} rows, ` +
    `${(fs.statSync(OUT).size / 1048576).toFixed(1)} MB`);
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
