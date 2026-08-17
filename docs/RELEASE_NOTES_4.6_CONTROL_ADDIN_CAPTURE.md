# Documentation Excellence v4.6 - Control add-in capture reliability

React and Business Central control-add-in interactions no longer depend on the
top frame receiving recording-state messages. Every injected frame observes the
durable recording state, including frames that existed before recording began,
frames mounted later, and frames surviving a service-worker restart.

Editable controls use native capture-phase browser events. If a framework does
not deliver a usable `input` or `change` commit, a changed observable value is
captured when focus leaves the control. An identical native commit suppresses
the fallback, and an unchanged focus session emits no field-change event.
Observation begins at `window` so a React application handler above `document`
cannot prevent the recorder from seeing supported native interactions.

The debug panel can enable temporary capture diagnostics showing frame presence,
events observed, policy decisions, delivery, Raw Event persistence, and Canonical
append. Diagnostics store only sanitized shape and identity metadata. Entered
business values and URL query strings are excluded.

No new host permission was added. Business Central frames and inherited-origin
`about:blank` frames are supported. An external-origin add-in requires its exact
origin to be verified before a narrow host permission can be considered. Closed
Shadow DOM cannot be inspected by an extension content script. This milestone
was verified synthetically against a real-shaped Material UI date input; the
actual affected customer view was not available for manual verification.

The non-host `webNavigation` permission provides a browser-owned frame inventory
for diagnostics. It does not permit capture on additional origins.
