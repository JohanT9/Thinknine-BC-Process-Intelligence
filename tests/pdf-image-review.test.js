const assert = require("assert");
const fs = require("fs");
const source = fs.readFileSync("src/ui/technical-report.js", "utf8");
const body = source.slice(source.indexOf("    async function reviewPdfImages()"), source.indexOf("    async function emailReport()"));
const run = new Function("document", "issuePreviewState", "currentUiLocale", `${body}; return reviewPdfImages();`);
async function scenario(mode, excluded = [], images = [{ assetId: "a", role: "error-evidence", dataUrl: "data:image/png;base64,AA==" },
  { assetId: "b", role: "reproduction-evidence" }]) {
  const checks = []; const nodes = {};
  const element = tag => ({ append() {}, replaceChildren() {}, style: {},
    set type(value) { if (value === "checkbox") checks.push(this); } });
  let onClose;
  const dialog = { addEventListener: (_, fn) => { onClose = fn; },
    close(value) { this.returnValue = value; onClose(); },
    showModal() { excluded.forEach(index => { checks[index].checked = false; });
      nodes[mode === "confirm" ? "confirmPdfImages" : "cancelPdfImages"].onclick(); } };
  nodes.pdfImagePreview = dialog; nodes.pdfImageChoices = element("div");
  nodes.confirmPdfImages = {}; nodes.cancelPdfImages = {};
  const document = { getElementById: id => nodes[id], createElement: element, createTextNode: value => value };
  const state = { offlineAttachments: images, issuePackage: { reproduction: [] } };
  const before = JSON.stringify(state);
  const result = await run(document, state, "sv-SE");
  assert.equal(JSON.stringify(state), before, "Do not modify recording/package evidence");
  return result;
}
(async () => {
  assert.equal((await scenario("confirm")).length, 2);
  assert.deepEqual((await scenario("confirm", [0])).map(image => image.assetId), ["b"]);
  assert.deepEqual(await scenario("confirm", [0, 1]), []);
  assert.equal(await scenario("cancel"), null);
  assert.deepEqual(await scenario("confirm", [], []), []);
  console.log("PDF image review: include, exclude, exclude all, cancel and original preservation passed.");
})().catch(error => { console.error(error); process.exitCode = 1; });
