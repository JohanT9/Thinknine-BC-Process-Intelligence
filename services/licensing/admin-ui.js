"use strict";
const $ = id => document.getElementById(id);
const ORGANIZATION = "00000000-0000-0000-0000-000000000000";
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VIEWS = ["oversikt", "licenser", "anvandning", "handelser", "installationer"];
let key = "";
let state = null;
let busy = false;
let authConfig = null;
let logoutTimer;
let messageTimer;
let signedInWith = "";
const filters = { license: "all", kind: "all", audit: "all" };
const expandedUsers = new Set();
const errors = {
  unauthorized: "Inloggningen saknar rollen License.Administrator, eller reservnyckeln är felaktig.",
  "admin-not-configured": "Adminnyckeln är inte konfigurerad i Azure ännu.",
  "registry-changed": "Registret har ändrats av någon annan. Uppdatera och kontrollera din ändring innan du sparar igen.",
  "invalid-request": "Kontrollera tenant-ID, namn och slutdatum.",
  "notification-not-configured": "E-postnotifieringar är inte konfigurerade.",
  "notification-failed": "Testmejlet kunde inte skickas. Kontrollera Logic Appens körningshistorik.",
  "rate-limit": "För många anrop. Vänta en minut och försök igen."
};

// Appearance: dark by default like the extension, remembered in this browser only.
const APPEARANCE_KEY = "t9.admin.appearance";
function applyAppearance(value) {
  const theme = ["dark", "light", "system"].includes(value) ? value : "dark";
  document.documentElement.dataset.theme = theme;
  $("appearance").value = theme;
}
try { applyAppearance(localStorage.getItem(APPEARANCE_KEY)); } catch { applyAppearance("dark"); }
$("appearance").addEventListener("change", event => {
  applyAppearance(event.target.value);
  try { localStorage.setItem(APPEARANCE_KEY, event.target.value); } catch { /* per-browser preference only */ }
});

function message(text, kind = "") {
  const element = $("message");
  clearTimeout(messageTimer);
  element.textContent = text;
  element.className = kind;
  element.hidden = !text;
  // Errors stay until the next message; confirmations fade after a while.
  if (text && kind !== "error") messageTimer = setTimeout(() => { element.hidden = true; }, 6000);
}
function logout() {
  key = "";
  state = null;
  signedInWith = "";
  clearTimeout(logoutTimer);
  for (const dialog of document.querySelectorAll("dialog[open]")) dialog.close();
  $("login").hidden = false;
  $("workspace").hidden = true;
  for (const id of ["tabs", "refresh", "logout", "signedIn"]) $(id).hidden = true;
  $("adminKey").value = "";
  for (const id of ["licenseList", "registrations", "actionQueue", "auditEvents", "documentUsage"]) {
    $(id).replaceChildren();
  }
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
async function openWorkspace(text, method) {
  state = await api("state");
  signedInWith = method;
  $("login").hidden = true;
  $("workspace").hidden = false;
  for (const id of ["tabs", "refresh", "logout", "signedIn"]) $(id).hidden = false;
  $("signedIn").textContent = signedInWith;
  $("logout").title = signedInWith;
  render();
  showView(location.hash.slice(1));
  message(text, "success");
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
  await openWorkspace("Inloggad med Microsoft.", "Inloggad med Microsoft");
  return true;
}

// Small DOM helpers. Text is always set as text, never as HTML.
function element(tag, { className = "", text, attributes = {} } = {}, children = []) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
  node.append(...children);
  return node;
}
function button(text, className, onClick, attributes = {}) {
  const node = element("button", { className, text, attributes: { type: "button", ...attributes } });
  node.addEventListener("click", onClick);
  return node;
}
function cell(row, text, className = "") {
  const td = document.createElement("td");
  td.textContent = text;
  if (className) td.className = className;
  row.append(td);
  return td;
}

// Dates are stored and edited in UTC.
const utc = value => String(value || "").replace("T", " ").replace(/(:\d{2})?(\.\d{3})?Z$/, "") || "—";
const toInput = value => new Date(value).toISOString().slice(0, 19);
const relativeDays = new Intl.RelativeTimeFormat("sv", { numeric: "auto" });
function daysUntil(value) { return Math.ceil((Date.parse(value) - Date.now()) / 86400000); }
function relative(value) {
  const days = daysUntil(value);
  if (!Number.isFinite(days)) return "";
  return Math.abs(days) > 60 ? relativeDays.format(Math.round(days / 30), "month")
    : relativeDays.format(days, "day");
}

function consultantGroups() {
  const groups = new Map();
  for (const [id, license] of Object.entries(state.consultants || {})) {
    const [entraTenantId, objectId] = id.split(":");
    const group = groups.get(entraTenantId) || { users: [] };
    if (objectId === ORGANIZATION) group.license = license;
    else group.users.push({ ...license, entraTenantId, objectId });
    if (!group.license) group.license = license;
    groups.set(entraTenantId, group);
  }
  return groups;
}
// Every customer and consultant license as one list.
function licenses() {
  const tenants = Object.entries(state.tenants || {}).map(([id, license]) => ({
    kind: "tenant", id, license,
    users: (state.tenantUsers || []).filter(user => user.tenantId === id) }));
  const consultants = [...consultantGroups()].map(([id, group]) => ({
    kind: "consultant", id, license: group.license, users: group.users }));
  return [...tenants, ...consultants].sort((a, b) =>
    (a.license.name || a.id).localeCompare(b.license.name || b.id, "sv"));
}
function statusOf(license) {
  const days = daysUntil(license.expiresAt);
  if (!license.enabled) return license.requestedAt
    ? { code: "pending", label: "Väntar på aktivering" } : { code: "blocked", label: "Spärrad" };
  if (days <= 0) return { code: "expired", label: "Utgången" };
  if (days <= 30) return { code: "expiring", label: "Löper snart ut" };
  return { code: "active", label: "Aktiv" };
}
const STATUS_FILTERS = [
  ["all", "Alla"], ["active", "Aktiva"], ["trial", "Testlicenser"], ["pending", "Väntar"],
  ["expiring", "Löper ut inom 30 dagar"], ["inactive", "Utgångna/spärrade"]];
function inFilter(item, filter) {
  const { license } = item;
  const expires = Date.parse(license.expiresAt);
  const active = license.enabled && expires > Date.now();
  return filter === "all" ||
    (filter === "active" && active) ||
    (filter === "trial" && active && license.licenseType === "trial") ||
    (filter === "pending" && !license.enabled && Boolean(license.requestedAt)) ||
    (filter === "expiring" && active && daysUntil(license.expiresAt) <= 30) ||
    (filter === "inactive" && ((!license.enabled && !license.requestedAt) || expires <= Date.now()));
}
function matchesSearch(item, search) {
  const { license } = item;
  return !search || `${license.name || ""} ${license.email || ""} ${license.contactEmail || ""} ${item.id}`
    .toLowerCase().includes(search);
}
function typeLabel(item) {
  if (item.kind === "consultant") return "Konsultlicens";
  return item.license.licenseType === "trial" ? "Testlicens" : "Ordinarie licens";
}

function csvDownload(filename, rows) {
  const csv = rows.map(row => row.map(value => `"${String(value ?? "").replaceAll('"', '""')}"`).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a"); link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function showView(name) {
  const view = VIEWS.includes(name) ? name : "oversikt";
  for (const section of document.querySelectorAll(".view")) section.hidden = section.dataset.view !== view;
  for (const link of document.querySelectorAll("#tabs a")) {
    if (link.dataset.view === view) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  }
  if (location.hash.slice(1) !== view) history.replaceState({}, "", `#${view}`);
}
function go(view) {
  showView(view);
  $("content").focus({ preventScroll: true });
  window.scrollTo({ top: 0 });
}

function render() {
  if (!state) return;
  renderOverview();
  renderLicenses();
  renderAudit();
  renderRegistrations();
  renderDocumentUsage();
}

function renderOverview() {
  const all = licenses();
  const set = (id, value) => {
    $(id).textContent = String(value);
    $(id).parentElement.classList.toggle("has-value", value > 0);
  };
  set("metricActive", all.filter(item => inFilter(item, "active")).length);
  set("metricTrial", all.filter(item => inFilter(item, "trial")).length);
  set("metricPending", all.filter(item => inFilter(item, "pending")).length);
  set("metricExpiring", all.filter(item => inFilter(item, "expiring")).length);
  set("metricInactive", all.filter(item => inFilter(item, "inactive")).length);
  set("metricUsers", (state.tenantUsers || []).length +
    [...consultantGroups().values()].reduce((sum, group) => sum + group.users.length, 0));
  set("metricMailFailures", (state.auditEvents || []).filter(event => event.action === "notification-failed").length);

  const actions = state.actions || [];
  $("actionCount").textContent = String(actions.length);
  $("actionEmpty").hidden = actions.length !== 0;
  $("actionQueue").replaceChildren(...actions.map(item => {
    const status = item.actionType === "pending" ? { code: "pending", label: "Väntar på aktivering" }
      : item.actionType === "expired" ? { code: "expired", label: "Har gått ut" }
        : { code: "expiring", label: item.daysRemaining === 1 ? "Löper ut i morgon"
          : `Löper ut om ${item.daysRemaining} dagar` };
    const name = item.name || item.id;
    return element("li", { className: "action-item" }, [
      element("span", { className: `pill ${status.code}`, text: status.label }),
      element("div", {}, [
        element("div", { className: "title", text: name }),
        element("div", { className: "meta", text: `${item.kind === "consultant" ? "Konsultföretag" : "Kundföretag"} · slutdatum ${utc(item.expiresAt)} UTC` })]),
      button("Öppna", "secondary", () => openEditor(item.kind, item.id), { "aria-label": `Öppna ${name}` })]);
  }));
  $("notificationStatus").replaceChildren(
    element("span", { className: `dot ${state.notificationConfigured ? "ok" : "off"}`, attributes: { "aria-hidden": "true" } }),
    document.createTextNode(state.notificationConfigured ? "Aktiverade" : "Inte konfigurerade – åtgärdslistan fungerar ändå"));
  $("testNotification").hidden = !state.notificationConfigured;
}

function renderLicenses() {
  const all = licenses();
  const search = $("licenseSearch").value.trim().toLowerCase();
  const ofKind = all.filter(item => filters.kind === "all" || item.kind === filters.kind);
  $("licenseTotal").textContent = String(all.length);
  $("licenseChips").replaceChildren(...STATUS_FILTERS.map(([value, label]) => {
    const chip = button("", "chip", () => { filters.license = value; renderLicenses(); },
      { "aria-pressed": String(filters.license === value) });
    chip.append(label, element("span", { text: String(ofKind.filter(item =>
      inFilter(item, value) && matchesSearch(item, search)).length) }));
    return chip;
  }));
  for (const toggle of document.querySelectorAll("[data-kind]")) {
    toggle.setAttribute("aria-pressed", String(toggle.dataset.kind === filters.kind));
  }
  const visible = ofKind.filter(item => inFilter(item, filters.license) && matchesSearch(item, search));
  const filtered = search || filters.license !== "all" || filters.kind !== "all";
  $("licenseResult").textContent = filtered ? `Visar ${visible.length} av ${all.length} licenser.` : "";
  $("licenseList").replaceChildren(...visible.map(licenseRow));
  // An empty list says whether nothing is stored or nothing matches the filters.
  $("licenseEmpty").hidden = visible.length !== 0;
  $("licenseEmptyText").textContent = all.length === 0
    ? "Inga licenser finns ännu. Lägg till en kundlicens eller en konsultlicens."
    : "Ingen licens matchar sökningen och filtren.";
  $("clearLicenseFilters").hidden = all.length === 0;
}

function licenseRow(item) {
  const { license, kind, id } = item;
  const name = license.name || "Namnlöst företag";
  const status = statusOf(license);
  const contact = kind === "tenant" ? license.contactEmail : license.email;
  const usersKey = `${kind}:${id}`;
  const meta = element("div", { className: "license-meta" }, [
    element("span", { text: kind === "tenant" ? "Kundföretag" : "Konsultföretag" }),
    element("span", { text: typeLabel(item) }),
    element("span", {}, [element("span", { className: "mono", text: id }),
      button("Kopiera", "copy", () => copy(id), { "aria-label": `Kopiera ID för ${name}` })]),
    ...(contact ? [element("span", { text: contact })] : [])]);
  const usersButton = button(`Användare (${item.users.length})`, "secondary", () => {
    if (expandedUsers.has(usersKey)) expandedUsers.delete(usersKey); else expandedUsers.add(usersKey);
    renderLicenses();
  }, { "aria-expanded": String(expandedUsers.has(usersKey)) });
  // Restarting the trial keeps the license; the full reset deletes it so the tenant can ask again.
  const menuItems = [
    ...(kind === "tenant" ? [button("Starta om testperioden (30 dagar)", "", () => restartTrial(item))] : []),
    button("Radera licens", "destructive", () => removeLicense(item)),
    ...(kind === "tenant" ? [button("Radera och tillåt ny testlicens", "destructive", () => resetTrial(item))] : [])];
  const menu = element("details", { className: "menu" }, [
    element("summary", { text: "…", attributes: { "aria-label": `Fler åtgärder för ${name}` } }),
    element("div", { className: "menu-items" }, menuItems)]);
  for (const entry of menuItems) entry.addEventListener("click", () => { menu.open = false; });
  const row = element("li", { className: "license" }, [
    element("div", { className: "license-main" }, [
      element("div", {}, [element("div", { className: "license-name", text: name }), meta]),
      element("div", { className: "status" }, [element("span", { className: `pill ${status.code}`, text: status.label })]),
      element("div", { className: "expiry" }, [
        document.createTextNode(`${utc(license.expiresAt)} UTC`),
        element("span", { className: "relative", text: relative(license.expiresAt) })]),
      element("div", { className: "row-actions" }, [
        usersButton,
        button("Redigera", "primary", () => openEditor(kind, id), { "aria-label": `Redigera ${name}` }),
        menu])])]);
  if (expandedUsers.has(usersKey)) row.append(usersPanel(item.users));
  return row;
}

function usersPanel(users) {
  if (!users.length) return element("div", { className: "users muted", text: "Inga användare är anslutna ännu." });
  const head = element("tr", {}, ["Namn", "E-post", "Entra tenant-ID", "Objekt-ID", "Senast använd (UTC)", "Version"]
    .map(label => element("th", { text: label, attributes: { scope: "col" } })));
  const body = element("tbody", {}, users.map(user => {
    const row = document.createElement("tr");
    for (const value of [user.name || "—", user.email || "—", user.entraTenantId || "—",
      user.objectId || "—", utc(user.lastSeenAt), user.version || "—"]) cell(row, value);
    return row;
  }));
  return element("div", { className: "users" }, [
    element("table", { className: "data-table" }, [element("thead", {}, [head]), body])]);
}

const EVENT_LABELS = {
  "trial-created": "Testlicens skapad", "consultant-requested": "Konsultlicens begärd",
  "tenant-user-connected": "Användare ansluten", "tenant-saved": "Tenantlicens sparad",
  "tenant-deleted": "Tenantlicens raderad", "tenant-trial-reset": "Testperiod återställd",
  "consultant-saved": "Konsultlicens sparad", "consultant-deleted": "Konsultlicens raderad",
  "notification-sent": "Notifiering skickad", "notification-failed": "Notifiering misslyckades" };
const ACTOR_LABELS = { administrator: "Administratör", "public-api": "Publikt API",
  "microsoft-entra": "Microsoft Entra", system: "System" };
// Administrators act with the reserve key or as a signed-in Microsoft account.
function actorLabel(actor = "") {
  if (actor === "administrator-key") return "Administratör (reservnyckel)";
  if (actor.startsWith("entra:")) return `Administratör (${actor.slice(6)})`;
  return ACTOR_LABELS[actor] || actor || "—";
}
const AUDIT_FILTERS = [["all", "Alla"], ["license", "Licensändringar"], ["user", "Användare"],
  ["notification-sent", "Skickade notifieringar"], ["notification-failed", "Misslyckade notifieringar"]];
function auditMatches(event, filter) {
  return filter === "all" || event.action === filter ||
    (filter === "license" && !["tenant-user-connected", "notification-sent", "notification-failed"].includes(event.action)) ||
    (filter === "user" && event.action === "tenant-user-connected");
}
function renderAudit() {
  const all = state.auditEvents || [];
  const search = $("auditSearch").value.trim().toLowerCase();
  const searched = all.filter(event => !search || `${event.action} ${EVENT_LABELS[event.action] || ""} ${event.entityType} ${event.entityId} ${JSON.stringify(event.details)}`
    .toLowerCase().includes(search));
  $("auditChips").replaceChildren(...AUDIT_FILTERS.map(([value, label]) => {
    const chip = button("", "chip", () => { filters.audit = value; renderAudit(); },
      { "aria-pressed": String(filters.audit === value) });
    chip.append(label, element("span", { text: String(searched.filter(event => auditMatches(event, value)).length) }));
    return chip;
  }));
  const events = searched.filter(event => auditMatches(event, filters.audit));
  $("auditEmpty").hidden = events.length !== 0;
  $("auditEmpty").textContent = all.length ? "Ingen händelse matchar sökningen och filtret."
    : "Inga händelser har registrerats ännu.";
  $("auditEvents").replaceChildren(...events.map(event => {
    const row = document.createElement("tr");
    cell(row, utc(event.occurredAt), "nowrap");
    const what = cell(row, "");
    what.append(element("span", { className: event.action === "notification-failed" ? "pill expired"
      : event.action === "notification-sent" ? "pill active" : "pill", text: EVENT_LABELS[event.action] || event.action }));
    const subject = cell(row, "");
    subject.append(element("div", { text: event.entityType === "consultant" ? "Konsultföretag"
      : event.entityType === "tenant" ? "Kundföretag" : "Notifiering" }),
    element("div", { className: "mono muted", text: event.entityId || "" }));
    cell(row, actorLabel(event.actor));
    cell(row, Object.entries(event.details || {}).map(([name, value]) => `${name}: ${value}`).join(", ") || "—");
    return row;
  }));
}

function renderRegistrations() {
  $("registrationCount").textContent = `${state.installationCount} registrerade installations- och tenantpar. ` +
    "De senaste 500 visas. Ett installations-ID kan förekomma i flera tenants.";
  $("registrationEmpty").hidden = state.registrations.length !== 0;
  $("registrations").replaceChildren(...state.registrations.map(entry => {
    const row = document.createElement("tr");
    cell(row, utc(entry.registeredAt), "nowrap");
    cell(row, entry.tenantId, "mono");
    cell(row, entry.installationId, "mono");
    cell(row, entry.version);
    return row;
  }));
}

async function copy(text) {
  try { await navigator.clipboard.writeText(text); message("ID:t är kopierat.", "success"); }
  catch { message(`Kopieringen tilläts inte. ID: ${text}`, "error"); }
}

// Editing happens in dialogs; the list stays where it was.
function setExpiry(input, days) {
  input.value = new Date(Date.now() + days * 86400000).toISOString().slice(0, 19);
}
function formError(id, text) { $(id).textContent = text; $(id).hidden = !text; }
function openEditor(kind, id) {
  if (kind === "consultant") openConsultantEditor(id); else openTenantEditor(id);
}
function openTenantEditor(id = "") {
  const license = id ? state.tenants[id] : null;
  $("tenantForm").reset();
  formError("tenantFormError", "");
  $("tenantDialogTitle").textContent = license ? `Ändra ${license.name || "kundlicens"}` : "Ny kundlicens";
  $("tenantId").value = id;
  $("tenantId").readOnly = Boolean(license);
  $("tenantName").value = license?.name || "";
  $("contactEmail").value = license?.contactEmail || "";
  $("licenseType").value = license?.licenseType === "trial" ? "trial" : "standard";
  // A new license runs for a year, so it is not flagged as expiring the moment it is saved.
  if (license) $("expiresAt").value = toInput(license.expiresAt); else setExpiry($("expiresAt"), 365);
  $("enabled").checked = license ? license.enabled : true;
  $("enabled").dataset.wasEnabled = String(Boolean(license?.enabled));
  $("disableWarning").hidden = true;
  $("tenantDialog").showModal();
  (license ? $("tenantName") : $("tenantId")).focus();
}
function openConsultantEditor(id = "") {
  const group = id ? consultantGroups().get(id) : null;
  const license = group?.license || null;
  $("consultantForm").reset();
  formError("consultantFormError", "");
  $("consultantDialogTitle").textContent = license ? `Ändra ${license.name || "konsultlicens"}` : "Ny konsultlicens";
  $("consultantTenantId").value = id;
  $("consultantTenantId").readOnly = Boolean(license);
  $("consultantName").value = license?.name || "";
  $("consultantEmail").value = license?.email || "";
  if (license) $("consultantExpiresAt").value = toInput(license.expiresAt); else setExpiry($("consultantExpiresAt"), 365);
  $("consultantEnabled").checked = license ? license.enabled : true;
  $("consultantDialog").showModal();
  (license ? $("consultantName") : $("consultantTenantId")).focus();
}

// A destructive action is confirmed by typing what it applies to.
function confirmTyped({ title, text, label, expected, accept }) {
  return new Promise(resolve => {
    const dialog = $("confirmDialog");
    $("confirmTitle").textContent = title;
    $("confirmText").textContent = text;
    $("confirmLabel").textContent = label;
    $("confirmInput").value = "";
    $("confirmAccept").textContent = accept;
    $("confirmAccept").disabled = true;
    const onInput = () => {
      $("confirmAccept").disabled = $("confirmInput").value.trim().toLowerCase() !== expected.toLowerCase();
    };
    $("confirmInput").addEventListener("input", onInput);
    dialog.addEventListener("close", () => {
      $("confirmInput").removeEventListener("input", onInput);
      resolve(dialog.returnValue === "confirm");
    }, { once: true });
    dialog.returnValue = "";
    dialog.showModal();
    $("confirmInput").focus();
  });
}
async function removeLicense(item) {
  const name = item.license.name || item.id;
  const confirmed = await confirmTyped({
    title: `Radera licensen för ${name}?`,
    text: item.kind === "tenant"
      ? "Licensen tas bort permanent. En testperiod som redan har använts kan inte begäras igen."
      : "Konsultlicensen tas bort permanent. Konsulternas användare förlorar licensen vid nästa kontroll.",
    label: `Skriv ${item.kind === "tenant" ? "tenant-ID" : "Entra tenant-ID"} för att bekräfta`,
    expected: item.id, accept: "Radera licens" });
  if (!confirmed) { message("Raderingen avbröts."); return; }
  await quietly(run(async () => {
    state = item.kind === "tenant"
      ? await api("tenant", { tenantId: item.id, revision: state.revision }, "DELETE")
      : await api("consultant", { entraTenantId: item.id, objectId: ORGANIZATION,
        revision: state.consultantRevision }, "DELETE");
    render();
    message(item.kind === "tenant"
      ? "Tenantlicensen är raderad. En tidigare använd testperiod kan inte begäras igen."
      : "Konsultlicensen är raderad.", "success");
  }));
}
// The license stays, as a trial license that is active for 30 days from now; it can be changed
// again with Redigera, so it needs no confirmation.
async function restartTrial(item) {
  const { license, id } = item;
  await quietly(run(async () => {
    const expiresAt = new Date(Date.now() + 30 * 86400000).toISOString();
    state = await api("tenant", { tenantId: id, name: license.name || "",
      contactEmail: license.contactEmail || "", licenseType: "trial", enabled: true,
      expiresAt, revision: state.revision });
    render();
    message(`Testperioden för ${license.name || id} gäller nu till ${utc(expiresAt)} UTC.`, "success");
  }));
}
async function resetTrial(item) {
  const confirmed = await confirmTyped({
    title: `Radera licensen för ${item.license.name || item.id} och tillåt en ny testlicens?`,
    text: "Licensen och det tidigare testanspråket tas bort. Tenanten kan sedan begära en ny 30-dagars testlicens från tillägget. Detta kan inte ångras och är avsett för kontrollerade tester. Vill du bara förlänga testperioden, välj Starta om testperioden i stället.",
    label: "Skriv tenant-ID för att bekräfta", expected: item.id, accept: "Radera och tillåt ny testlicens" });
  if (!confirmed) { message("Återställningen avbröts."); return; }
  await quietly(run(async () => {
    state = await api("tenant/reset", { tenantId: item.id, revision: state.revision });
    render();
    message("Tenanten är helt återställd och kan begära en ny testlicens.", "success");
  }));
}

async function run(action) {
  if (busy) return;
  busy = true;
  document.body.setAttribute("aria-busy", "true");
  const buttons = [...document.querySelectorAll("button")].filter(item => !item.disabled);
  for (const item of buttons) item.disabled = true;
  try { await action(); }
  catch (error) { message(error.message, "error"); throw error; }
  finally {
    busy = false;
    document.body.removeAttribute("aria-busy");
    for (const item of buttons) item.disabled = false;
  }
}
const quietly = promise => promise.catch(() => {});

$("loginForm").addEventListener("submit", event => {
  event.preventDefault();
  quietly(run(async () => {
    if (location.protocol !== "https:" && !["127.0.0.1", "localhost"].includes(location.hostname)) {
      throw new Error("Öppna adminvyn via HTTPS.");
    }
    key = $("adminKey").value.trim();
    $("adminKey").value = "";
    await openWorkspace("Inloggad med reservnyckel.", "Inloggad med reservnyckel");
  }));
});
$("entraLogin").addEventListener("click", () => quietly(run(startEntraLogin)));
$("refresh").addEventListener("click", () => quietly(run(async () => {
  state = await api("state"); render(); message("Uppdaterat.", "success");
})));
$("testNotification").addEventListener("click", () => quietly(run(async () => {
  state = await api("notification/test", {}); render(); message("Testmejlet är skickat.", "success");
})));
$("logout").addEventListener("click", logout);
window.addEventListener("hashchange", () => { if (state) showView(location.hash.slice(1)); });
for (const link of document.querySelectorAll("#tabs a")) {
  link.addEventListener("click", event => { event.preventDefault(); go(link.dataset.view); });
}
for (const metric of document.querySelectorAll("[data-goto-license]")) {
  metric.addEventListener("click", () => {
    filters.license = metric.dataset.gotoLicense; filters.kind = "all";
    $("licenseSearch").value = ""; renderLicenses(); go("licenser");
  });
}
for (const metric of document.querySelectorAll("[data-goto-audit]")) {
  metric.addEventListener("click", () => {
    filters.audit = metric.dataset.gotoAudit; $("auditSearch").value = ""; renderAudit(); go("handelser");
  });
}
for (const metric of document.querySelectorAll("[data-goto-view]")) {
  metric.addEventListener("click", () => go(metric.dataset.gotoView));
}
for (const toggle of document.querySelectorAll("[data-kind]")) {
  toggle.addEventListener("click", () => { filters.kind = toggle.dataset.kind; renderLicenses(); });
}
$("licenseSearch").addEventListener("input", renderLicenses);
$("auditSearch").addEventListener("input", renderAudit);
$("clearLicenseFilters").addEventListener("click", () => {
  filters.license = "all"; filters.kind = "all"; $("licenseSearch").value = ""; renderLicenses();
  $("licenseSearch").focus();
});
$("newTenant").addEventListener("click", () => openTenantEditor());
$("newConsultant").addEventListener("click", () => openConsultantEditor());
for (const close of document.querySelectorAll("[data-close]")) {
  close.addEventListener("click", () => close.closest("dialog").close());
}
for (const extend of document.querySelectorAll("[data-extend]")) {
  extend.addEventListener("click", () => setExpiry(extend.dataset.extend === "tenant"
    ? $("expiresAt") : $("consultantExpiresAt"), Number(extend.dataset.days)));
}
$("enabled").addEventListener("change", () => {
  $("disableWarning").hidden = $("enabled").checked || $("enabled").dataset.wasEnabled !== "true";
});
// Close an open row menu when the click lands elsewhere.
document.addEventListener("click", event => {
  for (const menu of document.querySelectorAll("details.menu[open]")) {
    if (!menu.contains(event.target)) menu.open = false;
  }
});
$("exportLicenses").addEventListener("click", () => {
  const rows = [["Kategori", "Namn", "ID", "Licenstyp", "E-post", "Aktiv", "Slutdatum UTC"]];
  for (const item of licenses()) rows.push([item.kind === "tenant" ? "Kundföretag" : "Konsultföretag",
    item.license.name, item.id, typeLabel(item),
    item.kind === "tenant" ? item.license.contactEmail : item.license.email,
    item.license.enabled, item.license.expiresAt]);
  csvDownload(`bc-process-studio-licenser-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  message("Licenslistan har exporterats.", "success");
});
$("exportAudit").addEventListener("click", () => {
  const rows = [["Tidpunkt UTC", "Händelse", "Typ", "ID", "Aktör", "Detaljer"]];
  for (const event of state.auditEvents || []) rows.push([event.occurredAt, event.action,
    event.entityType, event.entityId, event.actor, JSON.stringify(event.details || {})]);
  csvDownload(`bc-process-studio-handelser-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  message("Händelseloggen har exporterats.", "success");
});
$("tenantForm").addEventListener("submit", event => {
  event.preventDefault();
  const tenantId = $("tenantId").value.trim().toLowerCase();
  if (!GUID.test(tenantId)) { formError("tenantFormError", "Tenant-ID ska vara ett GUID, till exempel 20afb97e-bbca-4f0d-a72b-e4cbbcdd57fb."); $("tenantId").focus(); return; }
  formError("tenantFormError", "");
  quietly(run(async () => {
    const value = { tenantId, name: $("tenantName").value.trim(), contactEmail: $("contactEmail").value.trim(),
      licenseType: $("licenseType").value, enabled: $("enabled").checked,
      expiresAt: new Date($("expiresAt").value + "Z").toISOString(), revision: state.revision };
    try { state = await api("tenant", value); }
    catch (error) { formError("tenantFormError", error.message); throw error; }
    $("tenantDialog").close(); render(); message("Licensen är sparad.", "success");
  }));
});
$("consultantForm").addEventListener("submit", event => {
  event.preventDefault();
  const entraTenantId = $("consultantTenantId").value.trim().toLowerCase();
  if (!GUID.test(entraTenantId)) { formError("consultantFormError", "Entra tenant-ID ska vara ett GUID."); $("consultantTenantId").focus(); return; }
  formError("consultantFormError", "");
  quietly(run(async () => {
    const value = { entraTenantId, objectId: ORGANIZATION,
      name: $("consultantName").value.trim(), email: $("consultantEmail").value.trim(),
      expiresAt: new Date($("consultantExpiresAt").value + "Z").toISOString(),
      enabled: $("consultantEnabled").checked, revision: state.consultantRevision };
    try { state = await api("consultant", value); }
    catch (error) { formError("consultantFormError", error.message); throw error; }
    $("consultantDialog").close(); render(); message("Konsultlicensen är sparad.", "success");
  }));
});
window.addEventListener("pagehide", logout);
async function initializeAuthentication() {
  try {
    await loadAuthConfig();
    if (!(await finishEntraLogin())) {
      if (!authConfig.enabled && authConfig.fallbackKeyEnabled) $("keyFallback").open = true;
      message(authConfig.enabled ? "" : "Microsoft-inloggningen är inte konfigurerad ännu.");
    }
  } catch (error) { message(error.message, "error"); }
}
initializeAuthentication();

function renderDocumentUsage() {
  const body = $("documentUsage"); body.replaceChildren();
  const users = new Map();
  for (const user of state?.tenantUsers || []) users.set(user.entraTenantId + ":" + user.objectId, user);
  for (const [id, user] of Object.entries(state?.consultants || {})) {
    const [entraTenantId, objectId] = id.split(":");
    if (objectId && objectId !== "00000000-0000-0000-0000-000000000000") users.set(id, { ...user, entraTenantId, objectId });
  }
  for (const user of state?.documentUsage || []) users.set(user.entraTenantId + ":" + user.objectId,
    { ...users.get(user.entraTenantId + ":" + user.objectId), ...user });
  const search = $("usageSearch").value.trim().toLocaleLowerCase();
  let visible = 0;
  for (const user of users.values()) {
    if (search && ![user.name, user.email, user.entraTenantId, user.objectId].join(" ").toLocaleLowerCase().includes(search)) continue;
    visible++;
    const count = user.periods?.[$("usagePeriod").value] || { documents: 0, reports: 0 };
    const row = document.createElement("tr");
    const lastCreated = String(user.lastCreatedAt || "").replace("T", " ").replace(/(:\d{2})?(\.\d{3})?Z$/, "") || "—";
    for (const [index, value] of [user.name || "—", user.email || "—", user.entraTenantId,
      user.objectId, String(count.documents), String(count.reports), lastCreated].entries()) {
      cell(row, value, index === 4 || index === 5 ? "num" : "");
    }
    body.append(row);
  }
  $("usageEmpty").hidden = Boolean(visible);
  $("usageEmpty").textContent = search ? "Ingen användare matchar sökningen." : "Ingen användare har registrerats ännu.";
}
$("usagePeriod").addEventListener("change", renderDocumentUsage);
$("usageSearch").addEventListener("input", renderDocumentUsage);
