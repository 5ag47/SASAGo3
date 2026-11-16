@echo off
chcp 65001 >nul
cd /d "%~dp0"
title SASAGo3
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo [SASAGo3] Node.js가 설치되어 있지 않아요.
  echo [SASAGo3] https://nodejs.org 에서 LTS 버전을 설치한 뒤 이 파일을 다시 실행해 주세요.
  echo.
  pause
  exit /b 1
)
node tools\play.mjs
if errorlevel 1 pause
