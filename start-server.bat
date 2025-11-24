@echo off
echo ========================================
echo SOS 應用程式 - 本地伺服器啟動
echo ========================================
echo.

REM 檢查 Python 是否已安裝
python --version >nul 2>&1
if %errorlevel% == 0 (
    echo [OK] 找到 Python
    echo.
    echo 正在啟動伺服器於 http://localhost:8000
    echo.
    echo 在手機上使用時，請找到您的電腦 IP 位址：
    echo.
    ipconfig | findstr /i "IPv4"
    echo.
    echo 然後在手機瀏覽器中開啟: http://您的IP:8000
    echo.
    echo 按 Ctrl+C 停止伺服器
    echo ========================================
    echo.
    python -m http.server 8000
) else (
    echo [錯誤] 未找到 Python
    echo.
    echo 請先安裝 Python 3: https://www.python.org/downloads/
    echo.
    echo 或者使用其他方法啟動伺服器，請參考 README.md
    echo.
    pause
)
