@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 goto semnode
if exist data\users.json goto rodar
echo.
echo Primeira execucao: vamos criar o usuario CONTROLADOR (quem edita tudo).
set /p U=Nome do usuario: 
set /p P=Senha (minimo 6 caracteres): 
node server.js user add "%U%" "%P%" controlador
:rodar
node server.js setup
echo.
echo Abra no navegador: http://localhost:3000
node server.js
pause
goto fim
:semnode
echo Node.js nao encontrado. Instale a versao LTS em https://nodejs.org e execute este arquivo de novo.
pause
:fim
