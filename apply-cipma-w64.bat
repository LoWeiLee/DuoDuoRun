@echo off
cd /d "%~dp0"
echo Applying cIPMA commit (W6.4) to your local repo...
echo.
if exist ".git\index.lock" del /f /q ".git\index.lock"
git reset --hard ea07061
if errorlevel 1 goto fail
git update-ref -d refs/remotes/cipma-transfer 2>nul
git update-ref -d refs/remotes/nca-transfer 2>nul
if exist "_cipma-w64.bundle" del /f /q "_cipma-w64.bundle"
if exist "apply-nca-w61.bat" del /f /q "apply-nca-w61.bat"
echo.
git log --oneline -2
echo.
echo ===== cIPMA applied. Now double-click push.bat to push to GitHub. =====
pause > nul
goto end
:fail
echo.
echo !!! git reset failed - please run: git status  and tell Claude.
pause > nul
:end
