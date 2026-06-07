@echo off
title RAMOS GYM - INICIAR SISTEMA COMPLETO
color 0B

echo ======================================================================
echo          SISTEMA DE GESTION Y CONTROL BIOMETRICO - RAMOS GYM
echo                Tesis de Grado - Luis Ramos - Cabimas
echo ======================================================================
echo.
echo Preparando el inicio de los 3 subsistemas en ventanas dedicadas...
echo.

:: 1. Iniciar el motor biometrico (Python Flask en puerto 5000)
echo [1/3] Lanzando Motor de Inteligencia Artificial (Python Flask - Puerto 5000)...
start "3. MOTOR BIOMETRICO - PYTHON IA" cmd /k "cd /d "%~dp0biometrics" && title 3. MOTOR BIOMETRICO - PYTHON IA && color 0D && python app.py"
timeout /t 3 /nobreak >nul

:: 2. Iniciar el API REST (Node.js Backend en puerto 3000)
echo [2/3] Lanzando Servidor API REST (Node.js + MySQL - Puerto 3000)...
start "2. API REST BACKEND - NODE.JS" cmd /k "cd /d "%~dp0backend" && title 2. API REST BACKEND - NODE.JS && color 0E && npm run dev"
timeout /t 3 /nobreak >nul

:: 3. Iniciar el Servidor de Interfaz (Vite Frontend en puerto 5173)
echo [3/3] Lanzando Servidor de Interfaz Web (Vite + React - Puerto 5173)...
start "1. INTERFAZ WEB - VITE FRONTEND" cmd /k "cd /d "%~dp0frontend" && title 1. INTERFAZ WEB - VITE FRONTEND && color 0A && npm run dev"

echo.
echo ======================================================================
echo PROCESO DE INICIO COMPLETADO!
echo.
echo Se han abierto 3 ventanas independientes en tu barra de tareas:
echo   [+] 1. Interfaz Web (Vite Frontend)
echo   [+] 2. Servidor API REST (Node.js Backend)
echo   [+] 3. Motor Biometrico (Python Flask IA)
echo.
echo Manten esas ventanas abiertas durante tus pruebas.
echo Si deseas detener el sistema, cierra las 3 ventanas de comandos.
echo ======================================================================
echo.
pause
