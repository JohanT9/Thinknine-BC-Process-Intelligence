# BC Process Studio read-only Knowledge MCP server

This local MCP server exposes exactly two tools: `bc_process_resolve_object` and
`bc_process_resolve_action`. It reads the validated, version-controlled knowledge
packs in this repository and can add separately maintained records from
`knowledge-packs/official-pages.json`. Records whose page IDs already exist in
the extension's bundled catalog are suppressed to prevent conflicting duplicate
identities. The initial six-page Microsoft Learn pilot has since been promoted to
the bundled `bc-standard-pages` pack, so those standard identities are resolved
locally by the extension. The server has no write tools, database connection,
HTTP listener, tenant authentication, or dependency on a specific Business
Central environment.

## Requirements and run

Use Node.js 20 or later. From the repository root:

```powershell
npm ci --prefix services/knowledge-mcp-server
npm start --prefix services/knowledge-mcp-server
```

The server uses MCP stdio transport: the MCP host starts it as a child process and
communicates over stdin/stdout. Standard output is reserved for protocol messages.

An MCP host configuration generally points its local server entry to Node and the
absolute path to `services/knowledge-mcp-server/src/server.js`. The exact settings
file depends on the host. Keep the checkout and its installed server dependencies
available to the host.

## Scope and privacy

The server only searches versioned product metadata. It does not read a customer's
BC tenant. The accepted inputs are bounded object/control
references, interface captions and locale. The result includes candidate identity,
confidence and pack provenance. No recording, screenshot, tenant, environment,
company, record value, credential or write operation is accepted by either tool.

The extension adapter requires explicit consent and marks every remote result as
an unverified suggestion with confidence capped at 0.69. New catalog entries must
include source and verification notes; add them to the MCP-only supplement, not the
extension pack index, unless they are ready to ship to every extension user. The
installed native host launches this stdio server through Edge Native Messaging.

## Verify

```powershell
npm run check --prefix services/knowledge-mcp-server
```

The smoke check starts the server, performs MCP initialization, verifies the exact
two advertised tool schemas against the extension contract, proves that page 22 is
absent from the bundled extension catalog but resolvable through MCP, checks its
source and review gate, and calls both object and action tools.
