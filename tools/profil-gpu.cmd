@echo off
rem Profilage GPU reel (Windows + Chrome). Double-clic, ou : tools\profil-gpu.cmd [options passees a profil-gpu.mjs]. Voir docs/profil-gpu.md
cd /d "%~dp0.."
where node >nul 2>nul || (echo Node.js est requis : https://nodejs.org & pause & exit /b 1)
if not exist node_modules\playwright (call npm install --no-save playwright)
if not "%~1"=="" (node tools\profil-gpu.mjs --gpu %* & goto fin)
echo Quelle page mesurer ?
echo   1  Reporteur Q18 (moteur44)      2  Gares prioritaires (gares)    3  Nisaru (lecteur-vre)
echo   4  Studio PDF (studio)           5  Power BI (powerbi)            6  CERFA (cerfa)
echo   7  Point financier (finance)     8  Suivi (suivi)                 9  VRE par VM (vmvre)
echo   A  Extracteur VRE (vre)          B  Power Automate PP (pa)        C  Toutes les fiches (11 machines, long)
set /p c=Choix : 
set s=moteur44
if "%c%"=="2" set s=gares
if "%c%"=="3" set s=lecteur-vre
if "%c%"=="4" set s=studio
if "%c%"=="5" set s=powerbi
if "%c%"=="6" set s=cerfa
if "%c%"=="7" set s=finance
if "%c%"=="8" set s=suivi
if "%c%"=="9" set s=vmvre
if /i "%c%"=="A" set s=vre
if /i "%c%"=="B" set s=pa
if /i "%c%"=="C" (for %%x in (moteur44 gares lecteur-vre studio powerbi cerfa finance suivi vmvre vre pa) do node tools\profil-gpu.mjs --gpu --slug %%x --variants base,machine:off,shadow:off,bg:static) & goto fin
node tools\profil-gpu.mjs --gpu --slug %s% --variants base,machine:off,bg:static,shadow:off,aa:off,dpr:1
:fin
echo.
echo Resultats : dossier docs\profil\ (resume.md, resultats.json, traces)
pause
