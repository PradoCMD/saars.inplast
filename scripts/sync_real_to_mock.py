import os
import sys
from pathlib import Path

# Adiciona o diretorio raiz ao path para importar o backend
sys.path.append(str(Path(__file__).resolve().parent))

from backend.config import Settings
from backend.provider import MockProvider

def main():
    print("Iniciando Sincronizacao de Estoque Real para Mock Data...")
    
    # Configura ambiente para o script
    os.environ["PCP_DATA_MODE"] = "mock"
    
    settings = Settings.from_env()
    provider = MockProvider(settings)
    
    source_codes = [
        "estoque_acabado_atual",
        "estoque_intermediario_atual"
    ]
    
    print(f"Sincronizando: {source_codes}")
    
    result = provider.sync_sources({"source_codes": source_codes})
    
    if result.get("status") in ["success", "partial"]:
        print("✅ Sincronizacao concluida com sucesso!")
        print(f"Resultados: {result.get('results', [])}")
    else:
        print("❌ Falha na sincronizacao.")
        print(f"Erros: {result.get('errors', [])}")

if __name__ == "__main__":
    main()
