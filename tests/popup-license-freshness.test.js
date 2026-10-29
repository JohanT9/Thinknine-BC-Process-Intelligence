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
      title: "", classes: {}, attributes: {},
      setAttribute(name, value) { this.attributes[name] = String(value); },
      removeAttribute(name) { delete this.attributes[name]; },
      classList: { toggle(name, enabled) { this.owner.classes[name] = enabled; } } });
    const element = elements.get(id);
    element.classList.owner = element;
    return element;
  };
  const sandbox = {
    $, t: key => key, updateText: (element, value) => { element.textContent = value; },
    formatLicenseExpiry: value => value ? String(value) : "—",
    currentTab: async () => ({ id: 17, url: "https://businesscentral.dynamics.com/20afb97e-bbca-4f0d-a72b-e4cbbcdd57fb/Sandbox" }),
    send: async (message, timeout) => {
      // What the card says while the check is under way.
      const card = elements.get("licenseCard");
      sent.push({ ...message, timeout, statusDuring: elements.get("licenseCardStatus")?.textContent,
        busyDuring: card?.attributes["aria-busy"], activeDuring: card?.classes.active,
        checkedDuring: elements.get("licenseCardChecked")?.hidden === false
          ? elements.get("licenseCardChecked").textContent : "",
        typeDuring: elements.get("licenseCardType")?.textContent });
      if (responses.throwOn === message.type) throw new Error("offline");
      return responses[message.type];
    },
    globalThis: { T9TenantLicense: { tenantFromUrl: () => "20afb97e-bbca-4f0d-a72b-e4cbbcdd57fb" } }
  };
  const tf = (key, values) => `${key} ${JSON.stringify(values)}`;
  const update = new Function("globalThis", "currentTab", "send", "t", "tf", "updateText",
    "formatLicenseExpiry", "$", "LICENSE_CHECK_TIMEOUT_MS", "currentUiLocale",
    `${functions}; return updateLicenseCard;`)(sandbox.globalThis, sandbox.currentTab, sandbox.send,
    sandbox.t, tf, sandbox.updateText, sandbox.formatLicenseExpiry, sandbox.$, 35000, "sv-SE");
  return { update, sent, elements };
}

async function main() {
  const oldActive = { allowed: true, licenseType: "standard", expiresAt: Date.now() + 3600000,
    checkedAt: Date.parse("2026-10-28T08:12:00Z") };
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
  // The first check of a session may wake the license service; the card waits long enough
  // instead of reporting a failure after a few seconds.
  const check = checked.sent.find(message => message.type === "T9_LICENSE_CHECK");
  assert.equal(check.timeout, 35000);
  assert.equal(check.busyDuring, "true");
  assert.equal(checked.elements.get("licenseCard").attributes["aria-busy"], undefined);
  // While the check runs, the last known result is shown with the time it was checked, but
  // never as a confirmed active license; the server's answer then replaces it.
  assert.equal(check.statusDuring, "license.cardActive");
  assert.equal(check.activeDuring, false, "a cached license is not shown as confirmed");
  assert.equal(check.typeDuring, "license.standardType");
  assert.match(check.checkedDuring, /^license.cardRechecking .*2026/);
  assert.equal(checked.elements.get("licenseCardChecked").hidden, true,
    "the time of the last check disappears once the service has answered");
  assert.equal(checked.elements.get("licenseCard").classes.active, false);
  assert.equal(checked.elements.get("licenseCardType").textContent, "—");
  assert.equal(checked.elements.get("licenseCardExpiry").textContent, "—",
    "an inactive response never shows a misleading license type or expiry date");
  assert.equal(checked.elements.get("licenseCardMeta").hidden, true,
    "license type and validity are hidden until a license is active");
  assert.equal(checked.elements.get("licenseCardStatus").textContent, "license.cardTrialAvailable");
  assert.equal(checked.elements.get("licenseCardAction").textContent, "license.cardSignInTrial");

  const active = harness({
    T9_LICENSE_INFORMATION: { ok: true, information: { requiresAcceptance: false } },
    T9_CONSULTANT_LICENSE_STATUS: { ok: true, signedIn: false },
    T9_LICENSE_CHECK: { ok: true, license: { allowed: true, licenseType: "standard",
      expiresAt: Date.now() + 3600000 } }
  });
  await active.update();
  // Without an earlier result the card says that the license is being checked.
  assert.equal(active.sent.find(message => message.type === "T9_LICENSE_CHECK").statusDuring,
    "license.cardChecking");
  assert.equal(active.elements.get("licenseCard").classes.active, true,
    "a successful current server response still shows the active state");
  assert.equal(active.elements.get("licenseCardStatus").textContent, "license.cardActive");
  assert.equal(active.elements.get("licenseCardMeta").hidden, false,
    "an active license shows its type and validity");

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
  assert.equal(offline.elements.get("licenseCardStatus").textContent, "license.cardCheckFailed");
  // The last known license stays visible, labelled with the time it was checked.
  assert.equal(offline.elements.get("licenseCardType").textContent, "license.standardType");
  assert.equal(offline.elements.get("licenseCardMeta").hidden, false);
  assert.match(offline.elements.get("licenseCardChecked").textContent, /^license.cardLastKnown .*2026/);
  const unknown = harness({
    T9_LICENSE_INFORMATION: { ok: true, information: { requiresAcceptance: false } },
    T9_CONSULTANT_LICENSE_STATUS: { ok: true, signedIn: false },
    T9_LICENSE_SUMMARY: { ok: true, licenses: [] },
    throwOn: "T9_LICENSE_CHECK"
  });
  await unknown.update();
  assert.equal(unknown.elements.get("licenseCardType").textContent, "—");
  assert.equal(unknown.elements.get("licenseCardMeta").hidden, true);
  assert.equal(unknown.elements.get("licenseCardChecked").hidden, true);
  assert.equal(offline.elements.get("licenseCard").attributes["aria-busy"], undefined,
    "a failed check is no longer shown as busy");

  const consent = harness({
    T9_LICENSE_INFORMATION: { ok: true, information: { requiresAcceptance: true } },
    T9_CONSULTANT_LICENSE_STATUS: { ok: true, signedIn: true },
    T9_LICENSE_SUMMARY: { ok: true, licenses: [{ tenantId: "20afb97e-bbca-4f0d-a72b-e4cbbcdd57fb", ...oldActive }] }
  });
  await consent.update();
  assert.ok(!consent.sent.some(message => message.type === "T9_LICENSE_CHECK"));
  assert.equal(consent.elements.get("licenseCard").classes.active, false);
  assert.equal(consent.elements.get("licenseCardStatus").textContent, "license.cardNeedsConsent");
  assert.equal(consent.elements.get("licenseCardChecked").hidden, true);

  console.log("Popup license status shows the last known result while it checks and never shows cached access as active.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
