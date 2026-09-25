"use strict";
const $ = id => document.getElementById(id);
const tabId = Number(new URLSearchParams(location.search).get("tabId"));
let licenses = [];
let accountStatus = null;
function activeTenantLicense() {
  const license = licenses.find(item => item.tenantId === $("tenantSelect").value);
  return Boolean(license?.allowed && license.expiresAt > Date.now());
}
let currentUiLocale = globalThis.T9UiI18n.DEFAULT_LOCALE;
const text = (swedish, english) => globalThis.T9LanguageRegistry.translate(english, currentUiLocale, swedish);

function dateTime(value) {
  if (!Number.isFinite(value) || value <= 0) return "—";
  return new Intl.DateTimeFormat(currentUiLocale, { dateStyle: "long", timeStyle: "short" })
    .format(new Date(value));
}
function send(message) {
  return new Promise((resolve, reject) => chrome.runtime.sendMessage(message, response => {
    const error = chrome.runtime.lastError;
    if (error) reject(new Error(error.message)); else resolve(response);
  }));
}
function render(license) {
  renderAccountStatus();
  const registered = license?.licenseStatus !== "unregistered";
  $("tenantId").textContent = license?.tenantId || "—";
  $("licenseType").textContent = license && registered
    ? license.licenseType === "trial" ? text("Testlicens", "Trial license")
      : text("Ordinarie licens", "Standard license") : "—";
  $("expiresAt").textContent = license && registered ? dateTime(license.expiresAt) : "—";
  $("checkedAt").textContent = dateTime(license?.checkedAt);
  const status = $("status");
  if (!license) {
    status.className = "status unknown";
    status.textContent = text("Ingen tidigare licenskontroll", "No previous license check");
    return;
  }
  status.className = "status " + (license.allowed ? "active" : "inactive");
  const labels = { active: text("Aktiv", "Active"), expired: text("Utgången", "Expired"),
    blocked: text("Spärrad", "Blocked"),
    unregistered: license.trialAvailable
      ? text("Oregistrerad – testlicens kan begäras", "Unregistered – a trial can be requested")
      : text("Oregistrerad", "Unregistered") };
  status.textContent = labels[license.licenseStatus] ||
    (license.allowed ? text("Aktiv", "Active") : text("Ingen aktiv licens", "No active license"));
}
function populate(selectedTenant = "") {
  const select = $("tenantSelect");
  select.replaceChildren();
  if (!licenses.length) {
    const option = document.createElement("option");
    option.textContent = text("Ingen känd tenant", "No known tenant");
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
  if (!result?.ok) throw new Error(result?.error || text("Licensöversikten kunde inte läsas.", "The license overview could not be loaded."));
  licenses = result.licenses || [];
  populate(selectedTenant);
}
async function load(force = false) {
  $("refresh").disabled = true;
  $("message").textContent = force ? text("Kontrollerar licenstjänsten…", "Checking the license service…") : "";
  $("message").className = "";
  try {
    let selectedTenant = "";
    if (Number.isInteger(tabId) && tabId > 0) {
      const result = await send({ type: "T9_LICENSE_CHECK", tabId, force });
      if (!result?.ok) throw new Error(result?.error || text("Licensen kunde inte kontrolleras.", "The license could not be checked."));
      selectedTenant = result.tenantId;
    }
    await summary(selectedTenant);
    $("message").textContent = force ? text("Licensinformationen är uppdaterad.", "License information updated.") :
      !licenses.length ? text("Öppna en Business Central-tenant och gör en licenskontroll första gången.", "Open a Business Central tenant and run the first license check.") :
        text("Visar senast kända licensinformation. En BC-flik behövs bara för en ny serverkontroll.", "Showing the latest known license information. A BC tab is only needed for a new server check.");
  } catch (error) {
    await summary().catch(() => {});
    $("message").textContent = error.message;
    $("message").className = "error";
  } finally { $("refresh").disabled = !(Number.isInteger(tabId) && tabId > 0); }
}
async function consultantStatus() {
  const result = await send({ type: "T9_CONSULTANT_LICENSE_STATUS" });
  if (!result?.ok) throw new Error(result?.error || text("Konsultstatus kunde inte läsas.", "Consultant status could not be loaded."));
  accountStatus = result;
  renderAccountStatus();
}
function renderAccountStatus() {
  const result = accountStatus;
  if (!result) return;
  const tenantActive = activeTenantLicense();
  $("consultantTitle").textContent = tenantActive ? text("Microsoft-konto", "Microsoft account") : globalThis.T9UiI18n.translate("license.consultant", currentUiLocale);
  $("tenantAccountHelp").hidden = !tenantActive;
  $("tenantAccountHelp").textContent = text("Tenantlicensen är aktiv. Logga in med Microsoft för användarregistrering och statistik. Ingen konsultlicens behövs.", "The tenant license is active. Sign in with Microsoft for user registration and statistics. No consultant license is needed.");
  $("consultantSignIn").hidden = result.signedIn || !result.configured;
  $("consultantSignOut").hidden = !result.signedIn;
  const licenseLabels = { active: text("Konsultlicensen är aktiv.", "The consultant license is active."),
    pending: text("Väntar på aktivering i licensadministrationen.", "Waiting for activation in license administration."),
    expired: text("Konsultlicensen har gått ut.", "The consultant license has expired."),
    blocked: text("Konsultlicensen är spärrad.", "The consultant license is blocked.") };
  $("consultantStatus").textContent = !result.configured
    ? text("Konsultinloggning väntar på Entra-konfiguration.", "Consultant sign-in is waiting for Entra configuration.")
    : result.signedIn && tenantActive ? text("Microsoft-inloggningen är klar.", "Microsoft sign-in is complete.")
    : result.signedIn ? `${text("Microsoft-inloggningen är klar.", "Microsoft sign-in is complete.")} ${licenseLabels[result.license?.status] || text("Ingen konsultlicens har begärts.", "No consultant license has been requested.")}`
      : text("Inte inloggad.", "Not signed in.");
  if (result.signedIn && result.profile) {
    $("consultantStatus").textContent += ` ${text("Konto", "Account")}: ${result.profile.name || result.profile.email || "—"}. ${text("Entra tenant-ID", "Entra tenant ID")}: ${result.profile.tenantId || "—"}. ${text("Objekt-ID", "Object ID")}: ${result.profile.objectId || "—"}.`;
  }
}
$("tenantSelect").addEventListener("change", event => {
  render(licenses.find(item => item.tenantId === event.target.value));
});
$("refresh").addEventListener("click", () => load(true));
$("consultantSignIn").addEventListener("click", async () => {
  $("consultantSignIn").disabled = true;
  try { const result = await send({ type: activeTenantLicense() ? "T9_MICROSOFT_SIGN_IN" : "T9_CONSULTANT_LICENSE_SIGN_IN" });
    if (!result?.ok) throw new Error(result?.error || text("Inloggningen misslyckades.", "Sign-in failed."));
    await consultantStatus();
  } catch (error) {
    $("message").textContent = error.message; $("message").className = "error";
    await consultantStatus().catch(() => {});
  }
  finally { $("consultantSignIn").disabled = false; }
});
$("consultantSignOut").addEventListener("click", async () => {
  await send({ type: "T9_CONSULTANT_LICENSE_SIGN_OUT" }); await consultantStatus();
});
async function initialize() {
  try {
    const response = await send({ type: "T9_GET_SETTINGS" });
    currentUiLocale = globalThis.T9UiI18n.apply(response?.settings?.uiLocale);
    document.title = `${globalThis.T9UiI18n.translate("license.pageTitle", currentUiLocale)} — BC Process Studio`;
  } catch { currentUiLocale = globalThis.T9UiI18n.apply(currentUiLocale); }
  await load();
  await consultantStatus().catch(error => { $("consultantStatus").textContent = error.message; });
}
initialize();
