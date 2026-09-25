# Knowledge MCP contract — phase 3 foundation

`src/engine/knowledge-mcp-adapter.js` exposes `BCKnowledgeMcpAdapter` in browser
and Node contexts. The machine-readable input/output contract is
[`src/engine/knowledge-mcp-contract.schema.json`](../src/engine/knowledge-mcp-contract.schema.json).
The adapter accepts an injected MCP client with `listTools()` and
`callTool({ name, arguments })`; the adapter does not create a connection, select
a server, store credentials, or transmit data by itself. A host client supplies
the transport and authentication.

## Supported tools

| Tool | Input | Purpose |
|---|---|---|
| `bc_process_resolve_object` | Object type and ID, optional app ID/version, product family and locale | Suggest identity metadata for a locally unresolved object. |
| `bc_process_resolve_action` | Resolved page object reference, optional control ID/automation ID, page/action/field captions and locale | Suggest an action for a locally unresolved page-scoped action. |

Tool input schemas must use closed JSON objects (`additionalProperties: false`)
and match the declared properties and required fields. `bc_process_resolve_object`
requires `objectType`, `objectId` and `productFamily`; optional fields are app ID,
app version and locale. `bc_process_resolve_action` requires `objectRef`,
`controlRef` and `context`; those contain only typed object/control references and
bounded page, action and field captions. The client refuses a tool whose advertised
schema is broader, narrower or structurally different. Extra MCP tools are ignored.

Calls are made only when the adapter is constructed with `consent: true`; otherwise
it returns `external-lookup-not-approved`. This consent must come from an explicit
user action in the host product flow. There is currently no such host flow wired
into BC Process Studio, so no MCP request is made by the application.

Payloads omit recordings, event history, screenshots, entered values, tenant IDs,
environment/company names, URLs and customer data. URL, email and long-number-like
content is stripped from interface captions before any call. Product family and
object type are allowlisted; locale is validated. The adapter sends no request when
there is no exact object ID. Local resolved or ambiguous results take precedence
and are not sent to MCP.

## Response and trust boundary

Tools return schema-conforming `structuredContent` with `status` (`resolved`,
`ambiguous`, or `unresolved`) and up to ten candidates. Every candidate needs a
stable candidate ID, typed identity/action fields, confidence in `[0,1]`, and source
ID/version provenance. Free-form text is ignored. Malformed responses become
`unresolved` diagnostics. The MCP tool input schema is checked before a call and
the structured response is validated after it; this follows the MCP tools contract
for JSON Schema input and structured output.

Every accepted remote result is returned with `status: "suggested"`, no selected
candidate, `requiresReview: true`, and `source: "mcp-unverified"`. Confidence is
capped at 0.69. This result cannot activate a knowledge rule or replace a process
classification until a later, explicit review and publishing flow accepts it.

## Server choice and deployment boundary

The official Business Central MCP server is designed to expose the APIs configured
in a specific BC environment. Its connection includes tenant, environment and
company context, and its available tools can include record access or configured
write operations. That is not the same as this contract's tenant-independent
knowledge catalog lookup. See Microsoft's [MCP overview](https://learn.microsoft.com/en-us/dynamics365/business-central/dev-itpro/ai/mcp-overview)
and [configuration guide](https://learn.microsoft.com/en-us/dynamics365/business-central/dev-itpro/ai/configure-mcp-server).

For this integration, select or build a dedicated read-only knowledge MCP server
that implements the two exact tool names above and uses public/approved product
metadata. It must not receive a BC tenant ID, environment, company, credentials,
record values or process evidence. The current adapter remains transport-neutral;
the MCP 2026-07-28 protocol and its client authentication are supplied by the
future host integration. See the official [MCP tool contract](https://modelcontextprotocol.io/specification/2026-07-28/server/tools).

A separate local stdio MCP server now implements the two tools using the validated,
version-controlled knowledge packs. See
[`services/knowledge-mcp-server/README.md`](../services/knowledge-mcp-server/README.md)
for setup and its protocol smoke check. It has no tenant connection or write tools.

The browser extension still has no MCP process host or transport. The server can be
started by an MCP-capable local host, but the extension makes no live external
requests until a host bridge or separately secured HTTP host integration is built
and an explicit consent flow is wired.
