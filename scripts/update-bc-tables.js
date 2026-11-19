"use strict";
// Rebuilds the tables made from Microsoft's Business Central artifacts in one run:
// src/document/bc-captions.json (page, field and action captions) and src/bug-report/error-labels.js
// with src/bug-report/error-known.json (error messages, where they come from and their actions),
// the knowledge rules' captions (src/knowledge-packs/generated/bc-rule-captions.json) and the web
// client's own button captions (tests/fixtures/bc-client-resources.json).
//
// usage: node --max-old-space-size=8192 scripts/update-bc-tables.js <version> <work folder>
//   <version>      a sandbox artifact version, such as 29.1.57326.58379
//   <work folder>  where the downloaded packages are kept; outside the repository, never committed
//
// Only the countries of the registered languages are read. The artifacts are over 1 GB each, so
// only the needed files are read from them with HTTP range requests: each country's Base
// Application and its other Microsoft apps, and the platform's language resources. A file that is
// already in the work folder is not fetched again. This is a developer tool; nothing in the
// extension runs it, and the extension sends nothing to Microsoft.

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const { execFileSync } = require("child_process");

const BASE = "https://bcartifacts-exdbf9fwegejdqak.b02.azurefd.net/sandbox";
// Country of each registered language's Base Application, as scripts/build-bc-captions.js names them.
const COUNTRIES = { us: "en-US", se: "sv-SE", fr: "fr-FR", de: "de-DE", es: "es-ES", dk: "da-DK", fi: "fi-FI", no: "nb-NO" };
// Apps that hold no errors a user meets: tests, demo data, tools and language packs.
const SKIP_APP = /^Microsoft_Base Application$|test|language \(|demo|contoso|buildtools|library|mock|performance toolkit|ai development|agent samples|_exclude|power bi report|^Microsoft_Application$|^Microsoft_Any$/iu;

async function head(url) {
  const response = await fetch(url, { method: "HEAD" });
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  return Number(response.headers.get("content-length"));
}
async function range(url, start, length) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { Range: `bytes=${start}-${start + length - 1}` } });
      if (response.status !== 206) throw new Error(`${url}: ${response.status}, no range support`);
      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      if (attempt >= 3) throw error;
    }
  }
}

// The entries of a zip: name, compression, sizes and where the local header is. at(start, length)
// reads bytes of the zip, from a server or from memory.
async function zipEntries(at, size) {
  const tail = await at(Math.max(0, size - 65558), Math.min(size, 65558));
  const end = tail.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (end < 0) return null;
  let count = tail.readUInt16LE(end + 10);
  let directorySize = tail.readUInt32LE(end + 12);
  let directoryOffset = tail.readUInt32LE(end + 16);
  const locator = end - 20;
  if (locator >= 0 && tail.readUInt32LE(locator) === 0x07064b50) {
    const record = await at(Number(tail.readBigUInt64LE(locator + 8)), 56);
    count = Number(record.readBigUInt64LE(32));
    directorySize = Number(record.readBigUInt64LE(40));
    directoryOffset = Number(record.readBigUInt64LE(48));
  }
  const directory = await at(directoryOffset, directorySize);
  const entries = [];
  for (let offset = 0, index = 0; index < count; index += 1) {
    const nameLength = directory.readUInt16LE(offset + 28);
    const extraLength = directory.readUInt16LE(offset + 30);
    const commentLength = directory.readUInt16LE(offset + 32);
    const entry = { method: directory.readUInt16LE(offset + 10), compressed: directory.readUInt32LE(offset + 20),
      size: directory.readUInt32LE(offset + 24), offset: directory.readUInt32LE(offset + 42),
      name: directory.toString("utf8", offset + 46, offset + 46 + nameLength) };
    // Zip64: the sizes and offset that do not fit 32 bits are in the extra field, in this order.
    for (let extra = offset + 46 + nameLength; extra < offset + 46 + nameLength + extraLength;) {
      const id = directory.readUInt16LE(extra);
      const length = directory.readUInt16LE(extra + 2);
      if (id === 1) {
        let field = extra + 4;
        for (const key of ["size", "compressed", "offset"]) {
          if (entry[key] === 0xffffffff) { entry[key] = Number(directory.readBigUInt64LE(field)); field += 8; }
        }
      }
      extra += 4 + length;
    }
    entries.push(entry);
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return { at, entries };
}
async function remoteZip(url) {
  const zip = await zipEntries((start, length) => range(url, start, length), await head(url));
  if (!zip) throw new Error(`${url}: not a zip`);
  return zip;
}
async function read(zip, entry) {
  const header = await zip.at(entry.offset, 30);
  const start = entry.offset + 30 + header.readUInt16LE(26) + header.readUInt16LE(28);
  const data = await zip.at(start, entry.compressed);
  return entry.method === 8 ? zlib.inflateRawSync(data) : data;
}
// A ready-to-run package is an outer zip with the real .app inside. An .app is a short header and a
// zip with NavxManifest.xml; the offsets of that zip count from after the header.
async function innerApp(data) {
  const start = data.indexOf(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
  if (start < 0) return data;
  const body = data.subarray(start);
  const zip = await zipEntries(async (from, length) => body.subarray(from, from + length), body.length);
  if (!zip || zip.entries.some(entry => entry.name === "NavxManifest.xml")) return data;
  const inner = zip.entries.find(entry => /.app$/iu.test(entry.name));
  return inner ? read(zip, inner) : data;
}
async function save(file, produce) {
  if (fs.existsSync(file)) return false;
  const data = await produce();
  fs.writeFileSync(`${file}.part`, data);
  fs.renameSync(`${file}.part`, file);
  return true;
}

async function main() {
  const [version, work] = process.argv.slice(2);
  if (!/^\d+\.\d+\.\d+\.\d+$/u.test(version || "") || !work) {
    throw new Error("usage: node --max-old-space-size=8192 scripts/update-bc-tables.js <version> <work folder>");
  }
  const root = path.resolve(__dirname, "..");
  const folder = path.resolve(work, version);
  if (folder.startsWith(root + path.sep)) throw new Error("keep the work folder outside the repository");
  const baseFolder = path.join(folder, "base");
  const appsFolder = path.join(folder, "apps");
  const platformFolder = path.join(folder, "platform");
  [baseFolder, appsFolder, platformFolder].forEach(item => fs.mkdirSync(item, { recursive: true }));

  for (const country of Object.keys(COUNTRIES)) {
    const zip = await remoteZip(`${BASE}/${version}/${country}`);
    const apps = new Map();
    for (const entry of zip.entries) {
      if (!/^(?:Applications[^/]*|Extensions)\/.*\.app$/iu.test(entry.name)) continue;
      const name = path.basename(entry.name).replace(/_\d+(?:\.\d+)+\.app$/iu, "");
      // The Applications folder has the plain .app; Extensions has a ready-to-run copy.
      if (!apps.has(name) || /^Applications/iu.test(entry.name)) apps.set(name, entry);
    }
    const base = apps.get("Microsoft_Base Application");
    if (!base) throw new Error(`${country}: no Base Application in the artifact`);
    if (await save(path.join(baseFolder, `${country}.app`), async () => innerApp(await read(zip, base)))) {
      console.error(`${country}: Base Application`);
    }
    let fetched = 0;
    for (const [name, entry] of apps) {
      if (SKIP_APP.test(name)) continue;
      const file = path.join(appsFolder, `${name.replace(/[\\/:*?"<>|]/gu, "_")}.app`);
      if (await save(file, async () => innerApp(await read(zip, entry)))) fetched += 1;
    }
    console.error(`${country}: ${fetched} new apps`);
  }

  const platform = await remoteZip(`${BASE}/${version}/platform`);
  for (const locale of Object.values(COUNTRIES)) {
    const entry = platform.entries.find(item => new RegExp(`/Service/${locale}/Microsoft\\.Dynamics\\.Nav\\.Language\\.resources\\.dll$`, "iu").test(item.name));
    if (!entry) throw new Error(`platform: no language resources for ${locale}`);
    await save(path.join(platformFolder, `${locale}.dll`), () => read(platform, entry));
  }
  console.error("platform: language resources");
  // The web client's own captions (New, Edit, Yes, Back...), to check engine/bc-client-captions.js.
  const clientFolder = path.join(folder, "client");
  fs.mkdirSync(clientFolder, { recursive: true });
  for (const locale of Object.values(COUNTRIES)) {
    const entry = platform.entries.find(item => new RegExp(`/WebPublish/wwwroot/Resources/Lang/${locale}/Microsoft\\.Dynamics\\.Framework\\.Resource\\.js$`, "iu").test(item.name));
    if (!entry) throw new Error(`platform: no web client resources for ${locale}`);
    await save(path.join(clientFolder, `${locale}.js`), () => read(platform, entry));
  }
  console.error("platform: web client resources");

  const node = [process.execPath, "--max-old-space-size=8192"];
  const run = args => execFileSync(node[0], [...node.slice(1), ...args], { cwd: root, stdio: "inherit" });
  run(["scripts/build-bc-captions.js", baseFolder]);
  run(["scripts/build-error-labels.js", baseFolder, platformFolder, version, appsFolder]);
  run(["scripts/build-knowledge-captions.js"]);
  run(["scripts/build-client-resources.js", clientFolder, version]);
  console.error(`Built from Business Central ${version}. Run npm run build and the tests, and review the diff.`);
}

if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });

module.exports = { remoteZip, read, innerApp };
