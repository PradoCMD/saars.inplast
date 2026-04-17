import os
import sys
from backend.config import load_settings
from backend.provider import MockProvider
from pathlib import Path

os.environ["PCP_DATA_MODE"] = "mock"
settings = load_settings()
provider = MockProvider(settings, Path("data"))
import json
print(json.dumps(provider.romaneios_kanban()["romaneios"][0]["items"], indent=2))
