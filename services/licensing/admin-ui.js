"use strict";
const $ = id => document.getElementById(id);
let key = "";
let state = null;
let busy = false;
let selectedTenantId = "";
let authConfig = null;
let logoutTimer;
const errors = {
  unauthorized: "Inloggningen saknar rollen License.Administrator, eller reservnyckeln är felaktig.",
  "admin-not-configured": "Adminnyckeln är inte konfigurerad i Azure ännu.",
  "registry-changed": "Registret har ändrats. Uppdatera listan och kontrollera din ändring innan du sparar igen.",
  "invalid-request": "Kontrollera tenant-ID, namn och slutdatum.",
  "notification-not-configured": "E-postnotifieringar är inte konfigurerade.",
  "notification-failed": "Testmejlet kunde inte skickas. Kontrollera Logic Appens körningshistorik.",
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
  $("consultants").replaceChildren();
  $("actionQueue").replaceChildren();
  $("auditEvents").replaceChildren();
  if (authConfig) {
    $("entraLogin").hidden = !authConfig.enabled;
    $("keyFallback").hidden = !authConfig.fallbackKeyEnabled;
  }
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
const base64url = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes)))
  .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
async function loadAuthConfig() {
  const response = await fetch("/admin/api/auth/config", { credentials: "omit",
    signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error("Administratörsinloggningen kunde inte läsas.");
  authConfig = await response.json();
  $("entraLogin").hidden = !authConfig.enabled;
  $("keyFallback").hidden = !authConfig.fallbackKeyEnabled;
}
async function openWorkspace(text) {
  state = await api("state");
  $("login").hidden = true;
  $("workspace").hidden = false;
  resetForm(); resetConsultantForm(); render(); message(text);
}
async function startEntraLogin() {
  if (!authConfig?.enabled) throw new Error("Microsoft-inloggningen är inte konfigurerad.");
  const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)));
  const challenge = base64url(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)));
  const stateValue = crypto.randomUUID();
  const redirectUri = `${location.origin}/admin`;
  sessionStorage.setItem("t9AdminEntra", JSON.stringify({ verifier, state: stateValue }));
  const authorize = new URL("https://login.microsoftonline.com/organizations/oauth2/v2.0/authorize");
  authorize.search = new URLSearchParams({ client_id: authConfig.clientId, response_type: "code",
    redirect_uri: redirectUri, response_mode: "query", scope: `openid profile email ${authConfig.scope}`,
    code_challenge: challenge, code_challenge_method: "S256", state: stateValue,
    prompt: "select_account" });
  location.assign(authorize.href);
}
async function finishEntraLogin() {
  const query = new URLSearchParams(location.search);
  if (!query.has("code") && !query.has("error")) return false;
  const saved = JSON.parse(sessionStorage.getItem("t9AdminEntra") || "null");
  sessionStorage.removeItem("t9AdminEntra");
  if (query.get("error")) throw new Error(query.get("error_description") || "Microsoft-inloggningen avbröts.");
  if (!saved || query.get("state") !== saved.state || !query.get("code")) {
    throw new Error("Microsoft-inloggningens säkerhetskontroll misslyckades.");
  }
  const redirectUri = `${location.origin}/admin`;
  const response = await fetch("https://login.microsoftonline.com/organizations/oauth2/v2.0/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: authConfig.clientId, grant_type: "authorization_code",
      code: query.get("code"), redirect_uri: redirectUri, code_verifier: saved.verifier,
      scope: `openid profile email ${authConfig.scope}` }), signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error("Microsoft-inloggningen kunde inte slutföras. Kontrollera redirect URI i Entra.");
  const tokens = await response.json();
  key = tokens.access_token || "";
  history.replaceState({}, "", "/admin");
  await openWorkspace("Inloggad med Microsoft.");
  return true;
}
function cell(row, text) {
  const td = document.createElement("td");
  td.textContent = text;
  row.append(td);
  return td;
}
function userDetails(users, columnCount) {
  const row = document.createElement("tr");
  row.hidden = true;
  row.className = "user-details";
  const container = document.createElement("td");
  container.colSpan = columnCount;
  if (!users.length) container.textContent = "Inga användare är anslutna ännu.";
  else {
    const table = document.createElement("table");
    table.className = "nested-table";
    const head = document.createElement("tr");
    for (const label of ["Namn", "E-post", "Entra tenant-ID", "Objekt-ID", "Senast använd UTC", "Version"]) {
      const th = document.createElement("th"); th.textContent = label; head.append(th);
    }
    const thead = document.createElement("thead"); thead.append(head); table.append(thead);
    const body = document.createElement("tbody");
    for (const user of users) {
      const userRow = document.createElement("tr");
      for (const value of [user.name || "—", user.email || "—", user.entraTenantId || "—",
        user.objectId || "—", (user.lastSeenAt || "").replace("T", " ").replace(/\.\d{3}Z$|Z$/, "") || "—",
        user.version || "—"]) cell(userRow, value);
      body.append(userRow);
    }
    table.append(body); container.append(table);
  }
  row.append(container); return row;
}
function detailsButton(users, details) {
  const button = document.createElement("button");
  button.type = "button"; button.className = "secondary";
  button.textContent = `Användare (${users.length})`;
  button.addEventListener("click", () => {
    details.hidden = !details.hidden;
    button.textContent = `${details.hidden ? "Användare" : "Dölj"} (${users.length})`;
  });
  return button;
}
function resetForm() {
  $("tenantForm").reset();
  selectedTenantId = "";
  $("tenantId").readOnly = false;
  $("licenseType").value = "standard";
  $("resetTrial").hidden = true;
  $("expiresAt").value = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 19);
  $("editorTitle").textContent = "Lägg till tenant";
}
function editTenant(id, license, scroll = false) {
  selectedTenantId = id;
  $("tenantId").value = id;
  $("tenantId").readOnly = true;
  $("tenantName").value = license.name || "";
  $("contactEmail").value = license.contactEmail || "";
  $("licenseType").value = license.licenseType === "trial" ? "trial" : "standard";
  $("expiresAt").value = new Date(license.expiresAt).toISOString().slice(0, 19);
  $("enabled").checked = license.enabled;
  $("editorTitle").textContent = "Ändra tenant";
  $("resetTrial").hidden = false;
  if (scroll) $("tenantForm").scrollIntoView({ behavior: "smooth", block: "start" });
  $("tenantName").focus({ preventScroll: scroll });
}
function editConsultant(entraTenantId, license, scroll = false) {
  $("consultantTenantId").value = entraTenantId;
  $("consultantTenantId").readOnly = true;
  $("consultantName").value = license.name || "";
  $("consultantEmail").value = license.email || "";
  $("consultantExpiresAt").value = new Date(license.expiresAt).toISOString().slice(0, 19);
  $("consultantEnabled").checked = license.enabled;
  if (scroll) $("consultantForm").scrollIntoView({ behavior: "smooth", block: "start" });
  $("consultantName").focus({ preventScroll: scroll });
}
function consultantGroups() {
  const groups = new Map();
  for (const [id, license] of Object.entries(state.consultants || {})) {
    const [entraTenantId, objectId] = id.split(":");
    const group = groups.get(entraTenantId) || { users: [] };
    if (objectId === "00000000-0000-0000-0000-000000000000") group.license = license;
    else group.users.push({ ...license, entraTenantId, objectId });
    if (!group.license) group.license = license;
    groups.set(entraTenantId, group);
  }
  return groups;
}
function licenseMatches(license, id, filter, search) {
  const expires = Date.parse(license.expiresAt);
  const active = license.enabled && expires > Date.now();
  const days = Math.ceil((expires - Date.now()) / 86400000);
  const categoryMatches = filter === "all" ||
    (filter === "active" && active) ||
    (filter === "trial" && active && license.licenseType === "trial") ||
    (filter === "pending" && !license.enabled && Boolean(license.requestedAt)) ||
    (filter === "expiring" && active && days <= 30) ||
    (filter === "inactive" && ((!license.enabled && !license.requestedAt) || expires <= Date.now()));
  const haystack = `${license.name || ""} ${license.email || ""} ${license.contactEmail || ""} ${id}`.toLowerCase();
  return categoryMatches && (!search || haystack.includes(search));
}
function csvDownload(filename, rows) {
  const csv = rows.map(row => row.map(value => `"${String(value ?? "").replaceAll('"', '""')}"`).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a"); link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function render() {
  const groups = consultantGroups();
  const organizationLicenses = [
    ...Object.entries(state.tenants).map(([id, license]) => ({ id, license })),
    ...[...groups].map(([id, group]) => ({ id, license: group.license }))
  ];
  const active = ({ license }) => license.enabled && Date.parse(license.expiresAt) > Date.now();
  $("metricActive").textContent = String(organizationLicenses.filter(active).length);
  $("metricTrial").textContent = String(organizationLicenses.filter(item => active(item) && item.license.licenseType === "trial").length);
  $("metricPending").textContent = String(organizationLicenses.filter(({ license }) => !license.enabled && license.requestedAt).length);
  $("metricExpiring").textContent = String(organizationLicenses.filter(item => active(item) &&
    Math.ceil((Date.parse(item.license.expiresAt) - Date.now()) / 86400000) <= 30).length);
  $("metricInactive").textContent = String(organizationLicenses.filter(({ license }) =>
    Date.parse(license.expiresAt) <= Date.now() || (!license.enabled && !license.requestedAt)).length);
  $("metricUsers").textContent = String((state.tenantUsers || []).length +
    [...groups.values()].reduce((sum, group) => sum + group.users.length, 0));
  $("metricMailFailures").textContent = String((state.auditEvents || [])
    .filter(event => event.action === "notification-failed").length);
  $("actionQueue").replaceChildren();
  const actions = state.actions || [];
  $("actionCount").textContent = String(actions.length);
  $("actionEmpty").hidden = actions.length !== 0;
  $("notificationStatus").textContent = state.notificationConfigured
    ? "E-postnotifieringar är aktiverade."
    : "E-postnotifieringar är inte konfigurerade. Åtgärdskön fungerar ändå.";
  for (const item of actions) {
    const row = document.createElement("tr");
    row.className = item.actionType === "expiring" ? "action-warning" : "action-critical";
    cell(row, item.kind === "consultant" ? "Konsultföretag" : "Kundföretag");
    cell(row, item.name);
    cell(row, item.actionType === "pending" ? "Väntar på aktivering"
      : item.actionType === "expired" ? "Licensen har gått ut"
        : `Löper ut om ${item.daysRemaining} dagar`);
    cell(row, item.expiresAt.replace("T", " ").replace(/\.\d{3}Z$|Z$/, ""));
    const action = cell(row, "");
    const open = document.createElement("button"); open.type = "button"; open.textContent = "Öppna";
    open.addEventListener("click", () => {
      if (item.kind === "tenant") editTenant(item.id, state.tenants[item.id], true);
      else {
        const organization = state.consultants[`${item.id}:00000000-0000-0000-0000-000000000000`] ||
          Object.entries(state.consultants).find(([id]) => id.startsWith(`${item.id}:`))?.[1];
        editConsultant(item.id, organization, true);
      }
    });
    action.append(open); $("actionQueue").append(row);
  }
  $("auditEvents").replaceChildren();
  const auditSearch = $("auditSearch").value.trim().toLowerCase();
  const auditFilter = $("auditFilter").value;
  const events = (state.auditEvents || []).filter(event => {
    const filterMatch = auditFilter === "all" || event.action === auditFilter ||
      (auditFilter === "license" && !["tenant-user-connected", "notification-sent", "notification-failed"].includes(event.action)) ||
      (auditFilter === "user" && event.action === "tenant-user-connected");
    return filterMatch && (!auditSearch || `${event.action} ${event.entityType} ${event.entityId} ${JSON.stringify(event.details)}`
      .toLowerCase().includes(auditSearch));
  });
  $("auditEmpty").hidden = events.length !== 0;
  const eventLabels = {
    "trial-created": "Testlicens skapad",
    "consultant-requested": "Konsultlicens begärd",
    "tenant-user-connected": "Användare ansluten",
    "tenant-saved": "Tenantlicens sparad",
    "tenant-deleted": "Tenantlicens raderad",
    "tenant-trial-reset": "Testperiod återställd",
    "consultant-saved": "Konsultlicens sparad",
    "consultant-deleted": "Konsultlicens raderad",
    "notification-sent": "Notifiering skickad",
    "notification-failed": "Notifiering misslyckades"
  };
  const actorLabels = { administrator: "Administratör", "public-api": "Publikt API",
    "microsoft-entra": "Microsoft Entra", system: "System" };
  for (const event of events) {
    const row = document.createElement("tr");
    cell(row, event.occurredAt.replace("T", " ").replace(/\.\d{3}Z$|Z$/, ""));
    cell(row, eventLabels[event.action] || event.action);
    cell(row, event.entityType === "consultant" ? "Konsultföretag"
      : event.entityType === "tenant" ? "Kundföretag" : "Notifiering");
    cell(row, event.entityId);
    cell(row, actorLabels[event.actor] || event.actor);
    const details = Object.entries(event.details || {}).map(([name, value]) => `${name}: ${value}`).join(", ");
    cell(row, details || "—");
    $("auditEvents").append(row);
  }
  $("tenants").replaceChildren();
  const licenseSearch = $("licenseSearch").value.trim().toLowerCase();
  const licenseFilter = $("licenseFilter").value;
  const entries = Object.entries(state.tenants).sort((a, b) =>
    (a[1].name || a[0]).localeCompare(b[1].name || b[0]));
  let visibleTenants = 0;
  for (const [id, license] of entries) {
    if (!licenseMatches(license, id, licenseFilter, licenseSearch)) continue;
    visibleTenants++;
    const row = document.createElement("tr");
    cell(row, license.name || "—");
    cell(row, id);
    cell(row, license.licenseType === "trial" ? "Testlicens" : "Ordinarie licens");
    cell(row, license.contactEmail || "—");
    cell(row, !license.enabled ? license.requestedAt ? "Väntar" : "Spärrad"
      : Date.parse(license.expiresAt) <= Date.now() ? "Utgången" : "Aktiv");
    cell(row, license.expiresAt.replace("T", " ").replace(/\.\d{3}Z$|Z$/, ""));
    const action = cell(row, "");
    action.className = "actions";
    const edit = document.createElement("button");
    edit.type = "button";
    edit.textContent = "Redigera";
    edit.setAttribute("aria-label", "Redigera " + (license.name || id));
    edit.addEventListener("click", () => editTenant(id, license));
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
    const users = (state.tenantUsers || []).filter(user => user.tenantId === id);
    const details = userDetails(users, 7);
    action.append(detailsButton(users, details), edit, remove);
    $("tenants").append(row, details);
  }
  $("empty").hidden = visibleTenants !== 0;
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
  $("consultants").replaceChildren();
  let visibleConsultants = 0;
  for (const [entraTenantId, group] of groups) {
    const license = group.license;
    if (!licenseMatches(license, entraTenantId, licenseFilter, licenseSearch)) continue;
    visibleConsultants++;
    const row = document.createElement("tr");
    cell(row, license.name || "—"); cell(row, license.email || "—");
    cell(row, entraTenantId);
    cell(row, !license.enabled ? license.requestedAt ? "Väntar" : "Spärrad"
      : Date.parse(license.expiresAt) <= Date.now() ? "Utgången" : "Aktiv");
    cell(row, license.expiresAt.replace("T", " ").replace(/\.\d{3}Z$|Z$/, ""));
    const action = cell(row, ""); action.className = "actions";
    const edit = document.createElement("button"); edit.type = "button"; edit.textContent = "Redigera";
    edit.addEventListener("click", () => editConsultant(entraTenantId, license));
    const remove = document.createElement("button"); remove.type = "button"; remove.className = "secondary"; remove.textContent = "Radera";
    remove.addEventListener("click", () => run(async () => {
      if (!confirm(`Radera konsultlicensen för ${license.name || license.email || entraTenantId}?`)) return;
      state = await api("consultant", { entraTenantId, objectId: "00000000-0000-0000-0000-000000000000",
        revision: state.consultantRevision }, "DELETE"); render(); resetConsultantForm();
    }));
    const details = userDetails(group.users, 6);
    action.append(detailsButton(group.users, details), edit, remove);
    $("consultants").append(row, details);
  }
  $("consultantEmpty").hidden = visibleConsultants !== 0;
}
function resetConsultantForm() {
  $("consultantForm").reset();
  $("consultantTenantId").readOnly = false;
  $("consultantExpiresAt").value = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 19);
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
    await openWorkspace("Inloggad med reservnyckel.");
  });
});
$("entraLogin").addEventListener("click", () => run(startEntraLogin));
$("refresh").addEventListener("click", () => run(async () => {
  state = await api("state"); render(); message("Listan är uppdaterad.");
}));
$("testNotification").addEventListener("click", () => run(async () => {
  state = await api("notification/test", {}); render(); message("Testmejlet är skickat.");
}));
$("licenseSearch").addEventListener("input", render);
$("licenseFilter").addEventListener("change", render);
$("auditSearch").addEventListener("input", render);
$("auditFilter").addEventListener("change", render);
for (const metric of document.querySelectorAll("[data-license-filter]")) {
  metric.addEventListener("click", () => {
    $("licenseFilter").value = metric.dataset.licenseFilter;
    render(); $("licenseSearch").scrollIntoView({ behavior: "smooth", block: "center" });
  });
}
for (const metric of document.querySelectorAll("[data-audit-filter]")) {
  metric.addEventListener("click", () => {
    $("auditFilter").value = metric.dataset.auditFilter;
    render(); $("auditSearch").scrollIntoView({ behavior: "smooth", block: "center" });
  });
}
$("exportLicenses").addEventListener("click", () => {
  const rows = [["Kategori", "Namn", "ID", "Licenstyp", "E-post", "Aktiv", "Slutdatum UTC"]];
  for (const [id, license] of Object.entries(state.tenants)) rows.push(["Kundföretag",
    license.name, id, license.licenseType === "trial" ? "Testlicens" : "Ordinarie licens",
    license.contactEmail, license.enabled, license.expiresAt]);
  for (const [id, group] of consultantGroups()) rows.push(["Konsultföretag", group.license.name,
    id, "Konsultlicens", group.license.email, group.license.enabled, group.license.expiresAt]);
  csvDownload(`bc-process-studio-licenser-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  message("Licenslistan har exporterats.");
});
$("exportAudit").addEventListener("click", () => {
  const rows = [["Tidpunkt UTC", "Händelse", "Typ", "ID", "Aktör", "Detaljer"]];
  for (const event of state.auditEvents || []) rows.push([event.occurredAt, event.action,
    event.entityType, event.entityId, event.actor, JSON.stringify(event.details || {})]);
  csvDownload(`bc-process-studio-handelser-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  message("Händelseloggen har exporterats.");
});
$("logout").addEventListener("click", logout);
$("newTenant").addEventListener("click", resetForm);
$("newConsultant").addEventListener("click", resetConsultantForm);
$("consultantForm").addEventListener("submit", event => {
  event.preventDefault(); run(async () => {
    const value = { entraTenantId: $("consultantTenantId").value.trim().toLowerCase(),
      objectId: "00000000-0000-0000-0000-000000000000",
      name: $("consultantName").value.trim(), email: $("consultantEmail").value.trim(),
      expiresAt: new Date($("consultantExpiresAt").value + "Z").toISOString(),
      enabled: $("consultantEnabled").checked, revision: state.consultantRevision };
    state = await api("consultant", value); render(); resetConsultantForm();
    message("Konsultlicensen är sparad.");
  });
});
$("resetTrial").addEventListener("click", () => run(async () => {
  const id = selectedTenantId;
  if (!id) return;
  const confirmation = prompt(
    `Detta raderar licensen och tidigare testanspråk. Tenant kan därefter begära en ny testlicens.\n\nSkriv tenant-ID för att bekräfta:\n${id}`);
  if (confirmation?.trim().toLowerCase() !== id) {
    message("Återställningen avbröts."); return;
  }
  state = await api("tenant/reset", { tenantId: id, revision: state.revision });
  render(); resetForm();
  message("Tenanten är helt återställd och kan begära en ny testlicens.");
}));
$("tenantForm").addEventListener("submit", event => {
  event.preventDefault();
  run(async () => {
    const value = { tenantId: $("tenantId").value.trim().toLowerCase(),
      name: $("tenantName").value.trim(), contactEmail: $("contactEmail").value.trim(),
      licenseType: $("licenseType").value,
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
async function initializeAuthentication() {
  try {
    await loadAuthConfig();
    if (!(await finishEntraLogin())) {
      if (!authConfig.enabled && authConfig.fallbackKeyEnabled) $("keyFallback").open = true;
      message(authConfig.enabled ? "Logga in för att fortsätta." : "Microsoft-inloggningen är inte konfigurerad ännu.");
    }
  } catch (error) { message(error.message, true); }
}
initializeAuthentication();
