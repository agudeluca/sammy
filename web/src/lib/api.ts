import { getToken, clearSession } from "./auth"

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers: HeadersInit = {
    ...(init.headers as Record<string, string>),
  }
  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`
  }

  const res = await fetch(`${BASE}${path}`, { ...init, headers })

  if (res.status === 401) {
    clearSession()
    window.location.href = "/login"
    throw new Error("Unauthorized")
  }

  if (!res.ok) {
    const text = await res.text()
    let msg = text
    try {
      const json = JSON.parse(text)
      msg = json?.message ?? json?.error ?? text
    } catch {}
    throw new Error(msg)
  }

  return res.json() as Promise<T>
}

export interface Community {
  id: string
  name: string
}

export interface LoginResult {
  token: string
  user: {
    id: string
    username: string
    communityId: string
    role: "admin" | "collaborator"
  }
}

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

export interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

export const api = {
  getCommunities(): Promise<Community[]> {
    return apiFetch("/api/auth/communities")
  },

  login(communityId: string, username: string, password: string): Promise<LoginResult> {
    return apiFetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ communityId, username, password }),
    })
  },

  uploadFile(file: File): Promise<{ docId: string; status: string }> {
    const form = new FormData()
    form.append("file", file)
    return apiFetch("/api/upload", { method: "POST", body: form })
  },

  getDocuments(): Promise<Document[]> {
    return apiFetch("/api/documents")
  },

  chat(question: string, history: ChatMessage[]): Promise<{ answer: string }> {
    return apiFetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, history }),
    })
  },
}
