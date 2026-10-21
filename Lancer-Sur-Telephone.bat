@echo off
chcp 65001 >nul
echo ============================================================================
echo   iLOCA 2026 - Installation et Lancement Direct sur Telephone Android (ADB)
echo ============================================================================
echo.

set "ADB_PATH=%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe"
set "APK_PATH=%~dp0iloca_flutter\build_output\iLOCA-2026.apk"

if not exist "%APK_PATH%" (
    set "APK_PATH=%~dp0iLOCA-2026.apk"
)

if not exist "%ADB_PATH%" (
    echo [ERREUR] adb.exe introuvable dans %ADB_PATH%
    pause
    exit /b 1
)

echo [1/3] Verification de la connexion du telephone USB / Wi-Fi (Wireless Debugging)...
"%ADB_PATH%" devices
echo.

echo [2/3] Installation de iLOCA-2026.apk sur votre telephone...
"%ADB_PATH%" install -r "%APK_PATH%"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [!] Aucun telephone detecte ou debogage USB non autorise.
    echo     1. Activez "Debogage USB" (USB Debugging) dans les Options pour les developpeurs du telephone.
    echo     2. Branchez le cable USB et acceptez la fenetre "Autoriser le debogage USB" sur le telephone.
    echo     (Ou utilisez "Pair device using Wi-Fi" dans Android Studio).
    pause
    exit /b 1
)

echo.
echo [3/3] Lancement automatique de l'application iLOCA 2026 sur le telephone...
"%ADB_PATH%" shell monkey -p com.sft.iloca -c android.intent.category.LAUNCHER 1 >nul 2>&1

echo.
echo [SUCCES] L'application iLOCA 2026 est maintenant ouverte sur votre telephone !
