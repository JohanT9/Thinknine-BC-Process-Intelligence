# Business Central error capture

BC error capture is active only while `recordingPurpose` is `bug-report`.
Normal documentation recording is unchanged.

## Supported surface and detection

The detector supports browser-observable modal runtime/error dialogs exposing
dialog/alert semantics plus an error signal, assertive live region, or localized
Copy Details action. It combines ARIA roles, modal state, accessible names,
actions and lifecycle; generated CSS classes and English text are not the
primary contract. English, Swedish and Danish labels are recognized centrally.

Inline validation, transient notifications and non-modal panels are not yet
captured automatically. Errors inside supported frames can be captured because
the content script runs in each frame.

## Lifecycle and screenshot

One DOM dialog lifecycle creates one stable evidence identity. Rerenders do not
duplicate it; closing and reopening creates a new occurrence. Evidence may
reference the nearest preceding Canonical Event as a neutral trigger candidate,
not proven causation.

The worker records a dedicated Canonical `bc-error` event and captures a fresh
visible-tab screenshot after the error is observable. It never reuses the
preceding action image. Statuses distinguish missing BC details from recorder
capture failure.

## Copy Details and constraints

Copy Details availability is detected. Text is captured automatically only when
already exposed in accessible DOM. The recorder does not click actions, close
dialogs, request clipboard permission or monitor the global clipboard.

Capture itself transmits nothing. Later optional telemetry, AI, or issue
submission requires a separate explicit user action and never changes captured
evidence. Real BC verification was not possible in this automated workspace;
behavior is verified with sanitized fixtures.
