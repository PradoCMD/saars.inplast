#!/bin/bash
# ============================================================
#  ATUALIZAR PLANILHA DE PEDIDOS TRANSPORTADORAS
#  Double-click para executar (macOS)
# ============================================================
clear
echo "========================================================"
echo "   AUTOMACAO - PEDIDOS TRANSPORTADORAS 2025"
echo "   Atualizando planilha com dados dos Romaneios..."
echo "========================================================"
echo ""

ATALHO_DIR="$(cd "$(dirname "$0")" && pwd)"
SCRIPTS_DIR="$ATALHO_DIR/scripts"

# Se executado de dentro da pasta scripts, ajusta
if [ ! -d "$SCRIPTS_DIR" ]; then
    SCRIPTS_DIR="$ATALHO_DIR"
    ATALHO_DIR="$(dirname "$ATALHO_DIR")"
fi

echo "Pasta base: $ATALHO_DIR"
echo "Scripts em: $SCRIPTS_DIR"
echo ""

if ! command -v python3 &>/dev/null; then
    echo "ERRO: Python 3 nao encontrado!"
    echo "  Instale em: https://www.python.org/downloads/"
    read -p "Pressione ENTER para sair..."
    exit 1
fi

PYTHON_CMD="python3"
echo "Python encontrado: $($PYTHON_CMD --version)"
echo ""

echo "Verificando dependencias..."
$PYTHON_CMD -c "import openpyxl; import pdfplumber" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "Instalando dependencias..."
    $PYTHON_CMD -m pip install --user -q -r "$SCRIPTS_DIR/requirements.txt"
    if [ $? -ne 0 ]; then
        echo "ERRO ao instalar dependencias!"
        read -p "Pressione ENTER para sair..."
        exit 1
    fi
    echo "Dependencias instaladas!"
fi

echo ""
echo "Executando automacao..."
echo "--------------------------------------------------------"
echo ""

$PYTHON_CMD "$SCRIPTS_DIR/update_planilha_gsheets.py"

echo ""
echo "========================================================"
