@echo off
rem QuizKeen auto-commit launcher.
rem
rem Copies of this file (or a shortcut to it) can live in the Windows Startup
rem folder or in a logon scheduled task, so the sync watcher comes back on its
rem own after a reboot. It uses its own location to find the project, so the
rem copy works from anywhere.
rem
rem Logs go to %TEMP%\quizkeen-autogit.log, so they never show up as repo
rem changes.

cd /d "%~dp0.."

if not exist "node_modules" (
  echo [auto-git] node_modules is missing - skipping sync until dependencies are installed.
  exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
  echo [auto-git] node was not found on PATH.
  exit /b 1
)

node "scripts\auto-git.mjs"
