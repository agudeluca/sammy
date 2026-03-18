import { Elysia, t } from "elysia"
import { randomUUID } from "crypto"
import { requireAdmin } from "../middleware/auth"
import { insertDocument, getDocumentsByCommunity, updateDocumentStatus } from "../db"
import { parseFile } from "../services/parser"
import { chunkMarkdown } from "../lib/chunker"
import { embedTexts } from "../services/llm"
import { upsertChunks } from "../services/pinecone"

const ALLOWED_EXTENSIONS = new Set([".pdf", ".docx", ".txt"])
const MAX_SIZE_BYTES = 50 * 1024 * 1024

async function ingestDocument(docId: string, communityId: string, buffer: Buffer, filename: string) {
  try {
    updateDocumentStatus.run("processing", null, null, docId)

    const markdown = await parseFile(buffer, filename)
    const chunks = chunkMarkdown(markdown)

    if (chunks.length === 0) {
      updateDocumentStatus.run("error", "No content extracted", null, docId)
      return
    }

    const vectors = await embedTexts(chunks.map((c) => c.text))
    await upsertChunks(communityId, docId, filename, chunks, vectors)

    updateDocumentStatus.run("processed", null, chunks.length, docId)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    updateDocumentStatus.run("error", msg, null, docId)
  }
}

export const adminRoutes = new Elysia({ prefix: "/api" })
  .use(requireAdmin)
  .post(
    "/upload",
    async ({ body, user, error }) => {
      const { file } = body
      const filename = file.name

      const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase()
      if (!ALLOWED_EXTENSIONS.has(ext)) {
        return error(422, { message: `Unsupported file type: ${ext}` })
      }

      const buffer = Buffer.from(await file.arrayBuffer())
      if (buffer.byteLength > MAX_SIZE_BYTES) {
        return error(422, { message: "File exceeds 50MB limit" })
      }

      const docId = randomUUID()
      insertDocument.run(docId, user.communityId, filename)

      // fire-and-forget
      ingestDocument(docId, user.communityId, buffer, filename).catch(() => {})

      return { docId, status: "pending" }
    },
    {
      body: t.Object({
        file: t.File(),
      }),
    }
  )
  .get("/documents", ({ user }) => {
    return getDocumentsByCommunity.all(user.communityId)
  })
