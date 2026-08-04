const assert = require("assert");
const fs = require("fs");
const path = require("path");
const zipWriter = require("../src/exporters/zip-writer");
const word = require("../src/exporters/word-exporter");

const onePixelPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl8lJ0AAAAASUVORK5CYII=",
  "base64"
);

const result = word.createDocx(
  {
    session: {
      id: "session-1",
      name: "Ändra utleveransdatum",
      purpose: "Beskriver hur utleveransdatum ändras.",
      settings: {
        environmentName: "ApteanAdvance",
        documentationProfile: "generic"
      }
    },
    review: {
      sessionName: "Ändra utleveransdatum",
      status: "completed",
      reviewer: "Johan Johansson",
      tasks: [
        {
          taskId: "step-1",
          instruction: "Öppna sidan **Förs.order**.",
          screenshot: "screenshots/000001.png",
          confidenceScore: 98,
          pageCaption: "Förs.order"
        },
        {
          taskId: "step-2",
          instruction: "Ange **Utleveransdatum**.",
          userComment: "Kontrollera att ordern är öppen.",
          confidenceScore: 95,
          pageCaption: "Förs.order"
        }
      ]
    },
    screenshotData: {
      "screenshots/000001.png": new Uint8Array(onePixelPng)
    }
  },
  zipWriter
);

assert.ok(result.bytes.length > 2000);
assert.strictEqual(result.taskCount, 2);
assert.strictEqual(result.imageCount, 1);

const output = path.join(__dirname, "sample-word-export.docx");
fs.writeFileSync(output, result.bytes);

assert.ok(fs.existsSync(output));
console.log(`Word exporter tests passed: ${output}`);
