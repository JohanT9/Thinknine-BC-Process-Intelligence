const assert = require("assert");
const fs = require("fs");
const vm = require("vm");
const source = fs.readFileSync("src/ui/dashboard.js", "utf8");
const code = source.slice(source.indexOf("let reviewWordExportPending = false;"),
  source.indexOf('globalThis.T9ReviewToolbar.bind($("reviewToolbar")'));
function setup(options = {}) {
  const elements = {};
  let exports = 0;
  const context = {
    activeReview: {}, uiT: x => x, console,
    $: id => elements[id] ||= { disabled: true, hidden: true, textContent: "",
      attributes: { "aria-busy": "false" }, classList: { toggle() {} },
      setAttribute(k,v) { this.attributes[k] = v; },
      removeAttribute(k) { delete this.attributes[k]; },
      hasAttribute(k) { return k in this.attributes; } },
    reviewPersistence: { saveExplicitly: async () => {
      if (options.saveFails) throw Error("Save failed");
    } },
    exportActiveReviewToWord: async () => { exports++; if (options.exportFails) throw Error("Download failed"); },
    applyReviewToolbarState() {}, renderDocumentExportCheck() {}, show() {}
  };
  vm.createContext(context); vm.runInContext(code, context);
  return { context, elements, exports: () => exports, options };
}
(async () => {
  const success = setup();
  const button = success.context.$("exportWordReview");
  await Promise.all([success.context.exportReviewFromToolbar(button),
    success.context.exportReviewFromToolbar(success.context.$("documentExportWord"))]);
  assert.strictEqual(success.exports(), 1, "Single operation across both buttons");
  assert.strictEqual(success.elements.reviewExportStatus.hidden, false);
  assert.strictEqual(success.elements.reviewExportStatus.textContent, "review.exportDownloaded");
  assert.strictEqual(button.disabled, false);
  for (const id of ["exportWordReview", "documentExportWord"]) {
    assert.strictEqual(success.elements[id].hasAttribute("aria-busy"), false);
  }
  const running = setup();
  let release;
  running.context.exportActiveReviewToWord = () => new Promise(resolve => { release = resolve; });
  const pending = running.context.exportReviewFromToolbar(running.context.$("exportWordReview"));
  await new Promise(resolve => setImmediate(resolve));
  for (const id of ["exportWordReview", "documentExportWord"]) {
    assert.strictEqual(running.elements[id].disabled, true);
    assert.strictEqual(running.elements[id].attributes["aria-busy"], "true");
  }
  release();
  await pending;
  const failure = setup({ exportFails: true });
  await failure.context.exportReviewFromToolbar(failure.context.$("documentExportWord"));
  assert.match(failure.elements.reviewExportStatus.textContent, /Download failed/);
  failure.options.exportFails = false;
  await failure.context.exportReviewFromToolbar(failure.context.$("documentExportWord"));
  assert.strictEqual(failure.exports(), 2, "Retry after failure");
  const save = setup({ saveFails: true });
  await save.context.exportReviewFromToolbar(save.context.$("exportWordReview"));
  assert.strictEqual(save.exports(), 1);
  assert.match(save.elements.reviewExportStatus.textContent, /Save failed/);
  console.log("Review Word export interaction tests passed.");
})().catch(error => { console.error(error); process.exitCode = 1; });
