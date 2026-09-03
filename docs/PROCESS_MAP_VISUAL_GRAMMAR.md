# Process Map Visual Grammar

BC Process Studio uses one renderer-neutral visual grammar to make semantic
process maps easier to scan without changing their meaning.

The grammar resolves a ProcessGraph node's canonical type and returns semantic
presentation intent: `kind`, `shape`, `tone`, and a localized type label. It
uses structured node metadata, including the preserved `originalNodeType`; it
does not guess a type from captions or screenshots.

Current presentation:

- business processes use a rounded, branded container;
- process steps and recorded actions use a neutral rectangle;
- documents and posted documents use blue and green document treatments;
- posting actions use an emphasized amber treatment;
- decisions retain their diamond marker and decision tone;
- system actions use a dashed purple treatment;
- manual actions use a warm accent and distinct asymmetric border;
- status, data entity, external system, start, and end have dedicated shapes.

Semantic comparison status remains a separate dimension and continues to be
shown through the Observed, Reference suggestion, and Customer-specific badges.
This prevents visual type from being confused with analysis confidence.

The HTML view consumes the grammar today. Future SVG, BPMN, draw.io, PDF, and
Visio renderers can consume the same intent without importing CSS or UI code.
