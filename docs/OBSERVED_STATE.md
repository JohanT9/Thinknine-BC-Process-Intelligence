# Observed before and after state

## Purpose

State Observation gathers state facts already present in normalized evidence
and relates them to one Capture Packet. It answers a narrow question: what was
directly observed before and after this interaction?

It does not infer business meaning, invent missing values, or yet create a
Process State Transition. That semantic layer is separate.

## Contract

Capture Packet `1.6.0` contains an immutable `stateObservation` object:

- `version`: State Observation contract version;
- `status`: `changed`, `observed`, `partial`, or `unavailable`;
- `before.facts` and `after.facts`: ordered, typed observations;
- `changes`: exact before/after differences with matching fact keys;
- `sourceEventIds`: Canonical evidence traceability.

Supported fact kinds are:

- `page`: stable page identity and bounded caption;
- `control-value`: observed previous and final normalized control value;
- `toggle-state`: observed boolean state;
- `dialog-visibility`: observed open or closed dialog state.

Each fact references its normalized event and Canonical source events. A change
is emitted only when both sides use the same fact key and their observed values
differ. A missing side remains partial; the engine never substitutes a default.

## Privacy and projection

Control values already exist in normalized evidence. State Observation keeps
them inside derived Capture Packet evidence and does not place them in the
automatic observed-result sentence or overwrite consultant-authored expected
results. Renderers do not interpret or reconstruct this evidence.

## Validation

Capture Packet Integrity `1.1.0` verifies that every fact and change references
events owned by the packet and that `changed` status agrees with its differences.
Validation reports discrepancies and never repairs evidence.

Run the focused tests with:

```powershell
npm.cmd run test:observed-state
```
