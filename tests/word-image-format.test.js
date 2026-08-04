const assert = require("assert");
const fs = require("fs");
const path = require("path");
const zipWriter = require("../src/exporters/zip-writer");
const word = require("../src/exporters/word-exporter");

const png = new Uint8Array(Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl8lJ0AAAAASUVORK5CYII=",
  "base64"
));

const jpeg = new Uint8Array(Buffer.from(
  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABBQJ//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPwF//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPwF//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQAGPwJ//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPyF//9oADAMBAAIAAwAAABB//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPxB//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPxB//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxB//9k=",
  "base64"
));

assert.strictEqual(
  word.detectImageFormat({ bytes: jpeg, mimeType: "image/jpeg" }).extension,
  "jpg"
);
assert.strictEqual(
  word.detectImageFormat({ bytes: png, mimeType: "image/png" }).extension,
  "png"
);

const result = word.createDocx(
  {
    session: { id: "s1", name: "Bildformatstest" },
    review: {
      sessionName: "Bildformatstest",
      tasks: [
        {
          taskId: "png",
          instruction: "PNG-steg",
          screenshot: "png-image"
        },
        {
          taskId: "jpg",
          instruction: "JPEG-steg",
          screenshot: "jpg-image"
        }
      ]
    },
    screenshotData: {
      "png-image": { bytes: png, mimeType: "image/png" },
      "jpg-image": { bytes: jpeg, mimeType: "image/jpeg" }
    }
  },
  zipWriter
);

const output = path.join(__dirname, "sample-mixed-images.docx");
fs.writeFileSync(output, result.bytes);

assert.strictEqual(result.imageCount, 2);
assert.ok(
  result.files.some(file => file.name.endsWith(".png"))
);
assert.ok(
  result.files.some(file => file.name.endsWith(".jpg"))
);

const contentTypes = result.files.find(
  file => file.name === "[Content_Types].xml"
).data;

assert.ok(contentTypes.includes('Extension="png"'));
assert.ok(contentTypes.includes('Extension="jpg"'));
assert.ok(contentTypes.includes('ContentType="image/jpeg"'));

console.log(`Word image format tests passed: ${output}`);
