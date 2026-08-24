# 4.6 AI Technical Analysis milestone

Technical Bug Reports now support optional AI-assisted investigation guidance.
Only a bounded, disclosed evidence projection is sent after explicit consent.
Results are labelled AI-assisted, require citations, cannot claim verified root
cause, become stale when source evidence changes, and are excluded from exports
by default.

The extension contains no provider key. Production use requires an independently
deployed Entra-protected HTTPS broker plus privacy, retention, authorization,
logging, cost, and sanitized-pilot review. No real provider was exercised in
this milestone; deterministic synthetic tests cover the client contract.
