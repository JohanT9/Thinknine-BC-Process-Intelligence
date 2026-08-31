# Observed before and after state

## Purpose

State Observation gathers state facts already present in normalized evidence
and relates them to one Capture Packet. It answers a narrow question: what was
directly observed before and after this interaction?

It does not infer business meaning, invent missing values, or yet create a
Process State Transition. That semantic layer is separate.

## Contract

Capture Packet `1.6.0` contains an immutable State Observation `1.1.0` object:

- `version`: State Observation contract version;
- `status`: `changed`, `observed`, `partial`, or `unavailable`;
- `before.facts` and `after.facts`: ordered, typed observations;
- `changes`: exact before/after differences with matching fact keys;
- `coverage`: deterministic counts and observed fact kinds for integrity checks;
- `sourceEventIds`: Canonical evidence traceability.

Supported fact kinds are:

- `page`: stable page identity and bounded caption;
- `control-value`: observed previous and final normalized control value;
- `control-selection`: observed previous and final selected value;
- `toggle-state`: observed boolean state;
- `dialog-visibility`: observed open or closed dialog state.
- `outcome`: bounded presence of a status or error outcome without copying its
  potentially sensitive message or diagnostics.

Every independently identified control is accumulated by stable fact key. An
interaction that updates several fields, selections, or toggles therefore keeps
all directly observed changes instead of only the first and last control in the
packet. Repeated observations of one control retain its earliest observed prior
value and latest observed result.

Each fact references its normalized event and Canonical source events. A change
is emitted only when both sides use the same fact key and their observed values
differ. A missing side remains partial; the engine never substitutes a default.

## Privacy and projection

Control values already exist in normalized evidence. State Observation keeps
them inside derived Capture Packet evidence and does not place them in the
automatic observed-result sentence or overwrite consultant-authored expected
results. Renderers do not interpret or reconstruct this evidence.

## Validation

Capture Packet Integrity `1.2.0` verifies that every fact and change references
events owned by the packet, that `changed` status agrees with its differences,
and that coverage counts and kinds agree with the immutable fact collections.
Validation reports discrepancies and never repairs evidence.

Run the focused tests with:

```powershell
npm.cmd run test:observed-state
```
