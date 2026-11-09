# Document Library 4.5

## Purpose

Document Library makes completed documentation recognizable and retrievable by
meaning rather than filename. It is a local knowledge workspace, not a file
explorer, document management system or renderer.

## Architecture and data ownership

`document-library.js` is a browser/CommonJS domain module. It normalizes
versioned records, preserves unknown future fields, builds searchable text once,
combines filters, provides deterministic sorting and grouping, and owns logical
selection movement. All returned domain values are recursively immutable.

`document-library-view.js` renders accessible cards, empty state, profile groups
and metadata preview. `dashboard.js` composes the modules with existing session
navigation. `background.js` persists the collection under the shared storage
key defined by `storage-keys.js`.

Each record references an existing documentation project through stable
`projectId` and `sessionId`. It may contain title, profile and theme summaries,
dates, author, qualitative Document Health, tags, favourite/recent state,
reading-time estimate, thumbnail reference, workflow and section names. The
library stores metadata only. It never stores Review state, Semantic Document,
planner state, Word structures, renderer state or screenshot bytes.

## Search, filtering and sorting

Search updates on every input and uses a precomputed, accent-insensitive corpus
covering title, profile, theme, tags, scalar metadata, workflow and section
names. Profile, theme, health, favourite, recently used, creation date and
modification date filters compose with AND semantics. Results sort by modified,
created, title, recently opened, profile or health and may be grouped by profile.

The baseline record comes from lightweight session metadata already requested
by the dashboard. Richer section, profile, theme and health summaries are
materialized only after Document Workspace has already run its normal pipeline.
Opening or searching the library never loads Review, builds Semantic Document,
runs Planner, prepares screenshots or renders Word.

## Preview and activity

Selection renders only indexed metadata: title, profile, health, summary,
workflow, recent activity and positive confirmations. Opening a card marks its
metadata as recently used, then loads the existing Review flow on demand.
Favourites are independent metadata flags and do not alter source documents.

## Document Health and Celebrate Progress

Library health is a qualitative snapshot of the existing advisory
Documentation Intelligence result. No numeric score is introduced and no
second diagnostics pass occurs. Existing positive profile confirmations such
as complete workflow, screenshots and accessibility are retained so browsing
reinforces completed work as well as remaining suggestions. Documentation
Intelligence remains advisory.

## Accessibility

The controls use native search, label, select, date and checkbox semantics.
Results are a named listbox with option cards, one roving tab stop and
Arrow/Home/End navigation. Selection and favourite state use `aria-selected`
and `aria-pressed`; result counts and preview changes are announced politely.
Focus indicators remain visible in forced colors and no interaction depends on
motion. Card actions remain native buttons.

## Performance and compatibility

The initial path loads the session list plus one metadata collection. Search
does not inspect project data and preview performs no storage read. A behavior
test indexes and searches 10,000 records within a conservative local budget.
Existing sessions without library metadata receive safe defaults and require no
migration. Records for deleted sessions are omitted because the library only
references existing projects.

## Known limitations

- Data is local to the extension; there is no cloud service, sharing or
  collaboration. Documents are moved to another computer with an export file
  (see Moving documents to another computer) or kept alike on several computers
  through a folder that a file service syncs (see Syncing through a folder).
- Tags, author and thumbnails can be displayed/indexed but do not yet have a
  dedicated metadata-editing workflow.
- Health and section metadata remain minimal until Document Workspace has been
  opened for that project.
- Quick Preview is metadata-only and deliberately does not preview screenshots
  or the full document.
- There is no version control or AI search.

## Batch Operations (UX7)

Cards expose native selection checkboxes and retain stable selected IDs when
the result order or active filters change. Shift selects a visible range;
Ctrl/Cmd toggles; Ctrl/Cmd+A selects all current matches; Space toggles the
focused card; Escape and Clear Selection remove the selection. The contextual
toolbar exists only while at least one document is selected.

Favourite, tags, profile, theme, author, status and archive changes operate on
normalized library metadata. The metadata dialog changes only fields whose
checkbox is explicitly selected. Archive is reversible metadata. Delete removes
the referenced local sessions and is therefore permanent and confirmed.

Batch Word export creates a metadata-only export intent. Dashboard resolves
each reference sequentially through the existing Word pipeline and never keeps
multiple Review objects loaded. Progress is announced; the user may cancel in
the preflight confirmation before processing begins. Export never mutates a
document.

## Moving documents to another computer

Export in the library heading writes a file with the whole library, the folder
shown with its subfolders, or the selected documents. Import reads such a file
on another computer. Nothing is sent anywhere; the user moves the file.
`document/library-transfer.js` holds the format and the rules; the dashboard
only reads and writes the file and shows the result.

- **Content.** A document is every stored entry of its recording: the session,
  raw and canonical recordings with their events, screenshots, review and
  progress, error evidence, test runs and bug reports, plus its library record.
  Entries are copied unchanged, including fields this version does not know, so
  nothing is regenerated or reinterpreted. Settings, licenses, language
  preferences and other documents are never part of the file. The file can
  contain customer data from Business Central; the export dialog says so.
- **Format.** A gzip-compressed text file (`.bcps`) with one JSON object per
  line: a header (format `bc-process-studio-library`, format version 1, export
  time, extension version, scope and the folders the documents need), then per
  document an item line, its entry lines and an item end with the entry count
  and a SHA-256 digest of its entries, and finally an end line with the totals.
  The export and the import process one line at a time, so a large library is
  never held in memory as one string.
- **Checks.** A file with another format, a newer format version, a missing end
  line, a wrong count or digest, or an entry whose key does not belong to the
  document it is listed under is refused before anything is written. An entry
  belongs to a document by its key (`t9_session_<id>`,
  `t9_recording_<id>:event:…`, `t9_screenshot_blob_<id>:…` and so on) or, for
  error evidence, test runs and bug reports, by the document its value names.
- **Preview.** The import shows how many documents are new, already here and
  unchanged, already here with other content, or being recorded now (never
  changed). Content is compared by digest with object keys sorted, and the
  library record without the time it was last opened, so the same document is
  not reported as changed because its fields were stored in another order.
  Documents that differ are kept by default; Replace them takes the file's
  version.
- **Folders.** A folder in the file maps to the same folder here, otherwise to a
  folder with the same name in the same place, otherwise it is created. Only
  folders the imported documents are in are created; a folder that would be
  deeper than allowed takes its documents to the folder above.
- **Undo and recovery.** Before anything is replaced, its entries are copied to
  `t9_library_import_undo_entry_*`, and `t9_library_import_undo` records the
  import. A write that fails at any point puts everything back. The latest import
  can be undone from the notice in the library until it is kept or another
  import is made; undo removes the imported documents and restores the replaced
  ones, including changes made to them since. An import interrupted by closing
  the browser is offered for restoring on the next start.
- **Export result.** The export reports the file as saved only when the browser
  reports the download complete; a cancelled or failed download is reported as
  not saved.
- **Usage statistics.** An import writes stored entries directly and sends no
  usage statistics.
- **Not included.** This is a manual transfer, not synchronization. A document
  deleted on one computer comes back when an older file is imported. There is no
  merging of two versions of the same document; one of them is kept. Syncing
  through a folder (below) carries deletions and asks about conflicts.

## Syncing through a folder

Sync in the library heading keeps the library alike on several computers
through a folder that is already synced between them, for example an empty
folder in OneDrive. The user chooses the folder with the browser's folder
picker on each computer. BC Process Studio writes and reads files in that
folder only; the service that syncs the folder moves them between computers.
`document/library-sync.js` holds the format and the rules; the dashboard keeps
the folder handle, asks for permission and shows the result.

- **Privacy.** The extension sends nothing itself and contacts no service. The
  files contain the same document entries as an export file (recordings,
  screenshots, reviews, evidence), which can include customer data from Business
  Central; the sync dialog says so. Whoever can read the folder can read the
  documents. Settings, licenses, language preferences and the sync state are
  never written to the folder. Syncing sends no usage statistics.
- **Folder layout.** Each computer writes only its own manifest,
  `devices/device-<id>.json` (format `bc-process-studio-sync`, format version
  1), listing the version, file, title and change time of each document it has
  and the documents it has deleted, plus its folder tree. Document files are
  `documents/<sha256(id)>/<version>.bcps` in the export file format and are never
  overwritten: a new version is a new file. A version is a SHA-256 of the
  document's entry digest and its library record, so the same content gives the
  same version on every computer. Files that are not named like a manifest, and
  copies a service makes of a manifest under another name
  (`device-…-LAPTOP.json`), are ignored; a manifest that cannot be read (one a
  service is still writing, for example) is counted as unreadable. A file no
  manifest names is removed when this computer has seen it unnamed for seven
  days and it was written more than seven days ago, but not while any manifest
  is unreadable, since it may name the file. The file's own time is not enough:
  a service may deliver an old file before the manifest that names it. When a
  file of this computer's is missing from the folder, the next sync writes it
  again.
- **Comparing.** Each computer keeps, per document, the version it had and the
  version the folder had at its last sync (`t9_library_sync_state`). The folder's
  version is the newest entry by change time across all manifests, including
  what this computer last saved. Changed only here: saved in the folder. Changed
  only elsewhere: fetched. Changed the same way on both: nothing to do. Changed
  differently on both, or changed on one and deleted on the other: a conflict.
  Deleted elsewhere: removed here only when the user lets it. A file named in a
  manifest that has not arrived, cannot be read or does not hold the listed
  version is waiting and is fetched on a later sync. The library is read again
  from storage before it is compared, since another tab may have changed it. The
  document being recorded, the one open for review in this tab and a document
  stored here but missing from the library list are left as they are, so that an
  out-of-date list never deletes a document on the other computers. A document
  changed here between comparing and writing (in another tab, say) is neither
  replaced nor removed; it is compared again on the next sync. Folders are merged per folder: a rename or new
  folder on either computer survives; a folder changed on both keeps this
  computer's. The newest folder list decides which folders there are, and a
  folder another computer changed after that list was made counts with its
  newer name and place.
- **Change times.** A new version or deletion is stamped later than the folder
  version it replaces, also when another computer's clock is ahead, so that a
  decision such as Keep this computer's versions holds.
- **Decisions.** Conflicts offer Decide later (default), Keep this computer's
  versions and Use the versions from the other computer. Decide later syncs
  everything else and leaves those documents as they are on both computers.
  Documents deleted on another computer are listed with Delete them here too.
  The automatic sync when the library opens never deletes and never decides a
  conflict; the status beside the library heading then says the sync is waiting for a
  decision. While an import can still be undone, the automatic sync also fetches
  nothing (that would replace the import's undo); it saves this computer's
  changes and waits. When Sync is chosen after a decision, the library is
  compared again; if what needs a decision changed meanwhile, it is shown again
  instead of being applied.
- **Order and recovery.** Document files are written first, then fetched and
  removed documents are written here like an import (undo copies, rollback on a
  failed write), then this computer's manifest, then its sync state. The latest
  sync that fetched or removed documents can be undone from the library notice;
  the restored versions then count as changes here and the next sync saves them
  in the folder. Undo puts back the folders the sync changed; folders created
  or changed after it stay. A sync refuses to start while an interrupted import
  or sync still has to be restored. Sync, import, undo and keep share one Web
  Lock, so only one of them writes at a time.
- **Permission.** The folder handle is kept in IndexedDB
  (`bc-process-studio-library-sync`). The browser may ask again for access to
  the folder after a restart; the automatic sync then does nothing and the
  status asks the user to choose Sync. Disconnect forgets the folder and what
  was compared with it but keeps the computer's id, so its own manifest is
  replaced when it connects again; the files in the folder stay. A sync state
  saved by a later version is neither used nor overwritten.
- **Compatibility.** A manifest from a newer format version stops the sync before
  anything is written. Browsers without the File System Access API do not offer
  the folder; Export and Import still work there.
- **Limitations.** Syncing happens when the library opens and when the user
  chooses Sync now, not in the background. Comparison is per document: two
  computers that change the same document get a conflict, never a merge of the
  two. Every sync reads and hashes all local documents to compare them, which
  takes longer for a large library. The sync was tested with a
  folder in the browser's private file system standing in for a synced folder,
  not with OneDrive itself; how quickly and in what order a service delivers the
  files is up to the service, and files that have not arrived wait.
