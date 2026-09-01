# Documentation Excellence v4.6 R4 — Review Workspace Refinement

## Design principles

R4 applies Workflow Before Features, User Value First, Progressive Disclosure
and Consistency Over Cleverness. It adds no document or Review capability. It
reduces the attention required to operate existing capabilities.

## Toolbar philosophy

The visible toolbar contains the commands used repeatedly during normal review:
Undo, Redo, Save and Word export. Review and Document View remain the persistent
workspace tabs. Merge, Split, Move Up, Move Down, Compress All, Add Step and
Complete Review retain their existing command IDs and state but live under More
Actions.

The disclosure uses native semantics, exposes expanded state, closes with
Escape and restores focus to its summary. Arrow, Home and End navigation use the
same toolbar binding across visible and disclosed controls. Tab and Shift+Tab
retain native document order.

## Editing model

Enter and double click begin inline editing. While editing an instruction,
Enter inserts a line break, Ctrl/Cmd+Enter commits, Escape cancels and focusout
commits as before. Single-line comments still commit with Enter. The editor now has
more padding, a professional line height, vertical resizing and a stronger
focus-visible state. Nearest-position scrolling plus focus without browser
scrolling keeps the current step stable.

## Annotation workflow

Rectangle, Arrow and Delete remain immediately visible beside the image.
Selection and accessible live feedback are unchanged. Numeric geometry controls
are an advanced precision tool and therefore appear under Exact Position and
Size. This removes technical fields from the normal draw-select-confirm flow.

## Navigation and visual hierarchy

The sticky header preserves access to primary actions in long Reviews. Current
step selection retains its strong outline. Instruction text receives more space
than technical metadata. Screenshots and annotations remain within their step,
and status stays in the header without competing with primary commands.

Step states use a restrained, consistent grammar: neutral for not reviewed,
amber as a narrow attention accent, green as a narrow approved accent, and teal
focus/selection outlines. Every state is also written as a visible badge and in
the card's accessible name, so colour is never the only signal. Reversible Hide
is visually neutral; red remains reserved for errors and permanent destructive
actions. Card spacing, numbering, labels and instruction typography follow the
shared design-system scale.

## Step action hierarchy

The normal Step surface now keeps instruction editing and approval immediately
visible. Move, Add after, Change image, Reset text, Hide, manual deletion and
per-Step Compact/Expand are grouped under one native **More actions** disclosure.
The disclosure closes after an action, on focus leaving the menu, or with Escape;
Escape returns focus to the summary. Technical confidence, provenance and rule
metadata are independently disclosed under **Technical information**.

This changes presentation only. Command identity, Review history, autosave,
keyboard movement and document output remain unchanged.

## Accessibility and responsive behavior

- Native toolbar, group, details and summary semantics are retained.
- Escape restores focus after closing More Actions.
- High-contrast mode reinforces cards, disclosure boundaries and selected/editing
  outlines with system colors.
- Reduced-motion mode continues disabling transitions and animation.
- On narrow viewports, toolbar More Actions becomes a bounded bottom panel and
  Review cards use a single content column. Per-Step secondary actions remain in
  their compact anchored disclosure.

## Performance

R4 introduces no observers, polling, document transformations or additional
workspace rendering. Disclosure and responsive behavior are native HTML/CSS.
Editor scrolling occurs only when editing begins.

## Consultant value

- Faster: Save, history and export require no visual search.
- Easier: related structure commands are grouped and keyboard reachable.
- Clearer: writing, screenshots and current selection dominate the hierarchy.
- Less distracting: rare structure, maintenance and numeric annotation controls
  no longer compete with everyday work.
# Guided review navigation (4.7)

Review Studio exposes **Next unreviewed** in the primary toolbar. The command
starts after the active Step, skips approved Steps and wraps once through the
visible review order. The target becomes the active selection, receives focus
and is scrolled into view. `Alt+N` provides the same workflow from the keyboard;
the control is disabled when every visible Step is approved.

## Compact Process Overview (4.7)

The Process Overview is a synchronized navigation aid rather than a second
editor. Compact nodes expose Step order, title and review state. Selecting a
node activates its stable Review task identity; changing the Review selection
updates and horizontally reveals the matching node. Detailed routes and
observed state changes are rendered once in the selected-node detail panel.

## Document Library scanning (4.7)

The default library surface prioritizes search and sorting. Profile, language,
theme, favourite, recent and date constraints use one progressive disclosure.
An active count keeps hidden filter state visible, and Reset Filters clears
constraints without clearing the search query or the user's grouping choice.
Cards preserve all actionable metadata while using a compact reading order.

## Recording completion handoff (4.7)

The popup preserves the recording while the stop dialog is open and names each
outcome explicitly. A successful process stop returns the stable session ID;
the primary completion action opens `dashboard.html?openReview=<sessionId>`.
Dashboard initialization resolves the ID only after its local session/library
state is loaded, removes the one-time query parameter and opens the matching
Review. Missing or active sessions fail safely without guessing another Review.
