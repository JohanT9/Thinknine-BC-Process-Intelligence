# Interaction to Result correctness corpus

## Purpose

This corpus protects the most important Capture Packet relationship: an
observed result must belong to the interaction that caused it. A plausible
result attached to the wrong documentation step is more dangerous than a
missing automatic result because it can look correct during review.

The focused gate complements Capture Packet Integrity. Integrity validates the
internal consistency of any packet; this corpus compares production grouping
against an explicit scenario-by-scenario oracle.

## Exact oracle

For every expected packet, the versioned fixture states:

- the recorder interaction identity;
- ordered interaction and result event identities;
- `verified`, `error`, or `unverified` status;
- primary outcome kind and owning event;
- ordered observed outcome kinds;
- preferred screenshot and evidence role;
- events that must remain supporting evidence.

The runner fails on any difference. It does not infer an alternative expected
answer and never rewrites evidence.

## Covered boundaries

`tests/fixtures/interaction-result/sanitized-scenarios.json` currently contains
ten synthetic, sanitized scenarios and eleven expected packets:

- action followed by navigation;
- action followed by dialog and Business Central error;
- accessible status outcome;
- dialog open and close ordering;
- toggle and progressive field interactions whose commit is also the result;
- two adjacent actions with separate outcomes;
- React framework noise between action and result;
- a late result from an older interaction after a new interaction starts;
- an orphan status message.

The late-result case is deliberately conservative: it remains supporting
evidence rather than being attached to the currently active step. Missing
automatic verification is preferable to incorrect causal attribution.

The corpus contains normalized metadata only, no image bytes or customer
values. It proves deterministic behavior for these shapes, not validation on a
customer production environment.

## CI gate

Run the focused gate with:

```powershell
npm.cmd run test:interaction-result-correctness
```

CI requires all exact assertions to pass and currently enforces floors of ten
scenarios, two surface types, seven verified outcomes, two error outcomes, and
two deliberately unverified interactions. Coverage floors may only increase as
evidence is added.
