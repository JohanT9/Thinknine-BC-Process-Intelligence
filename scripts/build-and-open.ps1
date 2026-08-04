$ErrorActionPreference = "Stop"

Write-Host "Building Thinknine BC Process Intelligence..." -ForegroundColor Cyan
npm.cmd run build

$distPath = Join-Path $PSScriptRoot "..\dist"
$distPath = [System.IO.Path]::GetFullPath($distPath)

Write-Host ""
Write-Host "Build complete." -ForegroundColor Green
Write-Host "Edge should load this folder:" -ForegroundColor Yellow
Write-Host $distPath
Write-Host ""
Write-Host "Opening Edge extensions..." -ForegroundColor Cyan

Start-Process "msedge.exe" "edge://extensions"
