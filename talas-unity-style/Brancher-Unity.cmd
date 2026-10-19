@echo off
rem Branche le style peint dans le projet Unity de Talas, en une fois.
rem Usage : Brancher-Unity.cmd "C:\chemin\vers\talas-unity"
rem Prérequis : Unity 6000.3.26f1 installé par Unity Hub et déjà connecté à ton compte ; projet fermé dans l'éditeur.
setlocal
set PROJET=%~1
if "%PROJET%"=="" (echo Donne le dossier du projet : Brancher-Unity.cmd "C:\...\talas-unity" & exit /b 1)
if not exist "%PROJET%\Assets" (echo Dossier Assets introuvable dans %PROJET% & exit /b 1)
set UNITY=C:\Program Files\Unity\Hub\Editor\6000.3.26f1\Editor\Unity.exe
if not exist "%UNITY%" (echo Unity 6000.3.26f1 introuvable : %UNITY% & exit /b 1)
xcopy /E /I /Y "%~dp0Assets\TalasPainted" "%PROJET%\Assets\TalasPainted" >nul || exit /b 1
"%UNITY%" -batchmode -quit -projectPath "%PROJET%" -executeMethod TalasPaintedBatch.Run -logFile "%PROJET%\Talas-Peint.log"
echo Fin (code %ERRORLEVEL%). Journal : %PROJET%\Talas-Peint.log
exit /b %ERRORLEVEL%
