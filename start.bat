@echo off
echo 看護師勤務表ツール を起動します...
cd /d "%~dp0"

if not exist "node_modules" (
  echo 初回セットアップ中（数分かかります）...
  call npm install
)

echo サーバーが起動したら自動でブラウザが開きます。
echo このウィンドウは閉じないでください。
echo.

start /b powershell -NoProfile -WindowStyle Hidden -Command "while($true){ Start-Sleep -Seconds 3; try{ Invoke-WebRequest -Uri 'http://localhost:3000' -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop | Out-Null; Start-Process 'http://localhost:3000/shifts'; break }catch{} }"

npm run dev
