# Error analysis evaluation corpus

The versioned corpus in `tests/fixtures/error-analysis/sanitized-error-corpus.json`
is the regression baseline for the dedicated error engine. It contains
synthetic, sanitized cases for each supported classification plus message
inference, insufficient evidence, incident correlation, and privacy handling.

The runner verifies classifications, stable error codes, diagnosis status,
incident grouping, primary evidence, and required privacy categories. It does
not compare generated prose and does not treat a hypothesis as a verified root
cause.

Run `npm run test:error-analysis-corpus` for the CI gate or
`npm run scenarios:error-analysis` for a standalone result. Add new sanitized
pilot cases without replacing existing cases. A changed expectation must be
reviewed with its rule or contract change so regressions cannot pass silently.
