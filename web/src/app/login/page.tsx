"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { api, type Community } from "@/lib/api"
import { saveSession, isLoggedIn } from "@/lib/auth"

export default function LoginPage() {
  const router = useRouter()
  const [communities, setCommunities] = useState<Community[]>([])
  const [communityId, setCommunityId] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isLoggedIn()) {
      router.replace("/chat")
      return
    }
    api.getCommunities().then((list) => {
      setCommunities(list)
      if (list[0]) setCommunityId(list[0].id)
    })
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const result = await api.login(communityId, username, password)
      saveSession(result.token, result.user)
      router.replace(result.user.role === "admin" ? "/admin" : "/chat")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Sammy</h1>
        <p style={styles.subtitle}>Document chatbot</p>
        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>Community</label>
          <select
            value={communityId}
            onChange={(e) => setCommunityId(e.target.value)}
            style={styles.input}
            required
          >
            {communities.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <label style={styles.label}>Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={styles.input}
            placeholder="admin or your username"
            required
          />

          <label style={styles.label}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
            required
          />

          {error && <p style={styles.error}>{error}</p>}

          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? "Logging in..." : "Log in"}
          </button>
        </form>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f5f5f5",
  },
  card: {
    background: "#fff",
    borderRadius: 12,
    padding: "2rem",
    width: "100%",
    maxWidth: 400,
    boxShadow: "0 2px 16px rgba(0,0,0,0.08)",
  },
  title: { margin: "0 0 4px", fontSize: "1.8rem", fontWeight: 700 },
  subtitle: { margin: "0 0 1.5rem", color: "#666", fontSize: "0.9rem" },
  form: { display: "flex", flexDirection: "column", gap: "0.5rem" },
  label: { fontSize: "0.85rem", fontWeight: 600, color: "#444" },
  input: {
    padding: "0.6rem 0.8rem",
    borderRadius: 8,
    border: "1px solid #ddd",
    fontSize: "1rem",
    marginBottom: "0.5rem",
  },
  error: { color: "#e53e3e", fontSize: "0.85rem", margin: "0.25rem 0" },
  button: {
    marginTop: "0.5rem",
    padding: "0.75rem",
    borderRadius: 8,
    border: "none",
    background: "#2563eb",
    color: "#fff",
    fontSize: "1rem",
    fontWeight: 600,
    cursor: "pointer",
  },
}
