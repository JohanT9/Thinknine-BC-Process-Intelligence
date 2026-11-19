#!/usr/bin/env node
"use strict";
// Compares the knowledge rules' whole-caption patterns with the captions of older Business Central
// versions, and writes tests/fixtures/knowledge-pattern-versions.json: for each pattern that
// matches no caption of the current version (src/document/bc-captions.json), the older versions in
// which Microsoft's Base Application shows a caption it matches. docs/KNOWLEDGE_PATTERN_REVIEW.md
// (scripts/knowledge-pattern-review.js) uses it, so a pattern is only marked as found in no version
// when it was compared with them.
//
// usage: node --max-old-space-size=8192 scripts/compare-older-captions.js <work folder> <version>...
//   <version>  sandbox artifact versions, such as 28.5.54976.58543
//   <work folder>  outside the repository: each version's captions per language are kept there
//                  (<work>/older/<version>/<locale>.json); the .app files are not kept.
//
// Each country's Base Application is read with HTTP range requests, only its translation file is
// used, and every Property Caption in it counts: pages, actions, controls and table fields. This is
// a developer tool; nothing in the extension runs it, and the extension sends nothing to Microsoft.
const fs = require("fs");
const path = require("path");
const JSZip = require("jszip");
const { remoteZip, read, innerApp } = require("./update-bc-tables");
const { readXliff } = require("../src/document/app-captions");

const BASE = "https://bcartifacts-exdbf9fwegejdqak.b02.azurefd.net/sandbox";
// W1 is the worldwide version: its English (VAT Returns, for example) is not the US English.
const COUNTRIES = { us: "en-US", w1: "en", se: "sv-SE", fr: "fr-FR", de: "de-DE", es: "es-ES", dk: "da-DK", fi: "fi-FI", no: "nb-NO" };
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "tests", "fixtures", "knowledge-pattern-versions.json");
const KINDS = [["pagePatterns", "p"], ["actionPatterns", "a"], ["fieldPatterns", "f"]];

// The captions of one version's Base Application in one language, from the work folder or the artifact.
async function versionCaptions(work, version, country, locale) {
  const file = path.join(work, "older", version, `${locale}.json`);
  if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, "utf8"));
  const zip = await remoteZip(`${BASE}/${version}/${country}`);
  // Older artifacts name their entries with backslashes (Applications.US\...).
  const entries = zip.entries.map(entry => ({ ...entry, name: entry.name.replace(/\\/gu, "/") }))
    .filter(entry => /^(?:Applications[^/]*|Extensions)\/.*\.app$/iu.test(entry.name) &&
      /^Microsoft_Base Application_\d/iu.test(path.posix.basename(entry.name)));
  const entry = entries.find(item => /^Applications/iu.test(item.name)) || entries[0];
  if (!entry) throw new Error(`${version} ${country}: no Base Application`);
  const data = await innerApp(await read(zip, entry));
  const app = await JSZip.loadAsync(data.subarray(data.indexOf(Buffer.from("PK\u0003\u0004", "latin1"))));
  const names = Object.keys(app.files);
  const translated = locale.includes("-") && names.find(name => name.toLowerCase().endsWith(`.${locale.toLowerCase()}.xlf`));
  const generated = locale.startsWith("en") && names.find(name => /^Translations\/.*\.g\.xlf$/iu.test(name));
  if (!translated && !generated) throw new Error(`${version} ${country}: no ${locale} translation`);
  const captions = [...new Set(readXliff(await app.file(translated || generated).async("string"), !translated).values())]
    .filter(Boolean).sort();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(captions));
  return captions;
}

// The whole-caption patterns that match no caption of the current version.
function patternsToCompare() {
  const readJson = file => JSON.parse(fs.readFileSync(path.join(ROOT, file), "utf8"));
  const table = readJson("src/document/bc-captions.json");
  const byKind = { p: new Set(), a: new Set(), f: new Set() };
  for (const [key, row] of Object.entries(table.keys)) for (const caption of table.rows[row]) if (caption) byKind[key[0]].add(caption);
  const lists = Object.fromEntries(Object.entries(byKind).map(([kind, set]) => [kind, [...set]]));
  const index = readJson("src/knowledge-packs/index.json");
  const result = new Set();
  for (const entry of index.packs.filter(item => item.enabled)) {
    const pack = readJson(path.join("src", entry.file));
    for (const rule of pack.rules || []) {
      for (const [field, kind] of KINDS) {
        for (const pattern of rule.match?.[field] || []) {
          if (!(pattern.length > 2 && pattern.startsWith("^") && pattern.endsWith("$"))) continue;
          let regex;
          try { regex = new RegExp(pattern, "iu"); } catch { continue; }
          if (!lists[kind].some(caption => regex.test(caption))) result.add(pattern);
        }
      }
    }
  }
  return { patterns: [...result].sort(), current: table.version };
}

async function main() {
  const [work, ...versions] = process.argv.slice(2);
  if (!work || !versions.length || versions.some(version => !/^\d+\.\d+\.\d+\.\d+$/u.test(version))) {
    throw new Error("usage: node --max-old-space-size=8192 scripts/compare-older-captions.js <work folder> <version>...");
  }
  if (path.resolve(work).startsWith(ROOT + path.sep)) throw new Error("keep the work folder outside the repository");
  const { patterns, current } = patternsToCompare();
  const compiled = patterns.map(pattern => [pattern, new RegExp(pattern, "iu")]);
  const found = new Map(patterns.map(pattern => [pattern, new Map()])); // pattern -> version -> locales
  for (const version of versions) {
    for (const [country, locale] of Object.entries(COUNTRIES)) {
      const captions = await versionCaptions(path.resolve(work), version, country, locale);
      for (const [pattern, regex] of compiled) {
        if (!captions.some(caption => regex.test(caption))) continue;
        const byVersion = found.get(pattern);
        if (!byVersion.has(version)) byVersion.set(version, []);
        byVersion.get(version).push(locale);
      }
      console.error(`${version} ${locale}: ${captions.length} captions`);
    }
  }
  const data = { source: "Microsoft Base Application translation files (every Property Caption: pages, actions, controls and table fields)",
    current, versions, patterns: Object.fromEntries(patterns.map(pattern =>
      [pattern, Object.fromEntries([...found.get(pattern)].map(([version, locales]) => [version, locales.sort()]))])) };
  fs.writeFileSync(OUT, `${JSON.stringify(data, null, 1)}\n`);
  const none = patterns.filter(pattern => !found.get(pattern).size).length;
  console.log(`Wrote ${path.relative(ROOT, OUT)}: ${patterns.length} patterns, ${patterns.length - none} found in an older version, ${none} in none.`);
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
