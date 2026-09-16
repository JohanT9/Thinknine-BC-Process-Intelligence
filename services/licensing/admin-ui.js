"use strict";
const $ = id => document.getElementById(id);
let key = "";
let state = null;
let busy = false;
let logoutTimer;
const errors = {
  unauthorized: "Fel adminnyckel, eller nyckeln har ändrats. Logga in igen.",
  "admin-not-configured": "Adminnyckeln är inte konfigurerad i Azure ännu.",
  "registry-changed": "Registret har ändrats. Uppdatera listan och kontrollera din ändring innan du sparar igen.",
  "invalid-request": "Kontrollera tenant-ID, namn och slutdatum.",
  "rate-limit": "För många anrop. Vänta en minut och försök igen."
};
function message(text, error = false) {
  $("message").textContent = text;
  $("message").className = error ? "error" : "";
}
function logout() {
  key = "";
  state = null;
  clearTimeout(logoutTimer);
  $("login").hidden = false;
  $("workspace").hidden = true;
  $("adminKey").value = "";
  $("tenants").replaceChildren();
  $("registrations").replaceChildren();
  message("Utloggad.");
}
function touch() {
  clearTimeout(logoutTimer);
  logoutTimer = setTimeout(logout, 30 * 60 * 1000);
}
async function api(route, value, method = value ? "POST" : "GET") {
  const response = await fetch("/admin/api/" + route, {
    method, credentials: "omit",
    headers: { Authorization: "Bearer " + key,
      ...(value ? { "Content-Type": "application/json" } : {}) },
    body: value ? JSON.stringify(value) : undefined,
    signal: AbortSignal.timeout(15000)
  });
  const result = await response.json();
  if (!response.ok) {
    if (response.status === 401) logout();
    throw new Error(errors[result.error] || "Tjänsten kunde inte slutföra anropet. Försök igen.");
  }
  touch();
  return result;
}
function cell(row, text) {
  const td = document.createElement("td");
  td.textContent = text;
  row.append(td);
  return td;
}
function resetForm() {
  $("tenantForm").reset();
  $("tenantId").readOnly = false;
  $("expiresAt").value = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 19);
  $("editorTitle").textContent = "Lägg till tenant";
}
function render() {
  $("tenants").replaceChildren();
  const entries = Object.entries(state.tenants).sort((a, b) =>
    (a[1].name || a[0]).localeCompare(b[1].name || b[0]));
  $("empty").hidden = entries.length !== 0;
  for (const [id, license] of entries) {
    const row = document.createElement("tr");
    cell(row, license.name || "—");
    cell(row, id);
    cell(row, license.licenseType === "trial" ? "Testlicens" : "Ordinarie");
    cell(row, license.contactEmail || "—");
    cell(row, !license.enabled ? "Spärrad" : Date.parse(license.expiresAt) <= Date.now() ? "Utgången" : "Aktiv");
    cell(row, license.expiresAt.replace("T", " ").replace(/\.\d{3}Z$|Z$/, ""));
    const action = cell(row, "");
    action.className = "actions";
    const edit = document.createElement("button");
    edit.type = "button";
    edit.textContent = "Redigera";
    edit.setAttribute("aria-label", "Redigera " + (license.name || id));
    edit.addEventListener("click", () => {
      $("tenantId").value = id;
      $("tenantId").readOnly = true;
      $("tenantName").value = license.name || "";
      $("contactEmail").value = license.contactEmail || "";
      $("expiresAt").value = new Date(license.expiresAt).toISOString().slice(0, 19);
      $("enabled").checked = license.enabled;
      $("editorTitle").textContent = "Ändra tenant";
      $("tenantName").focus();
    });
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "secondary";
    remove.textContent = "Radera";
    remove.setAttribute("aria-label", "Radera " + (license.name || id));
    remove.addEventListener("click", () => run(async () => {
      const confirmation = prompt(`Skriv tenant-ID för att permanent radera licensen:\n${id}`);
      if (confirmation?.trim().toLowerCase() !== id) {
        message("Raderingen avbröts."); return;
      }
      state = await api("tenant", { tenantId: id, revision: state.revision }, "DELETE");
      render(); resetForm();
      message("Tenantlicensen är raderad. En tidigare använd testperiod kan inte begäras igen.");
    }));
    action.append(edit, remove);
    $("tenants").append(row);
  }
  $("registrations").replaceChildren();
  $("registrationCount").textContent = `${state.installationCount} registrerade installations-/tenantpar. De senaste 500 visas. Ett installations-ID kan förekomma i flera tenants.`;
  for (const entry of state.registrations) {
    const row = document.createElement("tr");
    cell(row, entry.registeredAt.replace("T", " ").replace("Z", ""));
    cell(row, entry.tenantId);
    cell(row, entry.installationId);
    cell(row, entry.version);
    $("registrations").append(row);
  }
}
async function run(action) {
  if (busy) return;
  busy = true;
  for (const button of document.querySelectorAll("button")) button.disabled = true;
  message("Arbetar…");
  try { await action(); }
  catch (error) { message(error.message, true); }
  finally {
    busy = false;
    for (const button of document.querySelectorAll("button")) button.disabled = false;
  }
}
$("loginForm").addEventListener("submit", event => {
  event.preventDefault();
  run(async () => {
    if (location.protocol !== "https:" && !["127.0.0.1", "localhost"].includes(location.hostname)) {
      throw new Error("Öppna adminvyn via HTTPS.");
    }
    key = $("adminKey").value.trim();
    $("adminKey").value = "";
    state = await api("state");
    $("login").hidden = true;
    $("workspace").hidden = false;
    resetForm();
    render();
    message("Inloggad.");
  });
});
$("refresh").addEventListener("click", () => run(async () => {
  state = await api("state"); render(); message("Listan är uppdaterad.");
}));
$("logout").addEventListener("click", logout);
$("newTenant").addEventListener("click", resetForm);
$("tenantForm").addEventListener("submit", event => {
  event.preventDefault();
  run(async () => {
    const value = { tenantId: $("tenantId").value.trim().toLowerCase(),
      name: $("tenantName").value.trim(), contactEmail: $("contactEmail").value.trim(),
      enabled: $("enabled").checked,
      expiresAt: new Date($("expiresAt").value + "Z").toISOString(), revision: state.revision };
    if (!value.enabled && !confirm("Spärra denna tenant? Befintliga godkännanden kan gälla i upp till en timme.")) {
      message("Ändringen avbröts."); return;
    }
    state = await api("tenant", value);
    render(); resetForm(); message("Licensen är sparad.");
  });
});
window.addEventListener("pagehide", logout);
