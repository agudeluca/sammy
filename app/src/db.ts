import { Database } from "bun:sqlite"
import { config } from "./config"

const db = new Database(config.databasePath, { create: true })

db.run("PRAGMA journal_mode = WAL")

db.run(`
  CREATE TABLE IF NOT EXISTS documents (
    id           TEXT PRIMARY KEY,
    community_id TEXT NOT NULL,
    filename     TEXT NOT NULL,
    status       TEXT NOT NULL DEFAULT 'pending',
    error_msg    TEXT,
    chunk_count  INTEGER,
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
  )
`)

export interface Document {
  id: string
  community_id: string
  filename: string
  status: "pending" | "processing" | "processed" | "error"
  error_msg: string | null
  chunk_count: number | null
  created_at: string
  updated_at: string
}

export const insertDocument = db.prepare<void, [string, string, string]>(`
  INSERT INTO documents (id, community_id, filename) VALUES (?, ?, ?)
`)

export const getDocumentsByCommunity = db.prepare<Document, [string]>(`
  SELECT * FROM documents WHERE community_id = ? ORDER BY created_at DESC
`)

export const updateDocumentStatus = db.prepare<void, [string, string | null, number | null, string]>(`
  UPDATE documents SET status = ?, error_msg = ?, chunk_count = ?, updated_at = datetime('now') WHERE id = ?
`)

export const getDocumentById = db.prepare<Document, [string]>(`
  SELECT * FROM documents WHERE id = ? LIMIT 1
`)

export default db
