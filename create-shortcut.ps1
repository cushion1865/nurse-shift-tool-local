param([string]$ProjectDir = "")

# 引数がなければ $PSScriptRoot、それも空なら実行ファイルの場所を使う
if (-not $ProjectDir) {
    $ProjectDir = $PSScriptRoot
}
if (-not $ProjectDir) {
    $ProjectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
}
if (-not $ProjectDir) {
    Write-Host "ERROR: Could not detect project folder." -ForegroundColor Red
    Read-Host "Press Enter to close"
    exit 1
}

$ProjectDir = $ProjectDir.TrimEnd('\')
$StartScript = Join-Path $ProjectDir 'start.ps1'

Write-Host "Project folder: $ProjectDir" -ForegroundColor Cyan

if (-not (Test-Path $StartScript)) {
    Write-Host "ERROR: start.ps1 not found in: $ProjectDir" -ForegroundColor Red
    Read-Host "Press Enter to close"
    exit 1
}

$Desktop = [System.Environment]::GetFolderPath('Desktop')
$ShortcutPath = Join-Path $Desktop 'NurseShift.lnk'

if (Test-Path $ShortcutPath) { Remove-Item $ShortcutPath -Force }

$WS = New-Object -ComObject WScript.Shell
$SC = $WS.CreateShortcut($ShortcutPath)
$SC.TargetPath = 'cmd.exe'
$SC.Arguments = "/k powershell -ExecutionPolicy Bypass -File `"$StartScript`""
$SC.WorkingDirectory = $ProjectDir
$SC.WindowStyle = 1
$SC.Save()

Write-Host "Shortcut created at: $ShortcutPath" -ForegroundColor Green
Read-Host "Press Enter to close"
