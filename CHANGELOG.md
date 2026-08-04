# Changelog

## 3.7.3

- Fixed DOCX files that Microsoft Word could not open.
- Preserves actual screenshot MIME type from Edge.
- Detects PNG and JPEG from both MIME metadata and binary signature.
- Stores images with the correct file extension in the DOCX package.
- Adds correct image Content-Type declarations.
- Adds JPEG dimension parsing.
- Added mixed PNG/JPEG DOCX regression tests.


## 3.7.2

- Fixed dashboard startup crash caused by missing `exportWordReview` element.
- Restored the Exportera Word button in Review Studio.
- Made the Word button event binding defensive.
- Added automated HTML/JavaScript ID consistency regression tests.
- Restored settings and session loading by preventing the startup script crash.


## 3.7.1

- Fixed dashboard startup regression.
- Restored loading of environment name and maximum event count.
- Restored session list loading.
- Added guarded sequential dashboard initialization.
- Added defaults fallback when stored settings are missing or unreadable.
- Added explicit empty-session state.
- Hardened background responses for settings and sessions.
- Added dashboard regression tests.
- Word Generator remains unchanged.


## 3.7.0

- Added professional Word DOCX generator.
- Added Exportera Word button in Review Studio.
- Generates cover page, metadata table and table of contents field.
- Generates purpose, prerequisites and reviewed workflow.
- Embeds selected screenshots in the DOCX.
- Includes step comments, expected result and version history.
- Adds Thinknine styling, header, footer and page number fields.
- Word export uses the reviewed task model, not raw events.
- Added browser-compatible ZIP writer.
- Added automated DOCX package tests.


## 3.6.2

- Connected Review Studio visibly to the Sessions page.
- Added a visible Granska button for completed sessions.
- Added a minimal Review Studio overlay.
- Added editable instruction text and approval checkbox.
- Added save and close actions.
- Ensured Review Studio runtime script is loaded in the dashboard.


## 3.6.1

- Made `dist` the permanent Edge development folder.
- Build now synchronizes runtime files from `src`.
- Manifest version is generated from `package.json`.
- Added `VERSION.txt` generation.
- Added Windows build-and-open helper script.
- Build output now prints the exact Edge extension folder.


## 3.6.0

- Added Review Studio.
- Added per-session review storage in Edge.
- Added editable instructions and comments.
- Added approve/unapprove per step.
- Added move up/down.
- Added add/remove manual steps.
- Added review completion and progress.
- Added screenshot previews.
- Added Review button to completed sessions.
- Added review.json model foundation for Word/PDF generation.
- Added Review Studio unit tests.


## 3.5.1

- Added GitHub Actions CI.
- Added automatic tagged release workflow.
- Added dependency-free linting.
- Added Edge ZIP release script.
- Added EditorConfig and Git attributes.
- Added bug and feature issue templates.
- Added pull request template.
- Added project roadmap.


## 3.5.0

- Reorganized project into a git-ready source/dist structure.
- Added modular Noise Filter.
- Added Entity Memory.
- Added Session Graph.
- Added Confidence Engine.
- Added modular Documentation Engine.
- Added Node-based build script.
- Added unit tests with no external dependencies.
- Added session-graph.json and confidence-report.json.
- Kept Edge-only distribution as the primary product path.
