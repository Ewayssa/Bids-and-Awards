# BAC Document Tracking - Start Django Backend (opens in new window)
$backendPath = Join-Path $PSScriptRoot "backend"
$parentVenv = Join-Path (Split-Path $PSScriptRoot -Parent) ".venv\Scripts\Activate.ps1"
$activate = if (Test-Path $parentVenv) { "& '$parentVenv'; " } else { "" }
$cmd = "${activate}Set-Location '$backendPath'; Write-Host 'Starting Django on http://127.0.0.1:8000' -ForegroundColor Green; python manage.py runserver 0.0.0.0:8000"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $cmd
