@echo off
rem Profilage GPU reel : double-clic ou "tools\profil-gpu.cmd [options]". Voir docs/profil-gpu.md
cd /d "%~dp0.."
where node >/dev/null 2>/dev/null || (echo Node.js est requis : https://nodejs.org & pause & exit /b 1)
if not exist node_modules\playwright (call npm install --no-save playwright)
node tools\profil-gpu.mjs --gpu %*
echo.
echo Resultats : dossier docs\profil\ (resume.md, resultats.json, traces)
pause
