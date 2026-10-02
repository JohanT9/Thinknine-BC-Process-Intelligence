const assert = require("node:assert/strict");
const fs = require("node:fs");

const source = fs.readFileSync("src/ui/popup.js", "utf8");
const start = source.indexOf('$("licenseCardAction").addEventListener("click", async () => {');
const end = source.indexOf('\n\n$("startProcess")', start);
assert.ok(start >= 0 && end > start, "the license action handler is present");
const helperStart = source.indexOf("function setLicenseFeedback(");
const helperEnd = source.indexOf("\n\nfunction setStarting(", helperStart);
assert.ok(helperStart >= 0 && helperEnd > helperStart, "the license feedback helper is present");
const handler = source.slice(helperStart, helperEnd) + "\n\n" + source.slice(start, end);

function createHarness({ prepareTenantLicense }) {
  const elements = new Map();
  const $ = id => {
    if (!elements.has(id)) elements.set(id, {
      textContent: "", disabled: false, attributes: {}, classes: {},
      classList: { toggle(name, enabled) { this.owner.classes[name] = enabled; } },
      setAttribute(name, value) { this.attributes[name] = value; },
      addEventListener(name, callback) { this.listenerName = name; this.listener = callback; }
    });
    const element = elements.get(id);
    element.classList.owner = element;
    return element;
  };
  const updateText = (element, value) => { element.textContent = String(value); };
  const t = key => key;
  const currentTab = async () => ({ id: 17, url: "https://businesscentral.dynamics.com/tenant/Sandbox" });
  const renderLicenseCard = () => {};
  const updateLicenseCard = async () => {};
  new Function("$", "currentTab", "prepareTenantLicense", "renderLicenseCard",
    "updateLicenseCard", "updateText", "t", `${handler}; return true;`)(
    $, currentTab, prepareTenantLicense, renderLicenseCard, updateLicenseCard, updateText, t);
  return { elements, click: () => $("licenseCardAction").listener() };
}

async function main() {
  let finish;
  const pending = new Promise((resolve, reject) => { finish = { resolve, reject }; });
  const harness = createHarness({ prepareTenantLicense: () => pending });
  const click = harness.click();
  assert.equal(harness.elements.get("licenseCardAction").disabled, true,
    "the action is disabled while activation is running");
  assert.equal(harness.elements.get("licenseCardFeedback").textContent, "license.cardWorking",
    "progress is visible beside the license action immediately");
  assert.equal(harness.elements.get("licenseCard").attributes["aria-busy"], "true");

  finish.reject(new Error("Licenstjänsten kunde inte nås."));
  await click;
  assert.equal(harness.elements.get("licenseCardFeedback").textContent,
    "Licenstjänsten kunde inte nås.", "the actual failure is shown next to the action");
  assert.equal(harness.elements.get("licenseCardFeedback").classes.error, true);
  assert.equal(harness.elements.get("licenseCardAction").disabled, false,
    "the user can retry after a failure");
  assert.equal(harness.elements.get("licenseCard").attributes["aria-busy"], "false");

  const success = createHarness({ prepareTenantLicense: async () => ({
    license: { allowed: true, licenseType: "trial" }, tenantId: "tenant"
  }) });
  await success.click();
  assert.equal(success.elements.get("licenseCardFeedback").textContent,
    "license.trialActivated", "successful activation is confirmed beside the action");
  assert.equal(success.elements.get("licenseCardFeedback").classes.error, false);
  console.log("Trial activation gives immediate, in-card progress and visible retryable errors.");
}

main().catch(error => { console.error(error); process.exitCode = 1; });
