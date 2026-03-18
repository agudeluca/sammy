import Elysia, { t } from "elysia";
import { randomUUID } from "crypto";
import { join } from "path";
import { writeFile } from "fs/promises";
import db from "../db";
import { verifyToken } from "../middleware/auth";
import { parseFile } from "../services/parser";
import { embedTexts } from "../services/parser";
import { upsertChunks, deleteByDocId } from "../services/pinecone";
import { chunkText } from "../lib/chunker";
import { config } from "../config";

const UPLOADS_DIR = join(import.meta.dir, "../../uploads");

async function processDocument(docId: string, communityId: string, file: File) {
  try {
    // 1. Parse to markdown
    const markdown = await parseFile(file);

    // 2. Chunk
    const chunks = chunkText(markdown);
    if (chunks.length === 0) throw new Error("Document produced no text");

    // 3. Delete old vectors (re-upload case)
    await deleteByDocId(communityId, docId);

    // 4. Embed in batches of 100
    const allVectors: number[][] = [];
    for (let i = 0; i < chunks.length; i += 100) {
      const batch = chunks.slice(i, i + 100);
      const vecs = await embedTexts(batch);
      allVectors.push(...vecs);
    }

    // 5. Upsert to Pinecone
    const records = chunks.map((text, i) => ({
      chunkId: `${docId}-${i}`,
      docId,
      source: file.name,
      text,
      vector: allVectors[i],
    }));
    await upsertChunks(communityId, records);

    // 6. Mark processed
    db.run(
      "UPDATE documents SET status = 'processed', error_msg = NULL WHERE id = ?",
      [docId]
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    db.run(
      "UPDATE documents SET status = 'error', error_msg = ? WHERE id = ?",
      [msg, docId]
    );
    console.error(`[ingest] doc ${docId} failed:`, msg);
  }
}

export const adminRoutes = new Elysia()
  // Communities
  .post(
    "/api/communities",
    async ({ body, request, set }) => {
      await verifyToken(request.headers.get("authorization")).catch(() => {
        set.status = 401;
        throw new Error("Unauthorized");
      });
      const id = randomUUID();
      db.run("INSERT INTO communities (id, name) VALUES (?, ?)", [id, body.name]);
      set.status = 201;
      return { id, name: body.name };
    },
    { body: t.Object({ name: t.String({ minLength: 1 }) }) }
  )
  .get("/api/communities", async ({ request, set }) => {
    await verifyToken(request.headers.get("authorization")).catch(() => {
      set.status = 401;
      throw new Error("Unauthorized");
    });
    return db.query("SELECT id, name FROM communities").all();
  })

  // Documents
  .post("/api/upload", async ({ request, set }) => {
    await verifyToken(request.headers.get("authorization")).catch(() => {
      set.status = 401;
      throw new Error("Unauthorized");
    });

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const communityId = formData.get("community_id") as string | null;

    if (!file || !communityId) {
      set.status = 400;
      return { error: "file and community_id are required" };
    }

    // Save file to disk
    const savedPath = join(UPLOADS_DIR, `${Date.now()}-${file.name}`);
    await writeFile(savedPath, Buffer.from(await file.arrayBuffer()));

    const docId = randomUUID();
    db.run(
      "INSERT INTO documents (id, community_id, filename, status) VALUES (?, ?, ?, 'pending')",
      [docId, communityId, file.name]
    );

    // Process async (fire and forget)
    processDocument(docId, communityId, file);

    set.status = 202;
    return { doc_id: docId, status: "pending" };
  })

  .get("/api/documents", async ({ query, request, set }) => {
    await verifyToken(request.headers.get("authorization")).catch(() => {
      set.status = 401;
      throw new Error("Unauthorized");
    });
    const { community_id } = query as { community_id?: string };
    if (!community_id) {
      set.status = 400;
      return { error: "community_id is required" };
    }
    return db
      .query(
        "SELECT id, filename, status, error_msg, created_at FROM documents WHERE community_id = ? ORDER BY created_at DESC"
      )
      .all(community_id);
  });
