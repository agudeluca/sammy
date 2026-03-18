from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
from parse_service import parse_file
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="sammy-parser")

_embedder: SentenceTransformer | None = None


def get_embedder() -> SentenceTransformer:
    global _embedder
    if _embedder is None:
        logger.info("Loading embedding model all-mpnet-base-v2...")
        _embedder = SentenceTransformer("all-mpnet-base-v2")
        logger.info("Embedding model loaded.")
    return _embedder


class EmbedRequest(BaseModel):
    texts: list[str]


@app.on_event("startup")
async def startup():
    # Pre-warm both models
    get_embedder()


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/parse")
async def parse(file: UploadFile = File(...)):
    allowed = {".pdf", ".docx", ".txt"}
    suffix = "." + file.filename.split(".")[-1].lower() if "." in file.filename else ""
    if suffix not in allowed:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {suffix}")

    file_bytes = await file.read()
    try:
        markdown = parse_file(file_bytes, file.filename)
    except Exception as e:
        logger.exception("Parse failed")
        raise HTTPException(status_code=500, detail=str(e))

    return {"markdown": markdown}


@app.post("/embed")
async def embed(request: EmbedRequest):
    if not request.texts:
        return {"vectors": []}
    embedder = get_embedder()
    vectors = embedder.encode(request.texts, show_progress_bar=False).tolist()
    return {"vectors": vectors}
