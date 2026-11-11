# BC Process Studio 4.7 product identity

BC Process Studio  is Business Process Intelligence for Microsoft Dynamics 365 Business Central.

**Turn Business Central processes into knowledge.**

**Capture. Document. Improve.**

## Module vocabulary

- BC Process Recorder — implemented recording capability.
- BC Review Studio — implemented review and editing workspace.
- BC Document Generator — implemented documentation and Word output.
- BC Knowledge Base — implemented local document library and reusable knowledge surface.
- BC Process Maps — discontinued in 4.7.249; the unreleased process map was removed from the code.
- BC Process AI — future broader product area.

The module names are internal vocabulary for documentation and planning. Since 4.7.249 the interface shows one product name, BC Process Studio: the toolbar popup, its tooltip and the diagnostics page no longer say BC Process Recorder, and the library is headed by its own translated name rather than BC Knowledge Base.

## Compatibility rename map

User-facing `Thinknine BC Process Intelligence`, `Thinknine BC Recorder`, and current uses of `Documentation Excellence` become `BC Process Studio` or the contextual module name. Historical release notes retain their period-correct names.

The npm package name, extension ID/listing identity, storage prefixes, global `T9*` namespaces, URLs, environment variables, schema versions, fixture filenames and built-in theme ID `thinknine` remain unchanged. They are technical compatibility contracts, not current product branding.

Newly generated Word files use restrained `BC Process Studio` generator metadata and footer attribution. Existing documents and persisted data are not rewritten.
