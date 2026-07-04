@echo off
cd /d "%~dp0"
echo Pushing to GitHub...
git push origin main
echo.
echo ===== Done! You can close this window. =====
pause > nul
