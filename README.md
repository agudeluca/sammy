# Sammy V2

A RAG-based document chatbot. Upload PDFs, DOCX, or TXT files organized by community, then ask questions and get answers grounded strictly in those documents.

---

## How it works

### Ingestion pipeline

1. User uploads a file via the Admin page
2. Bun backend saves the file and creates a `pending` document record
3. Backend sends the file to the Python parser service
4. Parser extracts text and returns Markdown (using [marker](https://github.com/datalab-to/marker))
5. Backend chunks the Markdown (~800 tokens, 100-token overlap)
6. Chunks are sent to the parser's `/embed` endpoint (sentence-transformers `all-mpnet-base-v2`, 768 dims, local — no API key needed)
7. Vectors are upserted to Pinecone under a namespace matching the community ID
8. Document status is updated to `processed` (or `error` on failure)

### Chat pipeline

1. User types a question on the Chat page
2. Backend embeds the question using the same model
3. Top-10 similar chunks are retrieved from Pinecone (correct namespace)
4. Context is assembled and sent to Cursor CLI with a strict system prompt
5. The model answers using **only** the retrieved context
6. If context is insufficient → `"No tengo información suficiente en los documentos."`

---

## Stack

| Layer | Technology |
|---|---|
| Backend | TypeScript + [Bun](https://bun.sh) + [Elysia](https://elysiajs.com) |
| Frontend | Vite + TypeScript (vanilla, no framework) |
| Parser | Python + FastAPI + [marker](https://github.com/datalab-to/marker) |
| Embeddings | `all-mpnet-base-v2` via sentence-transformers (local, free) |
| Vector DB | [Pinecone](https://pinecone.io) (1 index, namespaces per community) |
| LLM | Cursor CLI |
| Database | SQLite via `bun:sqlite` |
| Auth | JWT (single user via env vars) |
| Orchestration | Docker Compose |

---

## Pages

### `/login`
Simple username/password form. Credentials are set in `.env`. On success, a JWT is stored in `localStorage` and the user is redirected to `/admin`.

### `/admin`
- Select or create a community
- Upload documents (PDF, DOCX, TXT) — drag & drop or click
- View document list with live status badges (`pending` → `processed` / `error`)
- Status auto-polls every 3 seconds while documents are processing

### `/chat`
- Select a community
- ChatGPT-style interface
- Answers are grounded only in the uploaded documents for that community
- Conversation history is maintained in-session

---

## Architecture


```
┌─────────────────────────────────────────────────────────┐
│                    Docker Compose                        │
│                                                         │
│  ┌──────────┐    ┌──────────────┐    ┌───────────────┐  │
│  │   web    │    │     app      │    │    parser     │  │
│  │  (Vite)  │───▶│  (Bun/TS)   │───▶│   (Python)    │  │
│  │  :5173   │    │    :3000     │    │    :8000      │  │
│  └──────────┘    └──────┬───────┘    └───────────────┘  │
│                         │                               │
│                         ▼                               │
│                    ┌─────────┐                          │
│                    │Pinecone │  (external)               │
│                    │  Cloud  │                          │
│                    └─────────┘                          │
└─────────────────────────────────────────────────────────┘
```

---

## Project structure

```
sammy-v2/
├── docker-compose.yml
├── .env.example
│
├── app/                        # Bun backend
│   └── src/
│       ├── index.ts            # Elysia app entry
│       ├── config.ts           # Env vars
│       ├── db.ts               # SQLite schema + connection
│       ├── middleware/auth.ts  # JWT validation
│       ├── routes/
│       │   ├── auth.ts         # POST /api/auth/login
│       │   ├── admin.ts        # Communities + documents + upload
│       │   └── chat.ts         # POST /api/chat
│       ├── services/
│       │   ├── parser.ts       # Calls Python /parse and /embed
│       │   ├── pinecone.ts     # Upsert + similarity query
│       │   └── cursor.ts       # Cursor CLI invocation
│       └── lib/chunker.ts      # Paragraph-aware text chunker
│
├── web/                        # Vite frontend
│   └── src/
│       ├── main.ts             # SPA router
│       ├── api.ts              # Typed fetch wrappers
│       ├── auth.ts             # JWT localStorage helpers
│       ├── pages/              # Login, Admin, Chat
│       └── components/         # CommunitySelector, FileUploader, DocumentList, ChatUI
│
└── parser/                     # Python microservice
    ├── main.py                 # FastAPI: POST /parse, POST /embed, GET /health
    └── parse_service.py        # marker file parsing logic
```

---

## API reference

### Auth
```
POST /api/auth/login
{ username, password } → { token }
```

### Admin (requires Authorization: Bearer <token>)
```
POST   /api/communities              { name } → { id, name }
GET    /api/communities              → [{ id, name }]
POST   /api/upload  (multipart)      file + community_id → { doc_id, status }
GET    /api/documents?community_id=  → [{ id, filename, status, error_msg, created_at }]
```

### Chat (requires Authorization: Bearer <token>)
```
POST /api/chat
{ community_id, question, history? } → { answer }
```

### Parser (internal)
```
POST /parse  (multipart) file → { markdown }
POST /embed  { texts: string[] } → { vectors: number[][] }
```

---

## Setup

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) + Docker Compose
- A [Pinecone](https://pinecone.io) account with an index named `sammy-docs` (dimension: 768, metric: cosine)
- [Cursor](https://cursor.com) installed locally (for the LLM)

### 1. Configure environment
```bash
cp .env.example .env
```

Edit `.env`:
```
PINECONE_API_KEY=your_key_here
PINECONE_INDEX=sammy-docs
AUTH_USERNAME=admin
AUTH_PASSWORD=your_password
JWT_SECRET=a_random_32_char_string
```

### 2. Start
```bash
docker compose up --build
```

Open [http://localhost:5173](http://localhost:5173)

### 3. First use
1. Log in at `/login`
2. Go to `/admin` → create a community → upload documents
3. Wait for status to show `processed`
4. Go to `/chat` → select the community → ask questions

---

## Pinecone index setup

Create the index with these settings:
- **Name**: `sammy-docs` (or whatever you set in `PINECONE_INDEX`)
- **Dimensions**: `768`
- **Metric**: `cosine`

---

## Environment variables

| Variable | Description | Default |
|---|---|---|
| `PINECONE_API_KEY` | Pinecone API key | — |
| `PINECONE_INDEX` | Pinecone index name | `sammy-docs` |
| `PARSER_URL` | Parser service URL | `http://parser:8000` |
| `DATABASE_PATH` | SQLite file path | `/app/data/sammy.db` |
| `PORT` | Backend port | `3000` |
| `AUTH_USERNAME` | Login username | `admin` |
| `AUTH_PASSWORD` | Login password | — |
| `JWT_SECRET` | JWT signing secret (32+ chars) | — |
| `JWT_EXPIRY` | Token expiry | `8h` |

---

## Roadmap

- [ ] Streaming responses (SSE)
- [ ] Re-process / delete documents
- [ ] Community-level API keys
- [ ] Swap Cursor CLI → direct Claude API
