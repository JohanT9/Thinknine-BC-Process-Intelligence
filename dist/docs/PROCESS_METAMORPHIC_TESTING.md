# Process metamorphic stability testing

The metamorphic corpus derives evidence-preserving recording variations from
every approved end-to-end scenario. It checks that browser timing, frame
metadata, future metadata, focus noise, unchanged field events and duplicate
field input do not change the final business tasks.

Run it with:

```bash
npm run scenarios:process-metamorphic
```

Every variant must preserve task type, instruction, observed action and field
captions, selected value, screenshot, result status and recording guidance.
Meaningful events must remain assigned to a documented task or an explicit
supporting-event classification.

Add new transformations when a real recording differs from the sanitized
corpus without changing the user's business intent. Add a new base scenario
when the intended business result itself is different.
