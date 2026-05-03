@echo off
echo 看護師勤務表ツール を起動します...
cd /d "%~dp0"

if not exist "node_modules" (
  echo 初回セットアップ中（数分かかります）...
  call npm install
)

echo サーバーを起動中...
start "nurse-shift-server" cmd /k "npm run dev"

echo サーバーの起動を待っています（初回は30秒ほどかかることがあります）...
:WAIT
timeout /t 2 /nobreak > nul
curl -s -o nul http://localhost:3000 2>nul
if %errorlevel% neq 0 goto WAIT

echo 起動完了！ブラウザを開きます...
start "" http://localhost:3000/shifts
