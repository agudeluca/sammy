import { getToken, clearToken } from "./auth";

const BASE = (import.meta.env.VITE_API_URL as string) ?? "http://localhost:3000";

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    clearToken();
    window.location.href = "/login";
    throw new Error("Session expired");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? res.statusText);
  }

  return res.json() as Promise<T>;
}

// Auth
export function login(username: string, password: string) {
  return request<{ token: string }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

// Communities
export interface Community {
  id: string;
  name: string;
}

export function getCommunities() {
  return request<Community[]>("/api/communities");
}

export function createCommunity(name: string) {
  return request<Community>("/api/communities", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

// Documents
export interface Document {
  id: string;
  filename: string;
  status: "pending" | "processed" | "error";
  error_msg: string | null;
  created_at: string;
}

export function getDocuments(communityId: string) {
  return request<Document[]>(`/api/documents?community_id=${communityId}`);
}

export function uploadDocument(file: File, communityId: string) {
  const form = new FormData();
  form.append("file", file);
  form.append("community_id", communityId);
  return request<{ doc_id: string; status: string }>("/api/upload", {
    method: "POST",
    body: form,
  });
}

// Chat
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export function sendChat(
  communityId: string,
  question: string,
  history: ChatMessage[]
) {
  return request<{ answer: string }>("/api/chat", {
    method: "POST",
    body: JSON.stringify({ community_id: communityId, question, history }),
  });
}
