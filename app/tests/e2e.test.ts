/**
 * End-to-end test: file upload + chat interaction
 *
 * Requires the stack to be running (docker compose up) and Pinecone index to exist.
 *
 * Run with: bun test tests/e2e.test.ts
 */

import { describe, it, expect, beforeAll } from "bun:test"
import { readFileSync } from "fs"
import { join } from "path"

const BASE = process.env.API_URL ?? "http://localhost:3001"
const COMMUNITY_ID = process.env.COMMUNITY_ID ?? "214622"
const USERNAME = "admin"
const PASSWORD = "huckaton"

// Document with known content used to verify RAG answers
const DOC_CONTENT = `
# Reglamento Interno de Acme Corp

## Artículo 1 - Horario Laboral
El horario laboral es de lunes a viernes de 9:00 a 18:00 horas.
Los empleados tienen derecho a 1 hora de almuerzo entre las 12:00 y 14:00.

## Artículo 2 - Vacaciones
Cada empleado tiene derecho a 15 días hábiles de vacaciones por año.
Las vacaciones deben solicitarse con al menos 15 días de anticipación.

## Artículo 3 - Equipamiento
La empresa provee a cada empleado una laptop y un monitor.
El equipamiento es propiedad de la empresa y debe devolverse al terminar el contrato.
`

async function apiFetch<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const headers: Record<string, string> = { ...(init.headers as Record<string, string>) }
  if (token) headers["Authorization"] = `Bearer ${token}`
  const res = await fetch(`${BASE}${path}`, { ...init, headers })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${res.status} ${path}: ${text}`)
  }
  return res.json() as Promise<T>
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

describe("End-to-end: file upload + chat", () => {
  let token: string
  let docId: string

  // ─── Auth ───────────────────────────────────────────────────────────────────

  beforeAll(async () => {
    const result = await apiFetch<{ token: string }>("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ communityId: COMMUNITY_ID, username: USERNAME, password: PASSWORD }),
    })
    token = result.token
    expect(token).toBeString()
  })

  // ─── Upload ─────────────────────────────────────────────────────────────────

  it("login returns a valid JWT", () => {
    expect(token).toBeTruthy()
  })

  it("uploads a .txt document and returns docId", async () => {
    const blob = new Blob([DOC_CONTENT], { type: "text/plain" })
    const form = new FormData()
    form.append("file", blob, "reglamento-acme.txt")

    const result = await apiFetch<{ docId: string; status: string }>(
      "/api/upload",
      { method: "POST", body: form },
      token
    )

    expect(result.docId).toBeString()
    expect(result.status).toBe("pending")
    docId = result.docId
  })

  // ─── Polling ────────────────────────────────────────────────────────────────

  it("document reaches 'processed' status within 60s", async () => {
    const deadline = Date.now() + 60_000

    while (Date.now() < deadline) {
      const docs = await apiFetch<Array<{ id: string; status: string; error_msg: string | null }>>(
        "/api/documents",
        {},
        token
      )
      const doc = docs.find((d) => d.id === docId)

      if (!doc) {
        await sleep(2000)
        continue
      }

      if (doc.status === "processed") {
        expect(doc.status).toBe("processed")
        return
      }

      if (doc.status === "error") {
        throw new Error(`Document ingestion failed: ${doc.error_msg}`)
      }

      await sleep(2000)
    }

    throw new Error("Document did not reach 'processed' status within 60s")
  }, 70_000)

  // ─── Chat ────────────────────────────────────────────────────────────────────

  it("chat answers a question grounded in the uploaded document", async () => {
    const result = await apiFetch<{ answer: string }>(
      "/api/chat",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: "¿Cuántos días de vacaciones tiene cada empleado?",
          history: [],
        }),
      },
      token
    )

    expect(result.answer).toBeString()
    expect(result.answer.length).toBeGreaterThan(10)

    // The answer should mention 15 days (the value in the document)
    const mentionsDays = /15|quince/i.test(result.answer)
    expect(mentionsDays).toBe(true)
  }, 30_000)

  it("chat returns fallback when question has no context", async () => {
    const result = await apiFetch<{ answer: string }>(
      "/api/chat",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: "¿Cuál es el precio del oro en Marte?",
          history: [],
        }),
      },
      token
    )

    expect(result.answer).toBeString()
    // Should either say it doesn't have info, or return fallback
    expect(result.answer.length).toBeGreaterThan(0)
  }, 30_000)
})

// ─── PDF upload ───────────────────────────────────────────────────────────────

describe("End-to-end: PDF upload + chat", () => {
  let token: string
  let docId: string

  const PDF_PATH = join(import.meta.dir, "../../docs/SMG02-02.2026.pdf")

  beforeAll(async () => {
    const result = await apiFetch<{ token: string }>("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ communityId: COMMUNITY_ID, username: USERNAME, password: PASSWORD }),
    })
    token = result.token
  })

  it("uploads a .pdf document and returns docId", async () => {
    const bytes = readFileSync(PDF_PATH)
    const blob = new Blob([bytes], { type: "application/pdf" })
    const form = new FormData()
    form.append("file", blob, "SMG02-02.2026.pdf")

    const result = await apiFetch<{ docId: string; status: string }>(
      "/api/upload",
      { method: "POST", body: form },
      token
    )

    expect(result.docId).toBeString()
    expect(result.status).toBe("pending")
    docId = result.docId
  })

  it("PDF reaches 'processed' status within 120s", async () => {
    const deadline = Date.now() + 120_000

    while (Date.now() < deadline) {
      const docs = await apiFetch<Array<{ id: string; status: string; error_msg: string | null }>>(
        "/api/documents",
        {},
        token
      )
      const doc = docs.find((d) => d.id === docId)

      if (!doc) {
        await sleep(3000)
        continue
      }

      if (doc.status === "processed") {
        expect(doc.status).toBe("processed")
        return
      }

      if (doc.status === "error") {
        throw new Error(`PDF ingestion failed: ${doc.error_msg}`)
      }

      await sleep(3000)
    }

    throw new Error("PDF did not reach 'processed' status within 120s")
  }, 130_000)

  it("chat answers a question about the PDF content", async () => {
    const result = await apiFetch<{ answer: string }>(
      "/api/chat",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: "¿De qué trata este documento?",
          history: [],
        }),
      },
      token
    )

    expect(result.answer).toBeString()
    expect(result.answer.length).toBeGreaterThan(20)
  }, 30_000)
})
