# Capture Packet Integrity

Capture Packet Integrity is the validation boundary between Event-to-Step
Grouping and downstream semantic interpretation. Version `1.1.0` validates
derived packet relationships without changing Canonical Recording, normalized
events, packet contents, or document output.

The validator checks:

- one consistent recorder interaction identity per packet;
- interaction and result references owned by the packet event context;
- result evidence ordered after its initiating interaction;
- supported screenshot evidence roles and owned preferred assets/sources;
- Result Verification outcome and source traceability;
- State Observation event/source ownership and change/status consistency;
- agreement between evidence, `missing`, and `completeness`.

Diagnostics contain stable codes, severity, a bounded message, and non-sensitive
reference details. An error makes `valid` false. Historical recordings without
recorder interaction identity receive an informational compatibility diagnostic
and remain valid.

Runtime grouping keeps invalid derived packets observable and reports their
diagnostics; it does not silently repair evidence or fabricate a replacement.
The exported `assertValid` function is the CI gate for sanitized fixtures and
throws `CAPTURE_PACKET_INTEGRITY_FAILED` with the same diagnostics.
