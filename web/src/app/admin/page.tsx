"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { api, type Document } from "@/lib/api"
import { getUser, clearSession, isLoggedIn } from "@/lib/auth"

const STATUS_COLORS: Record<string, string> = {
  pending: "#9ca3af",
  processing: "#f59e0b",
  processed: "#10b981",
  error: "#ef4444",
}

export default function AdminPage() {
  const router = useRouter()
  const [documents, setDocuments] = useState<Document[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState("")
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const user = getUser()

  const loadDocuments = useCallback(async () => {
    try {
      const docs = await api.getDocuments()
      setDocuments(docs)
      const hasActive = docs.some((d) => d.status === "pending" || d.status === "processing")
      if (!hasActive && pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    } catch {}
  }, [])

  useEffect(() => {
    if (!isLoggedIn()) { router.replace("/login"); return }
    const u = getUser()
    if (u?.role !== "admin") { router.replace("/chat"); return }
    loadDocuments()
  }, [router, loadDocuments])

  const startPolling = () => {
    if (pollRef.current) return
    pollRef.current = setInterval(loadDocuments, 3000)
  }

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current) }, [])

  const uploadFile = async (file: File) => {
    setUploadError("")
    setUploading(true)
    try {
      await api.uploadFile(file)
      await loadDocuments()
      startPolling()
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) uploadFile(file)
    e.target.value = ""
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) uploadFile(file)
  }

  const logout = () => { clearSession(); router.replace("/login") }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.headerTitle}>Admin</h1>
          <span style={styles.community}>{user?.communityId}</span>
        </div>
        <div style={styles.headerRight}>
          <button onClick={() => router.push("/chat")} style={styles.linkBtn}>Chat</button>
          <button onClick={logout} style={styles.linkBtn}>Logout</button>
        </div>
      </header>

      <main style={styles.main}>
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Upload Document</h2>
          <div
            style={{ ...styles.dropzone, ...(dragging ? styles.dropzoneActive : {}) }}
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt"
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
            {uploading ? (
              <p>Uploading...</p>
            ) : (
              <p>Drop a file here or click to browse<br /><small style={{ color: "#888" }}>PDF, DOCX, TXT — max 50MB</small></p>
            )}
          </div>
          {uploadError && <p style={styles.error}>{uploadError}</p>}
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Documents</h2>
          {documents.length === 0 ? (
            <p style={{ color: "#888" }}>No documents yet.</p>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Filename</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Chunks</th>
                  <th style={styles.th}>Uploaded</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id}>
                    <td style={styles.td}>{doc.filename}</td>
                    <td style={styles.td}>
                      <span style={{ ...styles.badge, background: STATUS_COLORS[doc.status] }}>
                        {doc.status}
                      </span>
                      {doc.error_msg && <span style={styles.errorInline}> {doc.error_msg}</span>}
                    </td>
                    <td style={styles.td}>{doc.chunk_count ?? "—"}</td>
                    <td style={styles.td}>{new Date(doc.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </main>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: "#f5f5f5" },
  header: {
    background: "#fff",
    borderBottom: "1px solid #e5e7eb",
    padding: "1rem 2rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
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
  main: { maxWidth: 900, margin: "0 auto", padding: "2rem" },
  section: { background: "#fff", borderRadius: 12, padding: "1.5rem", marginBottom: "1.5rem", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" },
  sectionTitle: { margin: "0 0 1rem", fontSize: "1rem", fontWeight: 700 },
  dropzone: {
    border: "2px dashed #d1d5db",
    borderRadius: 8,
    padding: "2rem",
    textAlign: "center",
    cursor: "pointer",
    transition: "border-color 0.15s",
    color: "#6b7280",
  },
  dropzoneActive: { borderColor: "#2563eb", background: "#eff6ff" },
  error: { color: "#ef4444", fontSize: "0.85rem", marginTop: "0.5rem" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", padding: "0.5rem 0.75rem", borderBottom: "2px solid #e5e7eb", fontSize: "0.8rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase" },
  td: { padding: "0.75rem", borderBottom: "1px solid #f3f4f6", fontSize: "0.9rem" },
  badge: { display: "inline-block", padding: "0.2rem 0.6rem", borderRadius: 99, color: "#fff", fontSize: "0.75rem", fontWeight: 600 },
  errorInline: { color: "#ef4444", fontSize: "0.75rem" },
}
