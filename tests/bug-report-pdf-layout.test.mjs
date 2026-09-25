import assert from "node:assert/strict";
import zlib from "node:zlib";
import { create } from "../src/bug-report/report-pdf.mjs";

const crcTable = Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit += 1) crc = crc & 1
    ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  return crc >>> 0;
});
const crc32 = buffer => {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const name = Buffer.from(type, "ascii");
  const size = Buffer.alloc(4); size.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4); checksum.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([size, name, data, checksum]);
};
const png = color => {
  const width = 1600, height = 900;
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4);
  header[8] = 8; header[9] = 2;
  const row = Buffer.alloc(1 + width * 3);
  for (let x = 0; x < width; x += 1) {
    row[1 + x * 3] = color[0]; row[2 + x * 3] = color[1];
    row[3 + x * 3] = color[2];
  }
  const raw = Buffer.concat(Array.from({ length: height }, () => row));
  return `data:image/png;base64,${Buffer.concat([
    Buffer.from("89504e470d0a1a0a", "hex"), chunk("IHDR", header),
    chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))
  ]).toString("base64")}`;
};

const steps = ["Open the warehouse receipt.", "Show open lines.",
  "Open the document.", "Choose Register weight."];
const pkg = { title: "Register weight error", documentLanguage: "en-US",
  generatedAt: "2026-09-23T10:00:00Z", expectedResult: "The weight is registered.",
  environment: { businessCentral: { company: "Demo", environment: "Sandbox" } },
  errorEvidence: { primary: { rawMessage: "A numeric conversion failed.",
    precedingActionEventId: "event-4" } },
  reproduction: steps.map((instruction, index) => ({
    reproductionStepId: `step-${index + 1}`, instruction,
    source: { sourceCanonicalEventIds: [`event-${index + 1}`] }
  })), diagnostics: { rows: [] }, callStack: [] };
const colors = [[12, 83, 91], [0, 120, 125], [35, 70, 110],
  [90, 110, 130], [150, 60, 45]];
const attachments = colors.map((color, index) => ({
  role: index === colors.length - 1 ? "error-evidence" : "reproduction-evidence",
  sourceRef: `step-${Math.min(index + 1, 4)}`, dataUrl: png(color)
}));

const result = await create(pkg, attachments);
assert.ok(result.pageCount <= 4,
  `Five screenshots should fit within four pages, received ${result.pageCount}`);
assert.equal(result.layout.screenshots.length, 5);
assert.ok(result.layout.screenshots.every(image => image.height >= 150),
  "Screenshots must remain readable after compact pagination");
const byPage = result.layout.screenshots.reduce((pages, image) => {
  if (!pages.has(image.page)) pages.set(image.page, []);
  pages.get(image.page).push(image);
  return pages;
}, new Map());
for (const images of byPage.values()) {
  const ordered = [...images].sort((left, right) => right.top - left.top);
  for (let index = 1; index < ordered.length; index += 1) {
    assert.ok(ordered[index - 1].bottom >= ordered[index].top,
      "Screenshot blocks must not overlap");
  }
}
assert.ok([...byPage.values()].some(images => images.length === 2),
  "At least two screenshots should share a page");
assert.ok([...byPage.keys()].every(page => page >= 1 && page <= result.pageCount));
console.log("Compact bug report PDF pagination tests passed.");
