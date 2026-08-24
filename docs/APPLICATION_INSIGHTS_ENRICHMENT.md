# Application Insights enrichment

Application Insights enriches one selected Business Central error after an
explicit user action. It is optional external evidence, stored separately from
Canonical Recording and raw captured activity. Local report loading, readiness,
copy, Markdown/text export, and reproduction never depend on telemetry.

The provider supports versioned bounded queries over `traces` and `pageViews`
for exact Application Insights session, exact client activity, and nearby
warning/error events. Default correlation is +/-5 minutes and the hard maximum is
+/-30 minutes. Refresh replaces only the selected error's enrichment and preserves
human edits and other error contexts. Multiple query success is retained when
another query fails. Empty success is `no-matches`, not a query failure.

The primary report shows errors, warnings, failed operations, AL/runtime signals,
and operations of at least 30 seconds. Other session context stays in bounded,
collapsed raw-query details.

See [correlation](TELEMETRY_CORRELATION.md) and
[security](TELEMETRY_SECURITY.md).
# AI analysis boundary

Application Insights enrichment remains external telemetry evidence. AI does
not receive it by default. With explicit telemetry consent, only bounded,
normalized relevant events are projected; message text has a separate opt-in.
AI output remains derived state and never changes stored telemetry or its
correlation reasons.
