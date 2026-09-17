"use strict";
const $ = id => document.getElementById(id);
const tabId = Number(new URLSearchParams(location.search).get("tabId"));
let licenses = [];

function dateTime(value) {
  if (!Number.isFinite(value) || value <= 0) return "—";
  return new Intl.DateTimeFormat("sv-SE", { dateStyle: "long", timeStyle: "short" })
    .format(new Date(value));
}
function send(message) {
  return new Promise((resolve, reject) => chrome.runtime.sendMessage(message, response => {
    const error = chrome.runtime.lastError;
    if (error) reject(new Error(error.message)); else resolve(response);
  }));
}
function render(license) {
  const registered = license?.licenseStatus !== "unregistered";
  $("tenantId").textContent = license?.tenantId || "—";
  $("licenseType").textContent = license && registered
    ? license.licenseType === "trial" ? "Testlicens" : "Ordinarie licens" : "—";
  $("expiresAt").textContent = license && registered ? dateTime(license.expiresAt) : "—";
  $("checkedAt").textContent = dateTime(license?.checkedAt);
  const status = $("status");
  if (!license) {
    status.className = "status unknown";
    status.textContent = "Ingen tidigare licenskontroll";
    return;
  }
  status.className = "status " + (license.allowed ? "active" : "inactive");
  const labels = { active: "Aktiv", expired: "Utgången", blocked: "Spärrad",
    unregistered: license.trialAvailable
      ? "Oregistrerad – testlicens kan begäras" : "Oregistrerad" };
  status.textContent = labels[license.licenseStatus] ||
    (license.allowed ? "Aktiv" : "Ingen aktiv licens");
}
function populate(selectedTenant = "") {
  const select = $("tenantSelect");
  select.replaceChildren();
  if (!licenses.length) {
    const option = document.createElement("option");
    option.textContent = "Ingen känd tenant";
    option.value = "";
    select.append(option);
    select.disabled = true;
    render(null);
    return;
  }
  select.disabled = false;
  for (const license of licenses) {
    const option = document.createElement("option");
    option.value = license.tenantId;
    option.textContent = license.tenantId;
    select.append(option);
  }
  select.value = licenses.some(item => item.tenantId === selectedTenant)
    ? selectedTenant : licenses[0].tenantId;
  render(licenses.find(item => item.tenantId === select.value));
}
async function summary(selectedTenant = "") {
  const result = await send({ type: "T9_LICENSE_SUMMARY" });
  if (!result?.ok) throw new Error(result?.error || "Licensöversikten kunde inte läsas.");
  licenses = result.licenses || [];
  populate(selectedTenant);
}
async function load(force = false) {
  $("refresh").disabled = true;
  $("message").textContent = force ? "Kontrollerar licenstjänsten…" : "";
  $("message").className = "";
  try {
    let selectedTenant = "";
    if (Number.isInteger(tabId) && tabId > 0) {
      const result = await send({ type: "T9_LICENSE_CHECK", tabId, force });
      if (!result?.ok) throw new Error(result?.error || "Licensen kunde inte kontrolleras.");
      selectedTenant = result.tenantId;
    }
    await summary(selectedTenant);
    $("message").textContent = force ? "Licensinformationen är uppdaterad." :
      !licenses.length ? "Öppna en Business Central-tenant och gör en licenskontroll första gången." :
        "Visar senast kända licensinformation. En BC-flik behövs bara för en ny serverkontroll.";
  } catch (error) {
    await summary().catch(() => {});
    $("message").textContent = error.message;
    $("message").className = "error";
  } finally { $("refresh").disabled = !(Number.isInteger(tabId) && tabId > 0); }
}
async function consultantStatus() {
  const result = await send({ type: "T9_CONSULTANT_LICENSE_STATUS" });
  if (!result?.ok) throw new Error(result?.error || "Konsultstatus kunde inte läsas.");
  $("consultantSignIn").hidden = result.signedIn || !result.configured;
  $("consultantSignOut").hidden = !result.signedIn;
  $("consultantStatus").textContent = !result.configured
    ? "Konsultinloggning väntar på Entra-konfiguration."
    : result.signedIn ? "Inloggad. Konsultlicensen används automatiskt när kunden saknar tenantlicens."
      : "Inte inloggad.";
  if (result.signedIn && result.profile) {
    $("consultantStatus").textContent += ` Konto: ${result.profile.name || result.profile.email || "—"}. Entra tenant-ID: ${result.profile.tenantId || "—"}. Objekt-ID: ${result.profile.objectId || "—"}.`;
  }
}
$("tenantSelect").addEventListener("change", event => {
  render(licenses.find(item => item.tenantId === event.target.value));
});
$("refresh").addEventListener("click", () => load(true));
$("consultantSignIn").addEventListener("click", async () => {
  $("consultantSignIn").disabled = true;
  try { const result = await send({ type: "T9_CONSULTANT_LICENSE_SIGN_IN" });
    if (!result?.ok) throw new Error(result?.error || "Inloggningen misslyckades.");
    await consultantStatus();
  } catch (error) { $("message").textContent = error.message; $("message").className = "error"; }
  finally { $("consultantSignIn").disabled = false; }
});
$("consultantSignOut").addEventListener("click", async () => {
  await send({ type: "T9_CONSULTANT_LICENSE_SIGN_OUT" }); await consultantStatus();
});
load(); consultantStatus().catch(error => { $("consultantStatus").textContent = error.message; });
