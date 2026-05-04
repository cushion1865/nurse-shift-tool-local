$ProjectDir = $PSScriptRoot
Set-Location $ProjectDir

Write-Host "Starting Nurse Shift Tool..." -ForegroundColor Cyan

if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies (first time only)..." -ForegroundColor Yellow
    npm install
}

if (Test-Path ".next\dev\lock") {
    Remove-Item ".next\dev\lock" -Force
}

Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | ForEach-Object {
    Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
}
Start-Sleep -Seconds 1

Write-Host ""
Write-Host "Starting server... Browser will open automatically." -ForegroundColor Green
Write-Host "Do NOT close this window." -ForegroundColor Yellow
Write-Host ""

Start-Job -ScriptBlock {
    while ($true) {
        Start-Sleep -Seconds 2
        try {
            Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop | Out-Null
            Start-Process "http://localhost:3000/shifts"
            break
        } catch {}
    }
} | Out-Null

npm run dev

Write-Host ""
Write-Host "Server stopped." -ForegroundColor Red
Read-Host "Press Enter to close"
