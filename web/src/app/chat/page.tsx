"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { api, type ChatMessage } from "@/lib/api"
import { getUser, clearSession, isLoggedIn } from "@/lib/auth"

export default function ChatPage() {
  const router = useRouter()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const user = getUser()

  useEffect(() => {
    if (!isLoggedIn()) { router.replace("/login") }
  }, [router])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, loading])

  const sendMessage = async () => {
    const q = input.trim()
    if (!q || loading) return
    setInput("")

    const userMsg: ChatMessage = { role: "user", content: q }
    setMessages((prev) => [...prev, userMsg])
    setLoading(true)

    try {
      const { answer } = await api.chat(q, [...messages, userMsg])
      setMessages((prev) => [...prev, { role: "assistant", content: answer }])
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error"
      setMessages((prev) => [...prev, { role: "assistant", content: `Error: ${msg}` }])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const logout = () => { clearSession(); router.replace("/login") }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.headerTitle}>Sammy Chat</h1>
          <span style={styles.community}>{user?.communityId}</span>
        </div>
        <div style={styles.headerRight}>
          {user?.role === "admin" && (
            <button onClick={() => router.push("/admin")} style={styles.linkBtn}>Admin</button>
          )}
          <button onClick={logout} style={styles.linkBtn}>Logout</button>
        </div>
      </header>

      <div style={styles.messages}>
        {messages.length === 0 && (
          <div style={styles.emptyState}>
            <p>Ask a question about your documents.</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={{ ...styles.bubble, ...(msg.role === "user" ? styles.userBubble : styles.aiBubble) }}>
            <div style={styles.bubbleLabel}>{msg.role === "user" ? "You" : "Sammy"}</div>
            {msg.role === "assistant" ? (
              <div style={styles.markdown} className="markdown">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
              </div>
            ) : (
              <div style={styles.bubbleText}>{msg.content}</div>
            )}
          </div>
        ))}
        {loading && (
          <div style={{ ...styles.bubble, ...styles.aiBubble }}>
            <div style={styles.bubbleLabel}>Sammy</div>
            <div style={{ ...styles.bubbleText, color: "#9ca3af" }}>Thinking...</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={styles.inputBar}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question... (Enter to send, Shift+Enter for newline)"
          style={styles.textarea}
          rows={2}
          disabled={loading}
        />
        <button onClick={sendMessage} disabled={loading || !input.trim()} style={styles.sendBtn}>
          Send
        </button>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: { display: "flex", flexDirection: "column", height: "100vh", background: "#f5f5f5" },
  header: {
    background: "#fff",
    borderBottom: "1px solid #e5e7eb",
    padding: "1rem 2rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexShrink: 0,
  },
  headerTitle: { margin: 0, fontSize: "1.25rem", fontWeight: 700 },
  community: { fontSize: "0.8rem", color: "#6b7280", textTransform: "uppercase", letterSpacing: 1 },
  headerRight: { display: "flex", gap: "1rem" },
  linkBtn: {
    background: "none",
    border: "none",
    color: "#2563eb",
    cursor: "pointer",
    fontSize: "0.9rem",
    fontWeight: 600,
    padding: "0.25rem 0.5rem",
  },
  messages: {
    flex: 1,
    overflowY: "auto",
    padding: "1.5rem",
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    maxWidth: 800,
    width: "100%",
    margin: "0 auto",
    boxSizing: "border-box",
  },
  emptyState: {
    textAlign: "center",
    color: "#9ca3af",
    marginTop: "4rem",
  },
  bubble: {
    padding: "0.75rem 1rem",
    borderRadius: 12,
    maxWidth: "80%",
    lineHeight: 1.6,
  },
  userBubble: {
    alignSelf: "flex-end",
    background: "#2563eb",
    color: "#fff",
  },
  aiBubble: {
    alignSelf: "flex-start",
    background: "#fff",
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
    color: "#111",
  },
  bubbleLabel: { fontSize: "0.7rem", fontWeight: 700, marginBottom: "0.25rem", opacity: 0.7 },
  bubbleText: { whiteSpace: "pre-wrap", wordBreak: "break-word" },
  markdown: {
    wordBreak: "break-word",
    lineHeight: 1.7,
    fontSize: "0.95rem",
  },
  inputBar: {
    background: "#fff",
    borderTop: "1px solid #e5e7eb",
    padding: "1rem 1.5rem",
    display: "flex",
    gap: "0.75rem",
    alignItems: "flex-end",
    flexShrink: 0,
    maxWidth: 800,
    width: "100%",
    margin: "0 auto",
    boxSizing: "border-box",
  },
  textarea: {
    flex: 1,
    padding: "0.6rem 0.8rem",
    borderRadius: 8,
    border: "1px solid #d1d5db",
    fontSize: "1rem",
    resize: "none",
    fontFamily: "inherit",
    lineHeight: 1.5,
  },
  sendBtn: {
    padding: "0.6rem 1.25rem",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontSize: "0.95rem",
    fontWeight: 600,
    cursor: "pointer",
  },
}
