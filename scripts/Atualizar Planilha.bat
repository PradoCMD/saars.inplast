@echo off
chcp 65001 >nul 2>&1
title AUTOMACAO - PEDIDOS TRANSPORTADORAS 2025

echo ========================================================
echo    AUTOMACAO - PEDIDOS TRANSPORTADORAS 2025
echo    Atualizando planilha com dados dos Romaneios...
echo ========================================================
echo.

set "ATALHO_DIR=%~dp0"
set "SCRIPTS_DIR=%ATALHO_DIR%scripts"

if not exist "%SCRIPTS_DIR%" (
    set "SCRIPTS_DIR=%ATALHO_DIR%"
    for %%I in ("%ATALHO_DIR%\..") do set "ATALHO_DIR=%%~fI"
)

echo Pasta base: %ATALHO_DIR%
echo Scripts em: %SCRIPTS_DIR%
echo.

where python >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    where python3 >nul 2>&1
    if %ERRORLEVEL% NEQ 0 (
        echo ERRO: Python nao encontrado no sistema!
        echo    Instale em: https://www.python.org/downloads/
        echo    Marque "Add Python to PATH" durante a instalacao!
        pause
        exit /b 1
    )
    set "PYTHON_CMD=python3"
) else (
    set "PYTHON_CMD=python"
)

echo Python encontrado!
%PYTHON_CMD% --version
echo.

echo Verificando dependencias...
%PYTHON_CMD% -c "import openpyxl; import pdfplumber" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Instalando dependencias...
    %PYTHON_CMD% -m pip install --user -q -r "%SCRIPTS_DIR%\requirements.txt"
    if %ERRORLEVEL% NEQ 0 (
        echo ERRO ao instalar dependencias!
        echo    Tente: pip install openpyxl pdfplumber
        pause
        exit /b 1
    )
    echo Dependencias instaladas!
)

echo.
echo Executando automacao...
echo --------------------------------------------------------
echo.

%PYTHON_CMD% "%SCRIPTS_DIR%\update_planilha_gsheets.py"

echo.
echo ========================================================
pause
