# AI Evidence Policy

The AI input is a purpose-built, bounded projection, never the complete Bug
Report or arbitrary application state.

## Sent when available

- reproduction instructions with source evidence IDs;
- human expected and actual result;
- exact Business Central error after deterministic redaction;
- structured diagnostic identifiers required for citation;
- bounded parsed AL frames and deterministically established app ownership;
- evidence inventory and explicit missing-evidence facts.

Facts retain provenance. Exact errors are not silently truncated; an over-limit
input fails before transmission.

## Excluded by default

- Raw Events, Canonical Recording payloads, screenshots, and annotation pixels;
- raw diagnostics and complete raw call-stack text;
- full telemetry results and unrelated telemetry history;
- human notes;
- company, tenant, environment, user, session, and business identifiers where
  they are not required technical evidence;
- unrelated UI state and stored configuration.

Screenshots are always excluded in this milestone. Optional switches can include
bounded notes or relevant normalized telemetry; telemetry messages require a
separate opt-in. The disclosure records what was sent and excluded.

Emails, GUIDs, and URL query strings are redacted deterministically without
changing authoritative evidence. Limits apply to steps, frames, events, and
estimated tokens. Free text can still be sensitive, so explicit consent remains
required and administrators must review broker logging and provider retention.

