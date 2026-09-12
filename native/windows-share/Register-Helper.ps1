param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^[a-p]{32}$')]
  [string]$ExtensionId,
  [switch]$ValidateOnly
)
$ErrorActionPreference = 'Stop'
$taskHostDirectory = (Resolve-Path -LiteralPath $PSScriptRoot).Path
$taskExecutable = Join-Path $taskHostDirectory 'BCProcessStudio.Share.exe'
if (-not (Test-Path -LiteralPath $taskExecutable -PathType Leaf)) {
  throw 'Hjälparens EXE saknas. Kör skriptet från det publicerade paketet.'
}
$taskManifestPath = Join-Path $taskHostDirectory 'share-host.json'
$taskManifest = @{
  name = 'com.thinknine.bcprocessstudio.share'
  description = 'BC Process Studio Windows report sharing'
  path = $taskExecutable
  type = 'stdio'
  allowed_origins = @("chrome-extension://$ExtensionId/")
}
$taskRegistryKeys = @(
  'HKCU:\Software\Microsoft\Edge\NativeMessagingHosts\com.thinknine.bcprocessstudio.share',
  'HKCU:\Software\Google\Chrome\NativeMessagingHosts\com.thinknine.bcprocessstudio.share'
)
foreach ($taskRegistryKey in $taskRegistryKeys) {
  if (Test-Path -LiteralPath $taskRegistryKey) {
    $taskExisting = (Get-Item -LiteralPath $taskRegistryKey).GetValue('')
    if ($taskExisting -and $taskExisting -ne $taskManifestPath) {
      throw "En annan hjälparinstallation finns redan på $taskExisting. Ingen registrering har ändrats."
    }
  }
}
if ($ValidateOnly) {
  $taskManifest | ConvertTo-Json -Depth 4
  return
}
if (Test-Path -LiteralPath $taskManifestPath) {
  $taskPrevious = Get-Content -LiteralPath $taskManifestPath -Raw | ConvertFrom-Json
  if ($taskPrevious.path -ne $taskExecutable -or
      $taskPrevious.name -ne 'com.thinknine.bcprocessstudio.share' -or
      $taskPrevious.allowed_origins -notcontains "chrome-extension://$ExtensionId/") {
    throw 'En annan konfiguration finns redan. Ingen registrering har ändrats.'
  }
}
[IO.File]::WriteAllText($taskManifestPath, ($taskManifest | ConvertTo-Json -Depth 4),
  [Text.UTF8Encoding]::new($false))
foreach ($taskRegistryKey in $taskRegistryKeys) {
  New-Item -Path $taskRegistryKey -Force | Out-Null
  Set-Item -LiteralPath $taskRegistryKey -Value $taskManifestPath
}
Write-Output 'Windows-hjälparen är registrerad för den aktuella användaren. Ladda om tillägget.'
