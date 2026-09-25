param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^[a-p]{32}$')]
  [string]$ExtensionId,
  [switch]$ValidateOnly
)
$ErrorActionPreference = 'Stop'
$hostDirectory = (Resolve-Path -LiteralPath $PSScriptRoot).Path
$hostExecutable = Join-Path $hostDirectory 'BCProcessStudio.KnowledgeMcpHost.exe'
if (-not (Test-Path -LiteralPath $hostExecutable -PathType Leaf)) {
  throw 'MCP-värdens EXE saknas. Publicera värden innan registrering.'
}
$manifestPath = Join-Path $hostDirectory 'knowledge-mcp-host.json'
$manifest = @{
  name = 'com.thinknine.bcprocessstudio.knowledge'
  description = 'BC Process Studio read-only knowledge MCP bridge'
  path = $hostExecutable
  type = 'stdio'
  allowed_origins = @("chrome-extension://$ExtensionId/")
}
$registryKey = 'HKCU:\Software\Microsoft\Edge\NativeMessagingHosts\com.thinknine.bcprocessstudio.knowledge'
if (Test-Path -LiteralPath $registryKey) {
  $existing = (Get-Item -LiteralPath $registryKey).GetValue('')
  if ($existing -and $existing -ne $manifestPath) {
    throw "En annan MCP-värd är registrerad på $existing. Ingen registrering har ändrats."
  }
}
if ($ValidateOnly) {
  $manifest | ConvertTo-Json -Depth 4
  return
}
[IO.File]::WriteAllText($manifestPath, ($manifest | ConvertTo-Json -Depth 4),
  [Text.UTF8Encoding]::new($false))
New-Item -Path $registryKey -Force | Out-Null
Set-Item -LiteralPath $registryKey -Value $manifestPath
Write-Output 'BC Process Studio MCP-värd registrerad för Edge och detta tillägg.'
