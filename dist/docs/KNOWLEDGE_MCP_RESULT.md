# Knowledge MCP adapter — contract hardening result

Added an MCP adapter with two allowlisted tools: `bc_process_resolve_object` and
`bc_process_resolve_action`. It uses an injected standard MCP client interface,
checks that the host advertises the requested tools, consults local knowledge first,
and returns only validated structured results as unverified suggestions that require
review. Remote confidence is capped at 0.69 and no result can activate a release.

The adapter enforces the exact closed input schemas documented in
[`KNOWLEDGE_MCP_CONTRACT.md`](./KNOWLEDGE_MCP_CONTRACT.md), and the machine-readable
contract is included in `src/engine/knowledge-mcp-contract.schema.json`. It sends
only typed object/app/control references, interface captions and locale. It excludes
recordings, screenshots, entered values, customer data, tenant IDs, environment and
company context. URL, email and long-number-like content is removed from captions.
It requires explicit `consent: true` at construction. The settings panel now has an
off-by-default consent toggle and a connection-check button. Background requests
are restricted to the extension dashboard and are rejected unless the setting is
enabled. The connection check transmits only protocol initialization and the tool
list; no recording or Business Central context is sent.

A separate local stdio server implements the two tools against the validated,
version-controlled product knowledge packs. A Windows Native Messaging proxy and
extension client now connect Edge to that server without opening a network port.
The lookup message is gated by consent, and the adapter sends only the bounded
references, captions and locale described above. No caller in the ordinary
recording flow invokes that lookup message automatically. See
[`services/knowledge-mcp-server/README.md`](../services/knowledge-mcp-server/README.md)
and [`KNOWLEDGE_MCP_NATIVE_BRIDGE.md`](./KNOWLEDGE_MCP_NATIVE_BRIDGE.md).

Remote results stay review-only, have confidence capped at 0.69, and never select a
candidate automatically. An advertised tool is rejected unless its name and closed
input schema match exactly; unrelated tools are ignored.

Validation completed for this change: MCP initialize/list/call protocol smoke check,
both tool schema comparisons against the extension adapter, object and action lookup,
rejection of extra tenant input, extension native-client and consent/sender guard
checks, all eight UI language checks, Node syntax checks, knowledge-pack import
validation, lint and extension build. The .NET Native Messaging proxy could not be
compiled in this environment because the .NET SDK is not installed, and no host was
registered. The live Edge-to-server connection remains unverified until that host
is built and registered for the installed extension ID.
