# BAC Document Tracking - Start Backend + Frontend (run this once)
$ErrorActionPreference = "Stop"
$projectRoot = Split-Path $PSScriptRoot -Parent
$backendPath = Join-Path $projectRoot "backend"

# Use backend venv if present
$backendVenv = Join-Path $backendPath "venv\Scripts\Activate.ps1"
$activate = if (Test-Path $backendVenv) { "& '$($backendVenv -replace "'", "''")'; " } else { "" }

Write-Host "Applying backend migrations..." -ForegroundColor Yellow
Invoke-Expression "${activate}Set-Location '$backendPath'; python manage.py migrate --noinput"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "Ensuring superuser exists (admin / admin123)..." -ForegroundColor Yellow
Invoke-Expression "${activate}Set-Location '$backendPath'; python create_superuser.py"

Write-Host "Starting backend in a new window..." -ForegroundColor Green
$backendCmd = "${activate}Set-Location '$backendPath'; Write-Host 'Django backend - leave this window open' -ForegroundColor Cyan; python manage.py runserver 0.0.0.0:8000"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCmd

Write-Host "Waiting for backend to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 4

# Test backend
try {
    $r = Invoke-WebRequest -Uri "http://127.0.0.1:8000/api/login" -Method POST -ContentType "application/json" -Body '{"username":"x","password":"y"}' -UseBasicParsing -TimeoutSec 3
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 400) { /* expected for bad creds */ }
    else { Write-Host "Backend may still be starting. If login fails, wait a few seconds and try again." -ForegroundColor Yellow }
}

Write-Host "Starting frontend in this window..." -ForegroundColor Green
$frontendPath = Join-Path $projectRoot "frontend"
Set-Location $frontendPath
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing npm dependencies (first run)..." -ForegroundColor Yellow
    npm install
}
npm run dev
