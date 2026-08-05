import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { pathToFileURL } from "node:url";

const moduleRoot = path.resolve(process.argv[2] || ".");
const outputDirectory = path.resolve(process.argv[3] || ".tmp/rc8-comparison");
const label = process.argv[4] || "rc8";

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])));
  return Buffer.concat([length, typeBytes, data, checksum]);
}

function screenshotPng(variant) {
  const width = 1280;
  const height = 720;
  const pixels = Buffer.alloc((width * 4 + 1) * height);
  const set = (x, y, red, green, blue, alpha = 255) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const offset = y * (width * 4 + 1) + 1 + x * 4;
    pixels[offset] = red;
    pixels[offset + 1] = green;
    pixels[offset + 2] = blue;
    pixels[offset + 3] = alpha;
  };
  const rectangle = (x, y, boxWidth, boxHeight, color) => {
    for (let row = y; row < y + boxHeight; row += 1) {
      for (let column = x; column < x + boxWidth; column += 1) {
        set(column, row, ...color);
      }
    }
  };
  rectangle(0, 0, width, height, [245, 247, 249]);
  rectangle(0, 0, width, 72, [15, 76, 129]);
  rectangle(0, 72, 230, height - 72, [236, 241, 245]);
  rectangle(26, 20, 34, 34, [255, 255, 255]);
  for (let index = 0; index < 5; index += 1) {
    rectangle(24, 112 + index * 54, 178, 30,
      index === variant ? [217, 234, 247] : [226, 231, 235]);
  }
  rectangle(270, 112, 950, 54, [255, 255, 255]);
  rectangle(292, 129, 420, 18, [204, 214, 222]);
  rectangle(270, 192, 950, 420, [255, 255, 255]);
  for (let row = 0; row < 5; row += 1) {
    rectangle(294, 220 + row * 66, 180, 18, [111, 128, 143]);
    rectangle(510, 216 + row * 66, 650, 30,
      row === variant ? [218, 239, 247] : [235, 239, 242]);
  }
  rectangle(1000, 634, 220, 44, [15, 108, 189]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return new Uint8Array(Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(pixels, { level: 9 })),
    chunk("IEND", Buffer.alloc(0))
  ]));
}

const pipelineModule = await import(pathToFileURL(path.join(
  moduleRoot,
  "src/exporters/word-export-pipeline.js"
)).href);
await import(pathToFileURL(path.join(
  moduleRoot,
  "src/exporters/word-exporter-docx.mjs"
)).href);
const pipeline = pipelineModule.default || pipelineModule;
const session = {
  id: "presentation-comparison",
  name: "Professionell orderhantering",
  purpose: "Säkerställ korrekt order- och leveranshantering i Business Central.",
  startedAt: "2026-08-05T08:00:00.000Z",
  endedAt: "2026-08-05T09:00:00.000Z",
  settings: { environmentName: "Test", documentationProfile: "Arbetsinstruktion" }
};
const review = {
  sessionId: session.id,
  sessionName: session.name,
  createdAt: session.startedAt,
  updatedAt: session.endedAt,
  status: "completed",
  reviewer: "Anna Andersson",
  tasks: [{
    taskId: "order-step",
    instruction: "Öppna kundordern och kontrollera kund- och leveransinformation.",
    userComment: "Kontrollera särskilt att leveransdatumet är rimligt.",
    screenshot: "order.png"
  }, {
    taskId: "posting-step",
    instruction: "Frisläpp ordern och kontrollera att statusen uppdateras.",
    screenshot: "posting.png"
  }]
};
const prepared = pipeline.create({ review, session, themeId: "thinknine" });
const images = [screenshotPng(1), screenshotPng(3)];
const mediaAssets = Object.fromEntries(prepared.semanticDocument.assets.map(
  (asset, index) => [asset.assetId, {
    bytes: images[index % images.length],
    mimeType: "image/png"
  }]
));
const rendered = await globalThis.T9Export.word.renderPlan({
  plan: prepared.plan,
  mediaAssets
});
fs.mkdirSync(outputDirectory, { recursive: true });
const documentPath = path.join(outputDirectory, `${label}.docx`);
try {
  fs.writeFileSync(documentPath, Buffer.from(await rendered.blob.arrayBuffer()));
} catch (error) {
  if (error?.code !== "EBUSY" || !fs.existsSync(documentPath)) throw error;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const professional = prepared.plan.content?.presentationProfile === "professional";
const imageUrl = `data:image/png;base64,${Buffer.from(images[0]).toString("base64")}`;
const commonStyles = `
  * { box-sizing: border-box; }
  body { margin: 0; background: #dfe4e8; color: #263746;
    font-family: Aptos, Arial, sans-serif; }
  .page { width: 816px; min-height: 1056px; margin: 20px auto; background: white;
    padding: 72px 76px; box-shadow: 0 4px 18px #0002; }
  h1, h2, h3 { color: #0f4c81; }
  .brand { color: #0f4c81; font-size: 14px; font-weight: 700; letter-spacing: 1px; }
  .subtitle { color: #5b6b78; }
  .meta { width: ${professional ? "86%" : "100%"}; margin: 32px auto 0;
    border-collapse: collapse; font-size: 13px; }
  .meta td { padding: ${professional ? "8px 10px" : "5px"};
    border: 1px solid #d6dde3; }
  .meta td:first-child { font-weight: 700; color: #0f4c81;
    background: ${professional ? "#eaf2f8" : "white"}; width: 34%; }
  .step-title { margin-top: 26px; padding: ${professional ? "8px 12px" : "0"};
    background: ${professional ? "#eaf2f8" : "transparent"};
    border-left: ${professional ? "5px solid #38a3d1" : "0"}; }
  .section-title { padding-bottom: ${professional ? "7px" : "0"};
    border-bottom: ${professional ? "2px solid #38a3d1" : "0"}; }
  .shot { width: ${professional ? "100%" : "74%"}; display: block;
    margin: 18px auto; padding: ${professional ? "5px" : "0"};
    border: ${professional ? "1px solid #cbd8e1" : "0"};
    background: ${professional ? "#f7fafc" : "transparent"}; }
  .callout { margin: 14px 0; padding: ${professional ? "10px 12px" : "7px"};
    background: ${professional ? "#edf6fb" : "#fff4cc"};
    border-left: ${professional ? "5px solid #38a3d1" : "1px solid #d7a900"}; }
  .footer { margin-top: 44px; padding-top: 8px; border-top: 1px solid #d6dde3;
    color: #697985; font-size: 10px; text-align: center; }
`;
const metadataRows = [
  ["Version", "4.4.0 RC8"],
  ["Datum", "2026-08-05"],
  ["Miljö", "Test"],
  ["Dokumentationstyp", "Arbetsinstruktion"],
  ["Granskningsstatus", "Slutförd"],
  ["Granskad av", review.reviewer]
].map(([key, value]) => `<tr><td>${escapeHtml(key)}</td><td>${escapeHtml(value)}</td></tr>`).join("");
const coverHtml = `<!doctype html><meta charset="utf-8"><style>${commonStyles}</style>
  <main class="page"><div class="brand">THINKNINE PROCESS INTELLIGENCE</div>
  <h1 style="font-size:${professional ? "38px" : "30px"};margin-top:${professional ? "145px" : "70px"}">
    ${escapeHtml(session.name)}</h1>
  <p class="subtitle" style="font-size:${professional ? "18px" : "14px"}">${escapeHtml(session.purpose)}</p>
  ${professional ? '<div style="width:90px;border-top:4px solid #38a3d1;margin:28px 0"></div>' : ""}
  <table class="meta">${metadataRows}</table><div class="footer">Thinknine Process Intelligence</div></main>`;
const workflowHtml = `<!doctype html><meta charset="utf-8"><style>${commonStyles}</style>
  <main class="page"><h1 class="section-title">Arbetsgång</h1>
  <h2 class="step-title">Steg 1</h2><p>${escapeHtml(review.tasks[0].instruction)}</p>
  <div class="callout"><strong>Kommentar: </strong>${escapeHtml(review.tasks[0].userComment)}</div>
  <img class="shot" src="${imageUrl}" alt="Business Central-skärmbild">
  <h2 class="step-title">Steg 2</h2><p>${escapeHtml(review.tasks[1].instruction)}</p>
  <div class="footer">Professionell orderhantering · Sida 2</div></main>`;
fs.writeFileSync(path.join(outputDirectory, `${label}-cover.html`), coverHtml);
fs.writeFileSync(path.join(outputDirectory, `${label}-workflow.html`), workflowHtml);
