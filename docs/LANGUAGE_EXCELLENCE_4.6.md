# Language Excellence 4.6 R1

## Executive summary

Language Excellence improves generated instructions without interpreting or
changing their meaning. Existing recordings and Reviews automatically benefit;
no migration or new recording is required.

## Architecture

The renderer-neutral layer receives a validated Semantic Document and a Document
Profile language contract. It returns a new, immutable Semantic Document before
theme resolution and planning. Review Projector remains the only Review-to-
document translator, and Word and Document Workspace remain plan-only consumers.

The source Semantic Document is retained unchanged for profile variants. Results
are cached by immutable document revision and profile tone. Language processing
does not access or persist Review, history, screenshots or annotations.

## Deterministic style guide

The guide favors concise imperative instructions and canonical action verbs:

| Intent | Swedish | English |
| --- | --- | --- |
| Select a control | Välj | Select |
| Choose an action | Välj | Choose |
| Navigate/open | Öppna | Open |
| Confirm a state | Verifiera | Verify |

Safe phrase-level rules operate only at the beginning of known prose fields.
Names such as Business Central pages and controls are retained verbatim. Unknown
future block types pass through unchanged. The layer does not guess, summarize,
add explanations or remove process information.

## Profile integration

- Business Process: professional
- Standard Operating Procedure: precise
- Training Guide: explanatory
- Quick Reference: concise
- Troubleshooting Guide: diagnostic

Profiles select tone; they do not own writing rules. A profile can influence a
safe canonical expression but cannot add facts or change workflow intent.

## Accessibility and performance

Short, predictable imperatives reduce reading effort and improve screen-reader
comprehension. There is no additional UI or keyboard interaction. Immutable
results are reused for an unchanged document revision and profile, while a new
Review revision naturally creates a new source identity.

## Compatibility and boundaries

- Existing recordings require no migration.
- Existing Reviews remain fully compatible.
- Semantic meaning is preserved.
- Language Excellence improves wording only.
- Word export behavior remains unchanged apart from improved wording.
- Review history, order, IDs, source references, media and annotations are intact.
- No AI-generated content is introduced.

## Verification

Behavior tests cover Swedish and English terminology, active imperative wording,
conciseness, profile tone, old Review input, future fields, unknown block kinds,
immutability, deterministic output, cache reuse and planner compatibility.

## Production assessment

R1 is production ready. The complete regression suite, accessibility checks,
DOCX parity tests, lint, production build, generated JavaScript syntax checks
and diff integrity checks pass. No blocking issue remains.
