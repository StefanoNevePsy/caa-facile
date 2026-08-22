@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

REM ============================================================
REM  CAA Facile - preparazione dell'APK
REM
REM  Scarica le modifiche da GitHub, ricompila la web app,
REM  copia tutto dentro il progetto Android e apre Android Studio,
REM  dove si genera l'APK con Build > Build APK(s).
REM
REM  Basta fare doppio clic su questo file: si posiziona da solo
REM  nella cartella del progetto.
REM ============================================================

cd /d "%~dp0"

if not exist "package.json" (
    echo [ERRORE] package.json non trovato in questa cartella.
    echo Metti questo file nella cartella principale del progetto caa-facile.
    goto :fine_errore
)

echo.
echo ==========================================================
echo  1/5  Controllo degli strumenti
echo ==========================================================

where git >nul 2>&1
if errorlevel 1 (
    echo [ERRORE] Git non trovato. Installalo da https://git-scm.com
    goto :fine_errore
)

where node >nul 2>&1
if errorlevel 1 (
    echo [ERRORE] Node.js non trovato. Installa la versione 22 o superiore
    echo          da https://nodejs.org
    goto :fine_errore
)

REM Capacitor 8 richiede Node 22 o superiore: con la 20 il passo di
REM sincronizzazione fallisce con un messaggio poco chiaro.
for /f "tokens=1 delims=." %%v in ('node -v 2^>nul') do set "NODEMAJOR=%%v"
set "NODEMAJOR=!NODEMAJOR:v=!"
if not defined NODEMAJOR (
    echo [ERRORE] Impossibile leggere la versione di Node.js.
    goto :fine_errore
)
if !NODEMAJOR! LSS 22 (
    echo [ERRORE] Serve Node.js 22 o superiore, trovata la versione !NODEMAJOR!.
    echo          Capacitor non funziona con versioni precedenti.
    echo          Aggiorna da https://nodejs.org
    goto :fine_errore
)
echo Git e Node.js !NODEMAJOR! pronti.

echo.
echo ==========================================================
echo  2/5  Scarico le modifiche da GitHub
echo ==========================================================

for /f "tokens=*" %%b in ('git rev-parse --abbrev-ref HEAD') do set "RAMO=%%b"
echo Ramo corrente: !RAMO!

REM Se ci sono modifiche non salvate il pull puo' fallire a meta':
REM meglio accorgersene prima.
git diff --quiet
if errorlevel 1 (
    echo.
    echo [ATTENZIONE] Ci sono modifiche locali non salvate.
    echo Verranno mantenute, ma il download potrebbe fermarsi per un conflitto.
    echo.
    choice /c SN /n /m "Continuare comunque? [S/N] "
    if errorlevel 2 goto :fine_annullato
)

git pull --ff-only
if errorlevel 1 (
    echo.
    echo [ERRORE] Download non riuscito.
    echo Se compare un conflitto, apri la cartella con Git e risolvilo,
    echo oppure annulla le modifiche locali con:  git reset --hard
    goto :fine_errore
)

echo.
echo ==========================================================
echo  3/5  Installo le dipendenze
echo ==========================================================

REM `call` e' obbligatorio: npm e npx su Windows sono script .cmd e
REM senza `call` interromperebbero questo file dopo il primo comando.
call npm install
if errorlevel 1 goto :fine_errore

echo.
echo ==========================================================
echo  4/5  Compilo la app e aggiorno il progetto Android
echo ==========================================================

REM Niente VITE_BASE: le build native caricano i file da disco e
REM hanno bisogno dei percorsi relativi.
call npm run build
if errorlevel 1 goto :fine_errore

call npx cap sync android
if errorlevel 1 goto :fine_errore

echo.
echo ==========================================================
echo  5/5  Apro Android Studio
echo ==========================================================
echo.
echo In Android Studio, quando la barra in basso ha finito di
echo sincronizzare Gradle:
echo.
echo     Build  ^>  Build Bundle(s) / APK(s)  ^>  Build APK(s)
echo.
echo A fine compilazione compare un avviso in basso a destra con
echo il link "locate": l'APK e' in
echo     android\app\build\outputs\apk\debug\app-debug.apk
echo.

call npx cap open android
if errorlevel 1 (
    echo.
    echo [ATTENZIONE] Android Studio non si e' aperto da solo.
    echo Aprilo a mano e scegli "Open", poi seleziona la cartella:
    echo     %CD%\android
    echo.
    echo Se hai Android Studio installato in un percorso non standard,
    echo puoi indicarlo cosi' ^(una volta sola^):
    echo     setx CAPACITOR_ANDROID_STUDIO_PATH "C:\Program Files\Android\Android Studio\bin\studio64.exe"
    goto :fine_errore
)

echo.
echo ==========================================================
echo  Fatto. Android Studio sta aprendo il progetto.
echo ==========================================================
goto :fine_ok

:fine_annullato
echo.
echo Operazione annullata.
goto :fine_ok

:fine_errore
echo.
echo ----------------------------------------------------------
echo  Operazione interrotta.
echo ----------------------------------------------------------
pause
exit /b 1

:fine_ok
echo.
pause
exit /b 0
