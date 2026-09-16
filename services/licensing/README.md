# Local tenant license service

This service is a local prototype for the extension's licensing endpoint. It is
not deployed, and the extension's license configuration remains disabled.

## Run locally

Create a private data directory outside the extension's `dist` folder. Copy
`tenants.example.json` into that directory as `tenants.json`. The example tenant
is disabled deliberately; enable it only when you intend to issue its license.

PowerShell example, after preparing the private registry:

```powershell
$env:LICENSE_DATA_DIRECTORY = 'C:\Development\Thinknine-BC-Process-Intelligence\.tmp\license-data'
node services/licensing/server.js
```

The service listens only on `127.0.0.1:8787`. The extension requires HTTPS, so
this local HTTP endpoint is for isolated service tests, not activation.

## Tenant administration

Edit the private `tenants.json` registry with tenant UUID keys and `enabled` and
`expiresAt` properties. Expiration must be an ISO UTC date. Changes are read on
each check; use atomic file replacement when updating a running deployment.
Unknown, disabled and expired tenants are denied. Invalid configuration returns
503 rather than permitting access. A protected administrator API and browser
interface are now available at `/admin`; see AZURE.md for activation.

An unknown tenant can request one 30-day trial through `/v1/license/trial`.
Its unverified contact address is shown in the protected admin view. Deleting
the tenant removes that address, while `trial-claims.json` retains a one-way
email hash and trial metadata so the same tenant cannot request another trial.
Back up both registry files.

`registrations.jsonl` records each installation/tenant pair once, including
version and registration time. Existing records are loaded at startup so a
restart does not produce duplicate registrations. No email is sent yet. The log
is the basis for a later notification worker; SMTP/provider credentials would
live only on the server, never in the extension.

## Before deployment

- Choose hosting, HTTPS termination and persistent private storage.
- Use one service process with this file-based store. For multiple replicas or
  many installations use a database with a unique installation/tenant key.
- Set registry/log file permissions, backups and a retention/deletion policy.
- Configure gateway rate limits and request size/time limits. This prototype
  uses in-memory rate limiting by socket address and ignores forwarded headers;
  behind a proxy all callers may share that address. Do not trust arbitrary
  client-supplied forwarded addresses.
- Publish the data registration notice before activating the extension.
- Decide the recipient and notification provider before implementing email.
- Complete active-recording tenant-switch checks in the extension.

No tenant-membership authentication is added: tenant UUIDs and submitted email
addresses remain unverified. This is
a convenience licensing barrier, not proof of tenant membership.

Tests: `node tests/tenant-license-service.test.js`.

Admin tests: `node tests/tenant-license-admin.test.js`.
