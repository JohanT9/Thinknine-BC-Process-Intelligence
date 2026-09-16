# Tenant licensing foundation

The publisher configuration in `src/engine/tenant-license-config.js` now enables
the Azure pilot endpoint. The popup requires explicit acceptance of the V1
registration notice before any license request, including cached approvals.
The notice lists the data, publisher, endpoint and retention behavior.
This configuration is for the publisher's pilot; store privacy disclosures and
an agreed retention policy must be completed before distributing to customers.

A local endpoint prototype and private file-based tenant registry are now
available in `services/licensing/`. See its README for setup and deployment
limitations. It does not send email or host anything externally.

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
protection. This version intentionally adds no Entra sign-in.

Run `node tests/tenant-license.test.js` for the isolated client tests.
