"""LogiAI Root Gateway Entrypoint
Delegates to backend.main:app so running uvicorn main:app
from either Web/ or Web/backend/ works seamlessly.
"""
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from main import app  # noqa: F401