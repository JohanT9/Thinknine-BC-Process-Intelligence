# Telemetry correlation

Priority is exact `session_Id`, exact `customDimensions.clientActivityId`, then
a bounded UTC timestamp window. Query definitions are centralized and versioned
`1.0.0`; ordinary users cannot supply KQL. Apostrophes in identifiers are
escaped before generating KQL.

Every event records provider, query ID/version, query time, source record ID
where supplied, and explicit reasons: `exact-session`, `exact-activity`, or
`time-window`. When a stable telemetry item appears in multiple results it is
deduplicated and all reasons are retained. Unknown dimensions remain in the raw
record and normalized `dimensions` object.

Each BC error has a separate context. Original captured timestamp and normalized
UTC bounds remain available. The renderer-neutral timeline combines references
to captured errors and external events without combining their stores. It says
what was observed and never assigns confidence percentages, responsibility, or
causation.
