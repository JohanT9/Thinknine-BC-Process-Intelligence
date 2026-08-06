# React and Control Add-in Capture 4.6 R3.3

## Executive summary

R3.3 makes event acquisition frame-aware without creating a React-specific
semantic pipeline. Every authorized document frame runs the same isolated
content script, observes browser-facing DOM behavior and reports validated
events to the background coordinator. Review, semantic consolidation,
Language Excellence, Presentation Grammar, Screenshot Intelligence and export
remain unchanged.

Existing recordings that contain no iframe events cannot be repaired. A new
recording is required after rebuilding and reloading the extension.

## Diagnostic findings and current frame boundary

The repository already configured static `all_frames` and `match_about_blank`
injection for `https://businesscentral.dynamics.com/*` and
`https://*.businesscentral.dynamics.com/*`. Dynamic MV3 registration also used
all-frame origin fallback. Static configuration now explicitly uses
`match_origin_as_fallback`, and every injection path loads the same scripts.

The actual URL and origin of the reported React/control-add-in iframe were not
available in the repository or request attachment. It is therefore not claimed
as a verified external origin. No guessed or broad host permission was added.
Development diagnostics now provide frame and parent IDs, sanitized frame/top
URLs, origin, depth, listener state, captured count and failure reason.

## Manifest, identity and security

The content script uses `all_frames`, `match_about_blank` and
`match_origin_as_fallback`. `webNavigation` resolves Chromium's stable
`parentFrameId`; it grants neither page-content access nor additional origins.
Host permissions remain limited to Business Central.

Each frame owns only local DOM observation, current target extraction,
accessible metadata, local bounds and local sequence. The service worker owns
the active session, screenshot scheduling and persistence. It binds browser
supplied `tabId`, `frameId`, `documentId`, URL and origin to events.

Same-origin nested frames and inherited-origin `about:blank`, `data:` or `blob:`
documents are eligible when Chromium resolves their creator to an allowed
origin. A genuinely cross-origin add-in requires explicit authorization of its
exact reviewed origin. The top page never reads a cross-origin frame DOM.

## Messaging and lifecycle

Contract `1.0.0` defines recorder ready, unavailable, interaction event and
stopped messages. The coordinator rejects malformed events, inactive sessions,
stale session IDs, inactive tabs and duplicated source IDs. After a service
worker restart it rebuilds duplicate identity from persisted session events.

An `AbortController` installs interaction listeners once for an active recording
and removes them on stop. The MutationObserver is disconnected at the same
boundary. Declarative MV3 injection handles eligible frames created or reloaded
after recording starts.

## React, Shadow DOM and accessibility

Capture uses DOM events, current values, roles, labels, ARIA names, selected and
checked state and `composedPath()`. It does not inspect React fibers, private
properties or component names. Open Shadow DOM contributes the effective inner
target and safe host metadata. Closed Shadow DOM remains inaccessible by design.

## Ordering, screenshots and coordinates

Events retain capture timestamp, per-frame sequence, frame identity and source
ID. The shared comparator uses these fields for deterministic cross-frame
projection. Persisted `eventNo` remains coordinator commit order so delayed
messages never rewrite already committed screenshot references.

Value-bearing input/change uses the existing screenshot policy. Focusout alone
does not request a screenshot, fields keep independent capture keys and capture
remains the full visible tab.

Events preserve `localBounds` and `topViewportBounds`. Same-origin nested frames
add every frame-element viewport offset. If a cross-origin boundary prevents
measurement, top bounds are `null`; no coordinate is guessed. Cropping is not
introduced in R3.3.

## Performance, failure and verification boundary

There is no frame-tree polling, repeated registration or React DOM scan.
Uninjectable frames cannot submit partial events or stale screenshots, while
normal top-frame recording continues. Diagnostics omit query strings, fragments
and captured customer values.

Automated tests use Business Central-shaped frame events and cover identity,
validation, deduplication, ordering, coordinates, composed paths, screenshot
policy and the semantic/presentation path. Edge and Chrome share the same MV3
source.

Manual verification in the actual affected view remains required. Until its
diagnostic reports injection and a new trace contains its interactions, that
specific external React view must not be described as verified recordable.
