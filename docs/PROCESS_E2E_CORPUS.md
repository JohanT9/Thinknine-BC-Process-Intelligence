# Process end-to-end regression corpus

The sanitized corpus verifies the complete process-document path:

`raw event -> canonical recording -> normalization -> grouping -> semantic
interpretation -> task consolidation -> document projection`

Run it with:

```bash
npm run scenarios:process-e2e
```

The approved semantic and projected output is stored in
`tests/fixtures/process-e2e/golden-output.json`. CI compares exact instructions,
structured captions and values, result status, selected screenshot, and the
instruction/result/image that reaches the final document. Verify it with
`npm run test:process-golden`. After reviewing an intentional output change,
update it explicitly with `npm run update:process-golden` and review the JSON
diff before committing it.

`npm run test:process-output-quality` is the independent quality oracle. Unlike
the golden comparison, it does not approve the current output merely because it
is stable. It rejects blocking quality or contradiction findings, empty
instructions or results, lost boolean state, invented screenshot references,
error outcomes hidden from the reader, and differences between interpreted
tasks and the projected document.

`npm run test:process-language-matrix` projects every base scenario in every
registered document language. It verifies localized instructions and observed
results, document-language metadata, task-to-document parity, stable screenshot
selection, preserved captured Business Central text and valid Unicode output.

The corpus contains 20 base scenarios. It covers typed field values, dates,
descriptions, unchanged focus events, actions with navigation or status results,
record selection, checked and unchecked toggles, option selection, menu paths,
control add-ins, dialog and orphan-navigation filtering, explicit interaction
boundaries, identical controls on different pages, Business Central errors and
preservation of observed English labels.

Fixtures must contain synthetic or anonymized values only. Never add customer,
tenant, company, user, document, item or account identifiers from a real
recording. A new engine rule or a correction to an existing rule must add a
scenario that fails before the change and passes after it.

Every scenario declares expected normalized-event, group and final-task counts.
Task assertions cover structured fields as well as the instruction and final
document projection. This prevents a local improvement from silently breaking
another stage of the process pipeline.
