@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo ============================================================
echo   多多快跑 抽驗腳本（R：seminr / cSEM / NCA）
echo   會依序跑 3 支腳本，結果寫到 out\ 資料夾
echo   第一次執行會自動安裝套件，可能要 5-15 分鐘
echo ============================================================
echo.

set "RSCRIPT="
where Rscript.exe >nul 2>nul && set "RSCRIPT=Rscript.exe"

if not defined RSCRIPT (
  for /f "delims=" %%D in ('dir /b /o-n "C:\Program Files\R\R-*" 2^>nul') do (
    if not defined RSCRIPT if exist "C:\Program Files\R\%%D\bin\Rscript.exe" set "RSCRIPT=C:\Program Files\R\%%D\bin\Rscript.exe"
  )
)

if not defined RSCRIPT (
  echo [錯誤] 找不到 R。請先安裝 R：https://cran.r-project.org/bin/windows/base/
  echo        安裝後再雙擊本檔一次。
  echo.
  pause
  exit /b 1
)

echo 使用的 R：!RSCRIPT!
echo.

if not exist out mkdir out

echo [1/3] seminr（PLS 核心 / 調節 / HOC / PLSpredict）...
"!RSCRIPT!" 01_seminr.R
echo.

echo [2/3] cSEM（PLSc / 模型適配 / MICOM / MGD）...
"!RSCRIPT!" 02_csem.R
echo.

echo [3/3] NCA（必要條件分析）...
"!RSCRIPT!" 03_nca.R
echo.

echo ============================================================
echo   跑完了。結果在這個資料夾的 out\ 底下：
echo     out\01_seminr_out.txt
echo     out\02_csem_out.txt
echo     out\03_nca_out.txt
echo   把這三個檔的內容貼給 AI（或直接把檔案上傳）即可。
echo ============================================================
echo.
start "" "%~dp0out"
pause
