# Release Notes — Documentation Excellence 4.6 R3.3

New recordings can collect interactions from authorized Business Central iframe
documents through one frame-aware recorder contract. React and open Shadow DOM
controls are observed through standard DOM events and accessible metadata.

The update adds stable frame identity, duplicate and stale-message rejection,
nested same-origin coordinate normalization, sanitized frame diagnostics and
correct screenshot association for value-bearing input/change events.

Host permissions remain restricted to Business Central. The precise origin of
the reported external control-add-in has not been supplied or manually verified,
so no external origin was guessed. If diagnostics show another origin, it must
be reviewed and explicitly authorized before support can be claimed.

Existing completed recordings without iframe events cannot be repaired. Reload
the rebuilt extension and make a new recording. No browser security boundary is
bypassed. Edge and Chrome use the same source. Closed Shadow DOM and unauthorized
cross-origin frames remain limitations.
