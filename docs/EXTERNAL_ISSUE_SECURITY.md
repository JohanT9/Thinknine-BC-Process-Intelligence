# External Issue Security

Nothing is transmitted when recording stops, a Bug Report becomes ready,
telemetry loads, AI completes, preview opens, or an offline package is built.
The user must select a configured destination, inspect the preview and sensitive
categories, explicitly consent, and press Create Issue.

## Data leaving the extension

Depending on preview choices, transmission may include report narrative,
reproduction, exact error, environment/technical identifiers, AL stack, notes,
selected screenshots, bounded telemetry summary, and current labelled AI
analysis. Raw Events, Canonical payloads, raw telemetry results, extension
storage, and credentials are excluded. The UI does not silently remove business
data; it exposes categories for human review.

## Credentials and permissions

Azure DevOps uses Entra delegated PKCE directly. GitHub uses an Entra-protected
GitHub App broker because a distributed extension cannot protect GitHub App
secrets/private keys. Tokens stay in memory and authorization headers are
sanitized from errors. Public configuration alone is persisted. Exact optional
host permission is requested before connecting.

## Submission safety

- active duplicate submissions for the same package/destination are rejected;
- the stable package ID is supplied as a broker idempotency key;
- an existing external reference requires deliberate re-submission confirmation;
- stale packages cannot be submitted;
- rate, authorization, permission, validation, availability, and attachment
  failures are categorized without altering the report;
- ambiguous timeouts are marked uncertain and never blindly retried;
- partial attachment failure retains the created external reference;
- successful creation stores only provider, destination, external ID/URL,
  time, source revision, and AI/telemetry inclusion flags.

There is no bidirectional synchronization, automatic update, external read-back,
issue routing, or customer support portal in this milestone.

