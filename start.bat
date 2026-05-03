@echo off
echo 看護師勤務表ツール を起動します...
cd /d "%~dp0"

if not exist "node_modules" (
  echo 初回セットアップ中（数分かかります）...
  call npm install
)

echo サーバーを起動中...
start "nurse-shift-server" cmd /k "npm run dev"

echo サーバーの起動を待っています（初回は1〜2分かかることがあります）...
powershell -NoProfile -Command "$i=0; Write-Host '' -NoNewline; while($true){ Start-Sleep -Seconds 2; $i+=2; Write-Host ('.' ) -NoNewline; try{ $r=Invoke-WebRequest -Uri 'http://localhost:3000' -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop; break }catch{ if($i -ge 180){ Write-Host ''; Write-Host 'タイムアウト。サーバーウィンドウを確認してください。'; exit 1 } } }; Write-Host ''; Write-Host '起動完了！'"

echo ブラウザを開きます...
start "" http://localhost:3000/shifts
