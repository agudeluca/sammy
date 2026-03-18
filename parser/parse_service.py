import tempfile
import os
from pathlib import Path
from marker.convert import convert_single_pdf
from marker.models import load_all_models


_models = None


def get_models():
    global _models
    if _models is None:
        _models = load_all_models()
    return _models


def parse_file(file_bytes: bytes, filename: str) -> str:
    suffix = Path(filename).suffix.lower()

    if suffix == ".txt":
        return file_bytes.decode("utf-8", errors="replace")

    if suffix in (".pdf", ".docx"):
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp.write(file_bytes)
            tmp_path = tmp.name
        try:
            models = get_models()
            full_text, _, _ = convert_single_pdf(tmp_path, models)
            return full_text
        finally:
            os.unlink(tmp_path)

    raise ValueError(f"Unsupported file type: {suffix}")
