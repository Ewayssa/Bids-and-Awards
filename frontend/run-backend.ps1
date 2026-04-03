# BAC Document Tracking - Start Django Backend (opens in new window)
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$backendPath = Join-Path $root "backend"
$backendVenv = Join-Path $backendPath "venv\Scripts\Activate.ps1"
$activate = if (Test-Path $backendVenv) { "& '$($backendVenv -replace "'", "''")'; " } else { "" }

# Run migrations and create superuser before starting server (ensures backend is ready)
$migrateCmd = "${activate}Set-Location '$backendPath'; python manage.py migrate --noinput"
$superuserCmd = "${activate}Set-Location '$backendPath'; python create_superuser.py"
Write-Host "Applying migrations..." -ForegroundColor Yellow
Invoke-Expression $migrateCmd
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "Ensuring superuser exists..." -ForegroundColor Yellow
Invoke-Expression $superuserCmd

$cmd = "${activate}Set-Location '$backendPath'; Write-Host 'Django backend - http://127.0.0.1:8000' -ForegroundColor Green; python manage.py runserver 0.0.0.0:8000"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $cmd
