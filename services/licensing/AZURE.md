# Azure deployment

Target hostname:
`thinknine-bc-license-gparapcbbzgkgfha.swedencentral-01.azurewebsites.net`

Package only the service with `node scripts/package-license-service.js`.
The resulting `release/bc-license-service.zip` has the server and admin assets
at its root. Do not deploy the extension repository or private registry.

In App Service Environment variables add LICENSE_DATA_DIRECTORY with value
`/home/license-data`. Keep that directory outside /home/site/wwwroot. App Service
must retain its /home storage. Do not scale this file-based prototype to multiple
processes/instances. Configure Startup Command as `npm start`.

Deploy the ZIP using authenticated Azure CLI or Cloud Shell:

```powershell
az webapp deploy --resource-group rg-bc-process-studio --name thinknine-bc-license --src-path ./bc-license-service.zip --type zip
```

The CLI command requires the Azure resource name, not the default hostname.
Confirm the resource group and resource name in Overview before running it.
Upload the ZIP to Cloud Shell first if using that terminal. Do not upload any
passwords or publish profiles to the repository.

Startup creates an empty private tenants.json only if none exists; it never
overwrites existing licenses. Every tenant is denied initially. Test GET /health
over HTTPS: it should return {"status":"ok"}. No registration data is exposed.
Enable HTTPS Only in App Service. Use Azure SSH to administer the private
registry after deployment, and take backups before changing it.

The extension is configured to use this pilot service. Before distributing it,
publish the privacy notice in the extension, confirm the registration data
retention policy, and complete the Entra setup below. Free F1 is a test tier,
not an availability commitment for production license enforcement.

## Protected administrator interface

The public `/admin` page contains only the login interface and assets. Tenant
data and all edits require the separate LICENSE_ADMIN_KEY. Without this setting
the administrator API is disabled; public license checks still work.

1. Generate a random key in Azure SSH, not in chat:

```bash
node -e 'console.log(require("crypto").randomBytes(32).toString("hex"))'
```

2. Store the resulting 64 hexadecimal characters in a password manager. Do not
   send them to chat, put them in a URL, commit them or include them in a ZIP.
3. In Azure Environment variables add LICENSE_ADMIN_KEY with that value. Apply
   the change; the service restarts. Keep HTTPS Only enabled.
4. Upload the new service ZIP to Cloud Shell and redeploy using the command
   above. Your private /home/license-data registry is not included or replaced.
5. Open the target HTTPS hostname with `/admin` and enter the key.

The key is held only in the page's memory and sent in Authorization headers.
Reloading requires logging in again. Logout clears page data; inactivity of 30
minutes also logs out. No cookie, localStorage or embedded secret is used.
Only exact same-origin assets and requests are allowed by the CSP. The public
license API answers CORS preflight requests only for Chrome/Edge extension
origins (`chrome-extension://`, `edge-extension://`, and Edge's `extension://`)
with a valid 32-character extension ID; it allows only POST, OPTIONS,
Authorization and Content-Type. Admin routes do not enable CORS. Key
comparisons use a fixed-length SHA-256 timing-safe compare.
Admin traffic has separate in-memory rate limiting. Proxy-level limits are still
needed, especially when several clients share the proxy socket address.

The interface can add/name/delete tenants, set UTC expiration, enable/disable
licenses, show trial contact addresses, and show the latest 500 registration
records with the total count. Deleting a tenant removes its raw contact address
but retains its one-way trial claim in `trial-claims.json`. Counts are
installation/tenant pairs, not verified people or machines. It does not send
email. Manually created entries are denied until intentionally enabled.
The administrator can change the displayed license type manually. A separate
destructive reset removes both the license and trial claim so a tenant can test
the trial flow again; it requires two confirmations, with the tenant ID shown
in the second confirmation.

## Consultant licenses (Microsoft Entra)

Consultant licenses are named-user licenses keyed by the consultant's home
Entra `tid` and `oid`. Configure the API app registration to expose delegated
scope `License.Check`, then add App Service settings:

- `LICENSE_ENTRA_AUDIENCE`: the API application's expected access-token audience
- `LICENSE_ENTRA_SCOPE`: `License.Check`

The same API registration is required for tenant trials and user registration.
`POST /v1/license/trial` requires a verified Entra bearer token with the
delegated `License.Check` scope. The service derives the user's name and email
from that token; clients cannot supply a trial contact address. Configure
`LICENSE_ENTRA_AUDIENCE` and `LICENSE_ENTRA_SCOPE` before testing trial
activation. Anonymous trial calls receive HTTP 401. A successful first sign-in
for an eligible, unlicensed tenant creates a 30-day trial, registers the user,
and records the tenant in the same license registry used by `/admin`. A second
trial is denied. Existing active tenant licenses are checked first and are not
replaced by a trial. Configure the extension's multitenant Entra app and
delegated API scope described below so both tenant users and consultants can
sign in.

The API validates RS256 signature, key id, audience, expiry, scope, issuer,
tenant id and object id. The extension's app registration must be multitenant
for organizational accounts and use its `chrome.identity.getRedirectURL("entra")`
URL as a SPA redirect URI. Put its client id and full delegated scope in
`src/engine/tenant-license-config.js`, enable consultant auth, and rebuild.

After the consultant signs in, the license page displays the Entra tenant and
object ids needed to create the named license in admin. Tenant licensing is
checked first; the consultant license is only a fallback for customer tenants
without an active tenant license.

The extension popup also shows the current BC tenant's license type and expiry.
Starting a process or bug recording prompts the user to sign in with Microsoft.
For an eligible tenant without a license, the first authenticated sign-in starts
the trial automatically. The signed-in user's identity is visible with the
tenant's registered users in the license administration interface.

Edits use a revision check and serialized atomic replacement to prevent lost
updates within this single process. The immediately previous registry is saved
as tenants.json.backup. This is not a replacement for scheduled backups. Do not
mix manual file edits with active admin mutations; multiple service instances
still require a database. Rotating LICENSE_ADMIN_KEY invalidates the old key
after the service restart. This pilot uses a shared administrator key, not named
users, MFA or an administrator audit trail. Use Entra admin authentication for
broader administrative access; extension users need no new sign-in.

## Azure Table Storage migration

Production deployments can replace the file registries with Azure Table
Storage. The service uses its App Service managed identity and does not require
an account key or connection string. Configure:

- `LICENSE_TABLE_ACCOUNT_URL`: for example
  `https://<account>.table.core.windows.net`
- `LICENSE_MANAGED_IDENTITY_CLIENT_ID`: only for a user-assigned identity;
  leave empty for the App Service system-assigned identity
- `LICENSE_STORAGE_MIGRATE_FROM_FILES=true`: only for the initial import

Grant the identity **Storage Table Data Contributor** on the storage account.
At startup the service creates the required tables, imports the existing files,
then verifies the record count and SHA-256 checksum of every dataset. The
original files are not deleted or modified. A verified migration marker is
written to `LicenseMetadata`, which prevents a repeated import.

The health endpoint reports `"storage":"azure-table"` after a successful
switch. After verifying the admin counts, audit history and a license check,
change `LICENSE_STORAGE_MIGRATE_FROM_FILES` to `false`. Do not switch back to
file mode after new Table Storage writes without first exporting the newer data.

The tables are `LicenseTenants`, `LicenseConsultantCompanies`, `LicenseUsers`,
`LicenseTrialClaims`, `LicenseInstallations`, `LicenseAuditEvents`,
`LicenseNotifications`, and `LicenseMetadata`. Entity writes use ETags and
retry optimistic concurrency conflicts.

## First sign-in trial validation

After configuring Entra, rebuild and load the extension, then use a disposable test tenant:

1. Confirm `/health` returns HTTP 200 and the expected storage mode.
2. Open an eligible, unlicensed Business Central tenant and open the extension popup. The card should show that no license is active and a trial can start.
3. Start a recording or use the license card action. Accept the registration notice and complete Microsoft sign-in. The tenant should receive a 30-day trial and the popup should show `Trial · 30 days` with its expiry date.
4. In `/admin`, confirm the tenant entry is enabled, has license type `trial` and the same expiry, and the signed-in identity appears under registered users.
5. Reopen the popup and confirm the cached active trial is shown. Repeat the request against the same tenant and confirm the service refuses a second trial.
6. Send a trial request without an Authorization header and confirm HTTP 401. Check a known active tenant and confirm its existing type and expiry are unchanged after sign-in.

Use only a disposable tenant for trial reset tests. Reset deletes the trial license and claim and is intentionally destructive.
