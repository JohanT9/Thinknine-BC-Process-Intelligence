# Local Knowledge MCP bridge

The extension uses Edge Native Messaging to start a small local bridge. The bridge
starts the read-only stdio MCP server and forwards only MCP protocol messages for
the two allowlisted knowledge tools. It opens no network port. Edge's host manifest
allows only the configured BC Process Studio extension ID.

No lookup occurs merely because someone records or uses Business Central. The
setting `knowledgeMcpEnabled` is off by default. The connection check sends only
MCP initialization and tool-list requests. Lookups require the setting and a
separate explicit request from the extension; the adapter sends only validated
object/control references, interface captions and locale. It does not send
recorded event history, screenshots, field contents or tenant/environment/company
context. Remote matches remain unverified review suggestions.

## Development setup

Requirements: Node.js 20 or later with the MCP server dependencies installed, and
the .NET 8 SDK to publish the Windows Native Messaging host. From the repository
root:

```powershell
npm ci --prefix services/knowledge-mcp-server
dotnet publish native/knowledge-mcp-host/BCProcessStudio.KnowledgeMcpHost.csproj `
  -c Release -r win-x64 --self-contained true -o release/knowledge-mcp-host
```

Keep the published host under the repository checkout so it can find
`services/knowledge-mcp-server/src/server.js`. The host launches `node` from PATH;
the server's installed dependencies and the source knowledge packs must remain
available. Node.js is therefore required on the machine running this development
bridge.

Copy the per-user registration script beside the published host:

```powershell
Copy-Item native/knowledge-mcp-host/Register-Host.ps1 release/knowledge-mcp-host/
```

Find the extension ID in Edge's extension management page, then register only that
ID for the current Windows user:

```powershell
.\release\knowledge-mcp-host\Register-Host.ps1 -ExtensionId YOUR_32_CHARACTER_EXTENSION_ID -ValidateOnly
.\release\knowledge-mcp-host\Register-Host.ps1 -ExtensionId YOUR_32_CHARACTER_EXTENSION_ID
```

Registration writes one HKCU Edge native-host key;
it does not alter machine policy. Reload the extension after publishing its build.

After publishing, the host EXE is stored in `release/knowledge-mcp-host` under
the repository root so it can locate the local knowledge server. Keep the
knowledge-server source and its installed Node dependencies in the checkout.
Run the registration script with `-ValidateOnly` first; register only after the
manifest path and the exact Edge extension ID have been checked.
