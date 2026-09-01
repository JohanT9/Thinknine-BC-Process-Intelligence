# Product pilot validation

The product pilot gate turns real, sanitized Business Central dogfooding
worksheets into transparent aggregate metrics. It does not infer quality from
unit tests and it does not include screenshots, captions, business values,
tenant, company, user, URL or document identifiers.

## Run the gate

Keep the working dataset in approved local evidence storage and run:

```powershell
node scripts/product-validation-suite.js C:\approved-evidence\pilot-workbook.json
```

The command prints a deterministic JSON report and exits with code `1` when
coverage, reconciliation, schema or privacy validation fails. Do not commit the
source workbook. Only a reviewed aggregate report and sanitized defect
references may be published.

## Workbook contract

The root contains `schemaVersion: "1.0.0"` and an `entries` array. Every entry
contains:

- a synthetic `fixtureId`, ISO date and non-identifying `testerAlias`;
- browser and Business Central versions;
- one or more controlled `coverage` categories;
- every count defined in the dogfooding baseline;
- optional defects containing only a controlled category and sanitized ID.

At least 24 recordings and all required coverage categories are mandatory.
Fixture IDs must be unique. Numerators cannot exceed their denominators.
Unknown coverage and defect categories fail validation.

## Reported metrics

The report preserves numerator, denominator and calculated value for:

- generated-step acceptance;
- screenshot acceptance;
- manual text edits per ten generated steps;
- Word corrections per exported document;
- capture completeness.

A zero denominator produces `null`, never a misleading zero-percent result.
Defects are aggregated independently by capture, normalization, grouping,
semantic interpretation, screenshot, renderer and environment.

The automated test dataset is synthetic and verifies calculations only. It is
not a product baseline. Real pilot results remain unestablished until the
24–30 recording matrix has been executed in Business Central.
