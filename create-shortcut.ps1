$Desktop = [System.Environment]::GetFolderPath('Desktop')
$ShortcutPath = Join-Path $Desktop 'NurseShift.lnk'
if (Test-Path $ShortcutPath) { Remove-Item $ShortcutPath -Force }
$WS = New-Object -ComObject WScript.Shell
$SC = $WS.CreateShortcut($ShortcutPath)
$SC.TargetPath = 'cmd.exe'
$SC.Arguments = '/k powershell -ExecutionPolicy Bypass -File C:\Users\sotao\projects\shift-manager\nurse-shift-tool-local\start.ps1'
$SC.WorkingDirectory = 'C:\Users\sotao\projects\shift-manager\nurse-shift-tool-local'
$SC.WindowStyle = 1
$SC.Save()
Write-Host "Shortcut created at: $ShortcutPath" -ForegroundColor Green
Read-Host "Press Enter to close"
