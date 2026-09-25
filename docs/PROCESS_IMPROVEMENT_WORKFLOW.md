# Process engine improvement workflow

The extension keeps correction feedback local and exports only aggregate counts.
The exported file contains no review, session, task, event, customer, tenant,
company, instruction, value or screenshot identifiers.

The debug panel automatically downloads both the sanitized JSON dataset and a
prioritized Markdown report. This is the normal workflow and requires no
terminal command or manual file lookup.

The local command remains available for CI and archived datasets:

```bash
npm run analyze:process-improvement -- C:\path\to\bc-process-improvement-data.json
```

The analyzer rejects unexpected fields and inconsistent totals before producing
a prioritized Markdown report. A rule must receive a sanitized regression
scenario in `tests/fixtures/process-analysis/` before its implementation is
changed. Run `npm run scenarios:process-analysis` and the full CI suite after
every rule adjustment.

Priority levels are based on correction frequency: five or more is high, two
to four is medium, and one is watch. They indicate where to investigate first;
they do not authorize automatic rule changes or external transmission.
