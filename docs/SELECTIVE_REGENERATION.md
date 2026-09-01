# Selective regeneration

Review Studio can regenerate only the Steps selected by the consultant. The
command is available under **More actions** when at least one Step is selected.
It uses the same inspect-before-apply dialog and stale-preview protection as
full regeneration.

## Safety contract

Selective regeneration is permitted only when every selected generated Step
has an exact one-to-one evidence mapping to the latest interpretation. The
operation:

- replaces only the selected generated content and screenshot candidates;
- preserves stable Review Step identity, order and hierarchy ownership;
- preserves safely mapped consultant text, rich text and comments;
- shows a changed generated baseline separately when a consultant edit masks
  the new standard wording;
- leaves every unselected Review and generated Step unchanged;
- records one undoable Review command, including the generated baseline;
- aborts when the Review changes after preview.

The preview blocks selective apply when the selection includes a merge, split,
removal, manual/missing Step or approved Step. It also blocks a screenshot
change when the current selected image has annotations. The consultant can then
use full regeneration to inspect the structural change, remove approval, or
change the image manually.

Selective regeneration never interprets a partial mapping as permission to
change neighbouring Steps. No blocked preview mutates the Review.
