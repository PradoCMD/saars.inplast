#!/bin/bash
# ============================================================
#  DEPLOY - Copia automação para o servidor
#  Executa este script para copiar tudo para a pasta do servidor
# ============================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SOURCE_DIR="$SCRIPT_DIR"

# Destino no servidor SMB
DEST_BASE="/Volumes/producao/2 - PCP/Pedidos transportadora (Automação)"

echo "========================================================"
echo "  DEPLOY - Automação Pedidos Transportadoras"
echo "========================================================"
echo ""
echo "Origem:  $SOURCE_DIR"
echo "Destino: $DEST_BASE"
echo ""

# Verifica se o volume está montado
if [ ! -d "/Volumes/producao" ]; then
    echo "ERRO: Volume /Volumes/producao não está montado!"
    echo ""
    echo "Monte o compartilhamento primeiro:"
    echo "  Finder > Ir > Conectar ao Servidor"
    echo "  smb://srv/producao"
    echo ""
    read -p "Pressione ENTER para sair..."
    exit 1
fi

# Cria pasta de destino se não existir
mkdir -p "$DEST_BASE/scripts"

echo "Copiando scripts..."
cp "$SOURCE_DIR/update_planilha_romaneios_v2.py" "$DEST_BASE/scripts/"
cp "$SOURCE_DIR/ingest_romaneio_pdf.py"          "$DEST_BASE/scripts/"
cp "$SOURCE_DIR/sankhya_ordens_carga_poll.py"    "$DEST_BASE/scripts/"
cp "$SOURCE_DIR/requirements.txt"                "$DEST_BASE/scripts/"

echo "Copiando atalhos (para fora da pasta scripts)..."
cp "$SOURCE_DIR/Atualizar Planilha.command"  "$DEST_BASE/"
cp "$SOURCE_DIR/Atualizar Planilha.bat"      "$DEST_BASE/"

# Garante permissão de execução no .command
chmod +x "$DEST_BASE/Atualizar Planilha.command"

echo ""
echo "Verificando se a planilha existe no destino..."
PLANILHA="$DEST_BASE/PEDIDOS TRANSPORTADORAS 2025 (AUTOMAÇÃO).xlsx"
if [ -f "$PLANILHA" ]; then
    echo "  Planilha encontrada!"
else
    echo "  AVISO: Planilha NÃO encontrada em:"
    echo "    $PLANILHA"
    echo "  Certifique-se de que o arquivo está no local correto."
fi

echo ""
echo "========================================================"
echo "  DEPLOY CONCLUIDO!"
echo "========================================================"
echo ""
echo "Estrutura no servidor:"
echo "  $DEST_BASE/"
echo "    ├── PEDIDOS TRANSPORTADORAS 2025 (AUTOMAÇÃO).xlsx"
echo "    ├── Atualizar Planilha.command  (atalho macOS)"
echo "    ├── Atualizar Planilha.bat      (atalho Windows)"
echo "    └── scripts/"
echo "        ├── update_planilha_romaneios_v2.py"
echo "        ├── ingest_romaneio_pdf.py"
echo "        ├── sankhya_ordens_carga_poll.py"
echo "        └── requirements.txt"
echo ""
echo "Para usar: Dê duplo-clique em 'Atualizar Planilha'"
echo ""
read -p "Pressione ENTER para sair..."
