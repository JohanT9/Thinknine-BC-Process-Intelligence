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

The extension remains disabled until notice, tenant-switch handling, licensing
and failure tests are complete. Free F1 is a test tier, not an availability
commitment for production license enforcement.

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
Only exact same-origin assets and requests are allowed by the CSP. The API does
not enable CORS. Key comparisons use a fixed-length SHA-256 timing-safe compare.
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
the trial flow again; it requires typing the full tenant ID.

## Consultant licenses (Microsoft Entra)

Consultant licenses are named-user licenses keyed by the consultant's home
Entra `tid` and `oid`. Configure the API app registration to expose delegated
scope `License.Check`, then add App Service settings:

- `LICENSE_ENTRA_AUDIENCE`: the API application's expected access-token audience
- `LICENSE_ENTRA_SCOPE`: `License.Check`

The API validates RS256 signature, key id, audience, expiry, scope, issuer,
tenant id and object id. The extension's app registration must be multitenant
for organizational accounts and use its `chrome.identity.getRedirectURL("entra")`
URL as a SPA redirect URI. Put its client id and full delegated scope in
`src/engine/tenant-license-config.js`, enable consultant auth, and rebuild.

After the consultant signs in, the license page displays the Entra tenant and
object ids needed to create the named license in admin. Tenant licensing is
checked first; the consultant license is only a fallback for customer tenants
without an active tenant license.

Edits use a revision check and serialized atomic replacement to prevent lost
updates within this single process. The immediately previous registry is saved
as tenants.json.backup. This is not a replacement for scheduled backups. Do not
mix manual file edits with active admin mutations; multiple service instances
still require a database. Rotating LICENSE_ADMIN_KEY invalidates the old key
after the service restart. This pilot uses a shared administrator key, not named
users, MFA or an administrator audit trail. Use Entra admin authentication for
broader administrative access; extension users need no new sign-in.
