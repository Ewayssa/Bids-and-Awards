# BAC Document Tracking - Start Vite Frontend
$root = Split-Path $PSScriptRoot -Parent
$frontendPath = Join-Path $root "frontend"

Set-Location $frontendPath
Write-Host "Project folder: $frontendPath" -ForegroundColor Cyan
Write-Host "Starting Vite frontend..." -ForegroundColor Green

# Ensure dependencies are installed
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies (first run)..." -ForegroundColor Yellow
    npm install
}

npm run dev

# Keep window open if npm exits
Write-Host "`nPress any key to close this window..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
