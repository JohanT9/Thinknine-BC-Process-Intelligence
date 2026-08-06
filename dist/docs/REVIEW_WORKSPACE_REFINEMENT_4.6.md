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

## Accessibility and responsive behavior

- Native toolbar, group, details and summary semantics are retained.
- Escape restores focus after closing More Actions.
- High-contrast mode reinforces cards, disclosure boundaries and selected/editing
  outlines with system colors.
- Reduced-motion mode continues disabling transitions and animation.
- On narrow viewports, More Actions becomes a bounded bottom panel and Review
  cards use a single content column with wrapping actions.

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
