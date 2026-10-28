# Capture quality corpus

The capture quality corpus measures how well a recording becomes steps. Each entry holds the
raw recorder events of one recording and the steps a person expects, in order. The events are
replayed through the same chain as the extension (canonical recording, UI identification,
normalization, step grouping, session interpretation), and every produced step is classified:

| Outcome | Meaning |
| --- | --- |
| correct | Right control and, where expected, right value |
| wrong | Right control, wrong value |
| duplicate | Another step for an expected step that is already covered |
| extra | A step that matches no expected step (noise) |
| missing | An expected step with no produced step |

Precision is correct steps divided by produced steps; recall is correct steps divided by
expected steps. Steps are aligned in order, so a step in the wrong place does not count.

The corpus starts with two capture lab recordings of a Business Central-shaped page: one
used with the mouse and one used from the keyboard (shortcuts, arrow keys, Tell Me, a FactBox
and values the client reformats). Run `npm run capture:lab` to capture them again after a
recorder change. Recordings from real Business Central are added with the importer; the first is `bc-purchase-order-ctrl-delete` (Ctrl+Delete on a released purchase order).

## Commands

```sh
npm run quality:capture                 # table per recording, compared with the baseline
npm run quality:capture -- --verbose    # every step with its outcome, and the missing steps
npm run quality:capture -- --update     # store the current result as the new baseline
npm run quality:import -- export.zip --id sales-order-swedish
```

`npm run test:capture-quality` runs in `npm run ci`. It fails when any recording gets fewer
correct steps or more wrong, duplicate, extra or missing steps than in
`tests/fixtures/capture-quality/baseline.json`. After an improvement, update the baseline in
the same change so the improvement is kept.

## Adding a recording

1. In BC Process Studio, open the document's menu and choose **Export recording (ZIP)**.
2. Run `npm run quality:import -- <file.zip> --id <short-name>`. The entry is written to
   `tests/fixtures/capture-quality/recordings/<short-name>.json`. Nothing is sent anywhere.
3. Correct `expectedSteps`: one entry per user action, with the control caption as `target`
   and, for an entered or chosen value, the value as it appears in the events. The importer
   starts from today's result and keeps its instruction as `note`, so remove duplicates and
   noise, and add what is missing.
4. Read through the events for remaining customer data, then set `"reviewed": true`.
5. Run `npm run quality:capture -- --update` and commit the entry with the baseline.

### What the importer removes

- Field values, chosen records and every other occurrence of their words are replaced by
  random pseudonyms of the same shape. A typed fragment stays a prefix of the chosen value, so
  type-ahead behaves as recorded. Words that are also control captions (for example an
  option such as Item) are kept.
- The company name and the record name in page titles (after "∙") are pseudonymized wherever
  they occur.
- URLs keep only the page number. E-mail addresses and the company name are removed, and
  GUIDs are replaced consistently so events keep their interaction.
- Screenshots are not part of `events.json` and are never imported.

Business Central captions, numbers and dates are kept, because the recorder depends on them.
The pseudonyms are random and not stored, so they cannot be reversed. Text that does not
repeat a captured value, such as a free-text message, is kept as it was: check it in step 4.
Use `--keep-values` only for demo companies such as CRONUS.

## Entry format

```json
{
  "schemaVersion": 1,
  "id": "lab-sales-order-typeahead",
  "source": "capture-lab",
  "documentLanguage": "en-US",
  "reviewed": true,
  "eventsFrom": "tests/fixtures/capture-lab/sales-order-typeahead.json",
  "expectedSteps": [{ "target": "New" }, { "target": "Customer Name", "value": "Adatum Corporation" }]
}
```

`events` holds the raw events directly; `eventsFrom` points to a file with an `events` array
instead, as for the capture lab recording.
