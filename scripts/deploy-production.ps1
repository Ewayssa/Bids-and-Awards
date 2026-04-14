# BAC Document Tracking - Production Deployment Script
$ErrorActionPreference = "Stop"
$projectRoot = Split-Path $PSScriptRoot -Parent
$backendPath = Join-Path $projectRoot "backend"
$frontendPath = Join-Path $projectRoot "frontend"

Write-Host "--- Starting Production Deployment Build ---" -ForegroundColor Cyan

# 1. Build Frontend
Write-Host "`n[1/3] Building Frontend (Vite)..." -ForegroundColor Yellow
Set-Location $frontendPath
if (-not (Test-Path "node_modules")) { npm install }
npm run build
Write-Host "Frontend build complete! Static files are in frontend/dist." -ForegroundColor Green

# 2. Setup Backend Production Server
Write-Host "`n[2/3] Setting up Backend for Production..." -ForegroundColor Yellow
Set-Location $backendPath
$backendVenv = Join-Path $backendPath "venv\Scripts\Activate.ps1"
$activate = if (Test-Path $backendVenv) { "& '$($backendVenv -replace "'", "''")'; " } else { "" }

# Install Waitress (Production WSGI server for Windows) and WhiteNoise (for static files)
Invoke-Expression "${activate}pip install waitress whitenoise"
Invoke-Expression "${activate}python manage.py migrate --noinput"
Invoke-Expression "${activate}python manage.py collectstatic --noinput"

# 3. Run Production Server
Write-Host "`n[3/3] Starting Production Server (Waitress)..." -ForegroundColor Yellow
Write-Host "IMPORTANT: Ensure your Django settings.py has WhiteNoise middleware configured for static files." -ForegroundColor Cyan
Write-Host "Serving on http://0.0.0.0:8000" -ForegroundColor Green

# Note: You may need to change "backend.wsgi:application" to match the actual folder name
# where your wsgi.py is located (e.g., "bids_and_award.wsgi:application").
Invoke-Expression "${activate}waitress-serve --listen=0.0.0.0:8000 backend.wsgi:application"