import os
import tempfile
from pathlib import Path

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse

app = FastAPI()


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/parse")
async def parse(file: UploadFile = File(...)):
    filename = file.filename or "upload"
    ext = Path(filename).suffix.lower()

    if ext not in {".pdf", ".docx", ".txt"}:
        raise HTTPException(status_code=422, detail={"error": f"Unsupported file type: {ext}"})

    content = await file.read()

    with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    try:
        if ext == ".txt":
            markdown = content.decode("utf-8", errors="replace")
        elif ext in {".pdf", ".docx"}:
            markdown = _convert_with_marker(tmp_path, ext)
        else:
            raise HTTPException(status_code=422, detail={"error": f"Unsupported file type: {ext}"})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=422, detail={"error": str(e)})
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass

    return {"markdown": markdown}


def _convert_with_marker(path: str, ext: str) -> str:
    actual_path = path

    if ext == ".docx":
        pdf_path = path.replace(".docx", ".pdf")
        ret = os.system(f"libreoffice --headless --convert-to pdf --outdir {os.path.dirname(path)} {path}")
        if ret != 0 or not os.path.exists(pdf_path):
            raise RuntimeError("libreoffice conversion failed")
        actual_path = pdf_path

    try:
        from marker.converters.pdf import PdfConverter
        from marker.models import create_model_dict
        from marker.output import text_from_rendered

        models = create_model_dict()
        converter = PdfConverter(artifact_dict=models)
        rendered = converter(actual_path)
        markdown, _, _ = text_from_rendered(rendered)
        return markdown
    finally:
        if ext == ".docx" and os.path.exists(actual_path):
            try:
                os.unlink(actual_path)
            except OSError:
                pass
