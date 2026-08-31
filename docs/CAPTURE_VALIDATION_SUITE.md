# Capture validation suite

The Capture Validation Suite is the release gate for the normalized recording
to Step Group and Capture Packet pipeline. It complements isolated unit tests by
running complete, data-driven recording samples through the same production
grouping and integrity contracts.

## Corpus

The versioned corpus lives in
`tests/fixtures/capture-validation/sanitized-recordings.json`. It currently
covers:

- standard Business Central actions and field commits;
- React Control Add-in interaction and result evidence;
- interaction evidence crossing an iframe boundary;
- independent consecutive interactions;
- compatibility grouping for recordings without recorder interaction IDs.

The samples contain synthetic, sanitized metadata shaped like recorder output.
They contain no screenshots or customer values. Consequently, the suite proves
deterministic pipeline behavior against these shapes; it must not be described
as proof from customer production recordings. Sanitized pilot recordings can be
added later without changing the runner contract.

## Release gate

`scripts/capture-validation-suite.js` evaluates each recording twice and fails
when it finds:

- non-deterministic output or input mutation;
- unexpected Step Group counts or kinds;
- unassigned meaningful events;
- invalid Capture Packets;
- unknown or duplicate canonical source ownership;
- unexpected incomplete packets;
- insufficient sample, surface, or packet coverage.

The immutable report includes recording, surface, Step Group, packet,
completeness, integrity-error and source-trace totals. CI currently requires at
least six recordings, four surface types and seven packets. These floors may
only move upward as the corpus grows.

Run the focused gate with:

```powershell
npm.cmd run test:capture-validation
```

The gate also runs in the normal `posttest` chain and therefore in `npm run ci`.

## Adding evidence

Every new sample must state its provenance, surface type, expected group count,
ordered group kinds and whether every packet is expected to be complete. Prefer
adding a regression sample before changing grouping behavior. Validation
detects discrepancies; it never repairs or rewrites source evidence.
