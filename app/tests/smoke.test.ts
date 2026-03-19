/**
 * Smoke tests — run post-deploy to validate the production environment.
 * No document uploads, no Pinecone writes. Fast and non-destructive.
 *
 * Run with: bun test tests/smoke.test.ts
 * Against prod: API_URL=https://your-server:3011 bun test tests/smoke.test.ts
 */

import { describe, it, expect, beforeAll } from "bun:test"

const BASE = process.env.API_URL ?? "http://localhost:3001"
const COMMUNITY_ID = process.env.COMMUNITY_ID ?? "214834"
const USERNAME = "admin"
const PASSWORD = "huckaton"

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

describe("Smoke: health & auth", () => {
  let token: string

  it("health check returns ok", async () => {
    const result = await apiFetch<{ status: string }>("/health")
    expect(result.status).toBe("ok")
  })

  it("communities endpoint returns list", async () => {
    const result = await apiFetch<Array<{ id: string; name: string }>>("/api/auth/communities")
    expect(result).toBeArray()
    expect(result.length).toBeGreaterThan(0)
    expect(result[0].id).toBeString()
  })

  it("login returns a valid JWT", async () => {
    const result = await apiFetch<{ token: string }>("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ communityId: COMMUNITY_ID, username: USERNAME, password: PASSWORD }),
    })
    expect(result.token).toBeString()
    expect(result.token.length).toBeGreaterThan(10)
    token = result.token
  })

  it("invalid credentials return 401", async () => {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ communityId: COMMUNITY_ID, username: USERNAME, password: "wrong" }),
    })
    expect(res.status).toBe(401)
  })

  it("chat responds to a basic question", async () => {
    // Login first
    const loginResult = await apiFetch<{ token: string }>("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ communityId: COMMUNITY_ID, username: USERNAME, password: PASSWORD }),
    })

    const result = await apiFetch<{ answer: string }>(
      "/api/chat",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: "¿Qué podés hacer por mí?", history: [] }),
      },
      loginResult.token
    )

    expect(result.answer).toBeString()
    expect(result.answer.length).toBeGreaterThan(5)
  }, 30_000)

  it("chat returns 401 without token", async () => {
    const res = await fetch(`${BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: "test", history: [] }),
    })
    expect(res.status).toBe(401)
  })

  it("documents endpoint returns list", async () => {
    const loginResult = await apiFetch<{ token: string }>("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ communityId: COMMUNITY_ID, username: USERNAME, password: PASSWORD }),
    })

    const result = await apiFetch<Array<unknown>>("/api/documents", {}, loginResult.token)
    expect(result).toBeArray()
  })
})
