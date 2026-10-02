const assert = require("node:assert/strict");
const fs = require("node:fs");
const source = fs.readFileSync("src/ui/popup.js", "utf8");
const start = source.indexOf("function renderLicenseCard(");
const end = source.indexOf("async function prepareTenantLicense(", start);
assert.ok(start >= 0 && end > start, "popup license functions are present");
const functions = source.slice(start, end);

function harness(responses) {
  const sent = [];
  const elements = new Map();
  const $ = id => {
    if (!elements.has(id)) elements.set(id, { textContent: "", disabled: false,
      title: "", classes: {}, classList: { toggle(name, enabled) { this.owner.classes[name] = enabled; } } });
    const element = elements.get(id);
    element.classList.owner = element;
    return element;
  };
  const sandbox = {
    $, t: key => key, updateText: (element, value) => { element.textContent = value; },
    formatLicenseExpiry: value => value ? String(value) : "—",
    currentTab: async () => ({ id: 17, url: "https://businesscentral.dynamics.com/20afb97e-bbca-4f0d-a72b-e4cbbcdd57fb/Sandbox" }),
    send: async message => {
      sent.push(message);
      if (responses.throwOn === message.type) throw new Error("offline");
      return responses[message.type];
    },
    globalThis: { T9TenantLicense: { tenantFromUrl: () => "20afb97e-bbca-4f0d-a72b-e4cbbcdd57fb" } }
  };
  const update = new Function("globalThis", "currentTab", "send", "t", "updateText", "formatLicenseExpiry", "$",
    `${functions}; return updateLicenseCard;`)(sandbox.globalThis, sandbox.currentTab,
    sandbox.send, sandbox.t, sandbox.updateText, sandbox.formatLicenseExpiry, sandbox.$);
  return { update, sent, elements };
}

async function main() {
  const oldActive = { allowed: true, licenseType: "standard", expiresAt: Date.now() + 3600000 };
  const checked = harness({
    T9_LICENSE_INFORMATION: { ok: true, information: { requiresAcceptance: false } },
    T9_CONSULTANT_LICENSE_STATUS: { ok: true, signedIn: false },
    T9_LICENSE_SUMMARY: { ok: true, licenses: [{ tenantId: "20afb97e-bbca-4f0d-a72b-e4cbbcdd57fb", ...oldActive }] },
    T9_LICENSE_CHECK: { ok: true, license: { allowed: false, trialAvailable: true,
      licenseStatus: "unregistered", licenseType: "standard", expiresAt: Date.now() + 60000 } }
  });
  await checked.update();
  assert.ok(checked.sent.some(message => message.type === "T9_LICENSE_CHECK" && message.force === true),
    "opening the popup forces a current server check");
  assert.ok(!checked.sent.some(message => message.type === "T9_LICENSE_SUMMARY"),
    "a cached active summary is not used to present the card");
  assert.equal(checked.elements.get("licenseCard").classes.active, false);
  assert.equal(checked.elements.get("licenseCardType").textContent, "—");
  assert.equal(checked.elements.get("licenseCardExpiry").textContent, "—",
    "an inactive response never shows a misleading license type or expiry date");
  assert.equal(checked.elements.get("licenseCardStatus").textContent, "license.cardTrialAvailable");
  assert.equal(checked.elements.get("licenseCardAction").textContent, "license.cardSignInTrial");

  const active = harness({
    T9_LICENSE_INFORMATION: { ok: true, information: { requiresAcceptance: false } },
    T9_CONSULTANT_LICENSE_STATUS: { ok: true, signedIn: false },
    T9_LICENSE_CHECK: { ok: true, license: { allowed: true, licenseType: "standard",
      expiresAt: Date.now() + 3600000 } }
  });
  await active.update();
  assert.equal(active.elements.get("licenseCard").classes.active, true,
    "a successful current server response still shows the active state");
  assert.equal(active.elements.get("licenseCardStatus").textContent, "license.cardActive");

  const ready = harness({
    T9_LICENSE_INFORMATION: { ok: true, information: { requiresAcceptance: false } },
    T9_CONSULTANT_LICENSE_STATUS: { ok: true, signedIn: true },
    T9_LICENSE_CHECK: { ok: true, license: { allowed: false, trialAvailable: true,
      licenseStatus: "unregistered" } }
  });
  await ready.update();
  assert.equal(ready.elements.get("licenseCardStatus").textContent, "license.cardTrialReady",
    "an already signed-in user sees a ready-to-start message, not another login prompt");
  assert.equal(ready.elements.get("licenseCardAction").textContent, "license.cardStartTrial");

  const offline = harness({
    T9_LICENSE_INFORMATION: { ok: true, information: { requiresAcceptance: false } },
    T9_CONSULTANT_LICENSE_STATUS: { ok: true, signedIn: false },
    T9_LICENSE_SUMMARY: { ok: true, licenses: [{ tenantId: "20afb97e-bbca-4f0d-a72b-e4cbbcdd57fb", ...oldActive }] },
    throwOn: "T9_LICENSE_CHECK"
  });
  await offline.update();
  assert.equal(offline.elements.get("licenseCard").classes.active, false,
    "a failed refresh never leaves a stale green license card");
  assert.equal(offline.elements.get("licenseCardType").textContent, "—");
  assert.equal(offline.elements.get("licenseCardStatus").textContent, "license.cardCheckFailed");

  const consent = harness({
    T9_LICENSE_INFORMATION: { ok: true, information: { requiresAcceptance: true } },
    T9_CONSULTANT_LICENSE_STATUS: { ok: true, signedIn: true },
    T9_LICENSE_SUMMARY: { ok: true, licenses: [{ tenantId: "20afb97e-bbca-4f0d-a72b-e4cbbcdd57fb", ...oldActive }] }
  });
  await consent.update();
  assert.ok(!consent.sent.some(message => message.type === "T9_LICENSE_CHECK"));
  assert.equal(consent.elements.get("licenseCard").classes.active, false);
  assert.equal(consent.elements.get("licenseCardStatus").textContent, "license.cardNeedsConsent");

  console.log("Popup license status is freshly checked and never shows stale cached access as active.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
