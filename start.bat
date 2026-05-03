@echo off
echo 看護師勤務表ツール を起動します...
cd /d "%~dp0"

if not exist "node_modules" (
  echo 初回セットアップ中（数分かかります）...
  call npm install
)

echo サーバーを起動中...
start "" http://localhost:3000/shifts
npm run dev
