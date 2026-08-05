param(
  [Parameter(Mandatory = $true)]
  [string]$InputDirectory,
  [Parameter(Mandatory = $true)]
  [string]$OutputDirectory
)

$ErrorActionPreference = 'Stop'
$inputPath = (Resolve-Path -LiteralPath $InputDirectory).Path
$outputPath = [System.IO.Path]::GetFullPath($OutputDirectory)
[System.IO.Directory]::CreateDirectory($outputPath) | Out-Null
$edge = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'

if (-not (Test-Path -LiteralPath $edge -PathType Leaf)) {
  throw "Microsoft Edge was not found at $edge"
}

foreach ($name in @('rc7-cover', 'rc8-cover', 'rc7-workflow', 'rc8-workflow')) {
  $html = (Resolve-Path -LiteralPath (Join-Path $inputPath "$name.html")).Path
  $screenshot = Join-Path $outputPath "$name.png"
  $profile = Join-Path $inputPath "edge-$name"
  $arguments = @(
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--no-first-run',
    "--user-data-dir=$profile",
    '--window-size=1100,1150',
    "--screenshot=$screenshot",
    ([System.Uri]$html).AbsoluteUri
  )
  $process = Start-Process -FilePath $edge -ArgumentList $arguments `
    -Wait -PassThru -WindowStyle Hidden
  if ($process.ExitCode -ne 0 -or
      -not (Test-Path -LiteralPath $screenshot -PathType Leaf)) {
    throw "Edge failed to render $name."
  }
}
