# Tenant licensing foundation

The publisher configuration in `src/engine/tenant-license-config.js` now enables
the Azure pilot endpoint. The popup requires explicit acceptance of the V1
registration notice before any license request, including cached approvals.
The notice lists the data, publisher, endpoint and retention behavior.
This configuration is for the publisher's pilot; store privacy disclosures and
an agreed retention policy must be completed before distributing to customers.

A local endpoint prototype and private file-based tenant registry are now
available in `services/licensing/`. The admin center includes an action queue
for pending, expired and soon-to-expire licenses. Optional email delivery uses
an administrator-provided HTTPS webhook; no email provider is built in.
The service also keeps an append-only `audit.jsonl` history in the private data
directory. The admin center displays the latest 500 license, user and
notification events without exposing credentials or webhook URLs.
The admin dashboard summarizes active, trial, pending, expiring and inactive
licenses, connected users and failed notifications. Administrators can filter
the license and audit tables, export both datasets as CSV and send an explicit
test notification through the configured webhook.

For production, the service can store all license registries, trial claims,
users, installations, audit events and notification deduplication records in
Azure Table Storage. It authenticates with the App Service managed identity,
uses entity ETags for optimistic concurrency, and can import the existing file
data with record-count and SHA-256 verification while leaving the source files
unchanged. See `services/licensing/AZURE.md` for the migration sequence.

The admin center supports Microsoft Entra authorization-code sign-in with PKCE.
The API access token must contain the delegated `License.Check` scope and the
`License.Administrator` app role. Configure `LICENSE_ENTRA_CLIENT_ID` for the
browser client ID and optionally override the role through
`LICENSE_ENTRA_ADMIN_ROLE`. Register the exact SPA redirect URI
`https://<license-host>/admin`. The legacy `LICENSE_ADMIN_KEY` can remain as a
temporary emergency fallback and should be removed after Entra access is
verified.

Set `LICENSE_NOTIFICATION_WEBHOOK_URL` and `LICENSE_NOTIFICATION_RECIPIENT` to
enable email notifications. `LICENSE_NOTIFICATION_WEBHOOK_TOKEN` is optional
and is sent as a Bearer token. The webhook receives JSON with `to`, `subject`,
`text`, `eventType`, `entityId` and `occurredAt`. Delivery is deduplicated in
the private license data directory and failures never block license requests.

## Service contract

Deploy an HTTPS endpoint accepting POST JSON with exactly `installationId`
(random UUID), `tenantId` (BC URL tenant UUID) and `version`. Register the
installation idempotently; notify the publisher once per new installation, not
on every check. Tenant is first known when a BC recording starts, not at install.
Do not accept an installation ID as proof of tenant membership.

Respond with JSON `{ "tenantId": "<requested UUID>", "allowed": true,
"expiresAt": "<UTC ISO date>" }`. Use `allowed: false` for unknown, suspended or
expired tenants. Tenant lookup and expiration must be enforced by the service.
Do not embed administrator credentials or signing secrets in the extension.
Apply request body limits, validation and rate limiting to the public endpoint.

Approved responses are cached locally until the earlier of one hour or license
expiry. After cache expiry an unavailable service blocks new recordings; there
is no indefinite offline allowance. Local history remains accessible.

Licensing is evaluated per Business Central tenant, not per user or browser.
Every installation in the same tenant receives the same license result. The
random installation ID is used only for registration statistics.

## Activation checklist

1. Choose hosting and implement the endpoint and an administrator license store.
2. Publish a privacy notice disclosing installation/tenant/version registration,
   its purpose, retention and recipient; add a visible first-use explanation.
3. Add only the service's exact HTTPS origin to manifest host permissions.
4. Configure the endpoint and enable the publisher configuration; rebuild.
5. Test permitted, unknown, expired and switched tenants, offline behavior and
   installation notification with the deployed service.

## Scope and limitations

The gate protects starting process and bug recordings, incoming recorded events,
pre-action capture requests and captured BC errors. Active recording requests
must match the tenant saved at recording start; a tenant change blocks new
captures until the user stops and starts a new recording. Local history and
exports remain available. Approval expiry is checked during active captures.

URL-based tenant identification is a convenience license barrier, not verified
identity. Modified extension code or a forged client request can bypass it.
Authenticated token validation/server-dependent features are needed for stronger
protection. Named consultant licenses use a separate Entra authorization-code
flow with PKCE. The server, not the extension, validates API access tokens and
keys licenses by the consultant's home `tid` and `oid`.

Run `node tests/tenant-license.test.js` for the isolated client tests.

## Dokumentstatistik per användare

Admin visar antal unika sparade processdokument och felrapporter per Microsoft-användare,
totalt eller för de senaste 7, 30 eller 90 dagarna, samt senaste skapandet i UTC.
Det går att söka på namn, e-post och identitets-ID. Samma användare i flera BC-tenanter
sammanförs via Entra tenant-ID och objekt-ID. Totalsiffrorna avser skapade dokument,
inte antal kvarvarande filer: redigering, export, arkivering och borttagning ändrar inte antalet.
Felrapporter räknas vid första sparandet, även om de ännu är utkast.

Statistiken börjar med nya dokument som sparas av en inloggad användare efter uppdateringen.
Befintliga dokument och tidigare användning fylls inte på i efterhand. En tom granskning
räknas inte. Tillägget skickar endast dokumenttyp, ISO-skapandetid och SHA-256 av dokumentets
tekniska ID till POST /v1/license/usage. Servern kopplar identiteten från verifierad Entra-token
och kräver aktiv konsultlicens eller registrerad användare av en aktiv tenantlicens.
Inga dokumenttitlar, steg, bilder eller rapportinnehåll skickas.

En beständig lokal kö gör nya försök var femte minut, vid start av bakgrundsarbetaren
och vid sparande. Köade händelser skickas bara när samma Microsoft-användare är inloggad.
Servern deduplicerar dokumenttyp och ID, även om svaret tappas bort. Skapandetiden avser
första lokala sparandet, inte nätverksleveransen. Rensning av tilläggets lokala data kan
förlora ännu oskickade händelser. Statistiken är användningsuppföljning, inte ett revisionsunderlag.

Distribuera både den nya licenstjänsten och tillägget. Inga nya Entra-behörigheter behövs.
Tillägget behöver Chrome-behörigheten alarms för återförsök. Tjänsten lagrar metadata i
document-usage.json i fil-läge eller Azure-tabellen LicenseDocumentUsage. Azure-identiteten
behöver kunna skapa tabellen, som för övriga licenstabeller. Fil-till-Table-migreringen tar
med statistiken vid en ny migrering. Säkerhetskopiera även dessa data; de behålls för
totalsiffror och deduplicering tills administratören raderar dem enligt sin lagringspolicy.
