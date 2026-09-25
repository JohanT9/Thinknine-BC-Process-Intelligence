# Knowledge feedback and learning — phase 5 foundation

The existing review command history is the source for knowledge feedback. The learning module scans only commands before each review's `historyIndex`, so undone corrections do not count. It recognizes changes to task type, semantic action, or entity when the same task identity exists before and after a command.

Proposals are grouped by bounded, redacted exact caption patterns. They contain no review IDs, task IDs, event IDs, recordings, screenshots, entered values or user identity. Local correction history already retains the review snapshots; this module derives proposal data on read and does not create a second persisted copy. The existing downloadable process-improvement dataset remains aggregate-only and does not include these caption patterns or proposals.

One matching correction is marked `needs-more-feedback`; two or more matching corrections from active histories produce a `review-ready` proposal. Different corrected outputs for the same pattern produce `conflicting-feedback` and no rule proposal. Source pack/rule/release references are retained when available. Reported confidence is a repetition-count heuristic, not a calibrated probability.

Every proposal has `requiresReview: true` and `autoActivation: false`. This stage does not publish a rule, modify the active knowledge release, send feedback to a server, or train a model. Proposals are available from the separate `knowledge-admin.html` extension page. The popup shows a “Review knowledge suggestions” shortcut only after the licensing service verifies the signed-in Microsoft account's `License.Administrator` app role. Both proposal reads and draft creation repeat that server-side authorization check and verify the extension page origin. Ordinary diagnostics and downloadable process-improvement data omit proposal patterns and drafts.

An explicit “Create draft” action appends the selected candidate to local draft storage. The draft records its source rule references, observation count and heuristic basis; it stays inactive. Draft creation remains separate from a future explicit release-publishing workflow, which is required before a rule affects interpretation.

Administrators can inspect saved inactive drafts and download them as a versioned JSON package for offline review. The export contains the proposed match patterns and classification, provenance, observation count, confidence basis and creation time. It includes no review/session/task identifiers or captured values. Downloading a package does not import, publish or activate a rule.

Before a draft can proceed to a future release workflow, an administrator selects its target knowledge pack. The service worker adds the proposed rule to a cloned copy of that pack and runs the complete active-release importer and validator against the current knowledge release. It reports schema errors and repository warnings, including exact-match/equal-priority conflicts. Validation is recalculated when the admin page opens and never activates or persists a candidate release. A draft remains blocked from any future publish step while validation has errors; warnings remain visible for human review. This check does not claim to detect every possible overlap between regular expressions.

Application administrators receive the `License.Administrator` role through the
existing Entra app-role assignment used by the license admin center. Sign in through
License information first if the popup shortcut is not visible. Role changes take
effect when the current access token is renewed. A local browser setting cannot grant
knowledge administration access.

Technical diagnostics are hidden from the popup and Document Library. The `debug.html` page and its background requests require the separate managed policy `technicalDiagnosticsEnabled: true`; keep it unset or false for regular users and enable it only in support/admin browser profiles when diagnostics are needed.
