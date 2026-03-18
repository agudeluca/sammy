import { Database } from "bun:sqlite";
import { config } from "./config";

const db = new Database(config.databasePath, { create: true });

db.exec(`
  CREATE TABLE IF NOT EXISTS communities (
    id   TEXT PRIMARY KEY,
    name TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS documents (
    id           TEXT PRIMARY KEY,
    community_id TEXT NOT NULL,
    filename     TEXT NOT NULL,
    status       TEXT NOT NULL DEFAULT 'pending',
    error_msg    TEXT,
    created_at   TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

export default db;
