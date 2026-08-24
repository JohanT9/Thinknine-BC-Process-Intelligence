# AI Privacy and Security

AI analysis is disabled until public broker configuration is saved, exact-host
permission is granted, and the user explicitly consents for the current action.
No provider call occurs automatically.

## Credential boundary

The extension contains no OpenAI API key, client secret, or broker secret. It
uses Microsoft Entra authorization-code flow with PKCE and holds the broker
access token only in service-worker memory. The HTTPS broker owns the provider
key and must validate tenant, audience, scope, user, and authorization. Local
storage contains only public tenant/client/scope, broker URL, model, enablement,
and input limit.

OpenAI documents that API keys must not be exposed in client-side code. The
broker should use structured Responses output, no tools, and `store: false`.
That is not by itself a promise of zero provider retention. OpenAI data controls
describe default abuse-monitoring retention and organization-level Zero Data
Retention/Modified Abuse Monitoring. Production owners must verify their
contractual and organizational controls.

- https://developers.openai.com/api/reference/overview#authentication
- https://developers.openai.com/api/reference/resources/responses/methods/create
- https://developers.openai.com/api/docs/guides/your-data#default-usage-policies-by-endpoint

## Controls and production assessment

- Evidence is untrusted data in the versioned prompt.
- No autonomous tools, network lookup, source access, screenshots, or BC access
  are available to the model.
- Validation rejects unsupported citations and object references.
- Rendering uses text-only DOM APIs.
- Broker URLs must be HTTPS and permission is exact-origin.
- Failures never delete or change evidence.
- Analysis is not placed in Document Library metadata or logs.

Synthetic tests cover the extension contract. No production broker or real
OpenAI provider was exercised. Production readiness requires broker deployment,
Entra registration, authorization tests, log-redaction and retention review,
rate/cost controls, and a sanitized pilot. Bug Reporting has no dependency on
that deployment.

