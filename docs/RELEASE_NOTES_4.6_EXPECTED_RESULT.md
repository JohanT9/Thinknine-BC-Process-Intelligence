# Documentation Excellence v4.6 - Editable expected result

Consultants can now edit **Förväntat resultat** in Granskning under
Dokumentinformation. The change is autosaved, participates in Undo and Redo,
and is immediately used by both Dokumentvy and Word export.

The reset action removes the manual override and restores the standard expected
result. Existing recordings and Reviews need no migration. Reviews containing
the historical top-level `expectedResult` property remain compatible.

The editable value is stored as `Review.documentFields.expectedResult`.
Recorded events, generated steps, screenshots, and annotations are not modified.
Review Projector remains the only Review-to-Semantic-Document translation
boundary, so renderers receive the same validated Document Plan as before.
