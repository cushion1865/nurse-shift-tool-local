@echo off
echo 看護師勤務表ツール を起動します...
cd /d "%~dp0"

echo ---- 現在のフォルダ: %cd% ----

:: Node.js 確認
where node >nul 2>&1
if %errorlevel% neq 0 (
  echo.
  echo エラー: Node.js が見つかりません。
  echo https://nodejs.org からインストールしてください。
  pause
  exit /b 1
)
echo Node.js OK

:: npm 確認
where npm >nul 2>&1
if %errorlevel% neq 0 (
  echo.
  echo エラー: npm が見つかりません。
  echo Node.js を再インストールしてください。
  pause
  exit /b 1
)
echo npm OK

:: 初回インストール
if not exist "node_modules" (
  echo 初回セットアップ中（数分かかります）...
  call npm install
  if %errorlevel% neq 0 (
    echo npm install に失敗しました。
    pause
    exit /b 1
  )
)

:: ロックファイルを削除
if exist ".next\dev\lock" del /f ".next\dev\lock" >nul 2>&1

:: ポート3000を使っているプロセスを終了
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000 " 2^>nul') do (
  taskkill /PID %%a /F >nul 2>&1
)
timeout /t 1 /nobreak >nul

echo.
echo サーバーが起動したら自動でブラウザが開きます。
echo このウィンドウは閉じないでください。
echo.

:: 裏でブラウザ待機
start /b powershell -NoProfile -WindowStyle Hidden -Command "while($true){ Start-Sleep -Seconds 3; try{ Invoke-WebRequest -Uri 'http://localhost:3000' -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop | Out-Null; Start-Process 'http://localhost:3000/shifts'; break }catch{} }"

:: サーバー起動
npm run dev

echo.
echo サーバーが停止しました。
pause
