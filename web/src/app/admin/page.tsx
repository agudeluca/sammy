"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import Card from "@mui/material/Card"
import CardContent from "@mui/material/CardContent"
import Table from "@mui/material/Table"
import TableBody from "@mui/material/TableBody"
import TableCell from "@mui/material/TableCell"
import TableContainer from "@mui/material/TableContainer"
import TableHead from "@mui/material/TableHead"
import TableRow from "@mui/material/TableRow"
import Chip from "@mui/material/Chip"
import Alert from "@mui/material/Alert"
import UploadFileOutlinedIcon from "@mui/icons-material/UploadFileOutlined"
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined"
import AppHeader from "@/components/AppHeader"
import { api, type Document } from "@/lib/api"
import { getUser, isLoggedIn } from "@/lib/auth"

const STATUS_CONFIG: Record<string, { label: string; color: "default" | "warning" | "success" | "error" }> = {
  pending: { label: "Pendiente", color: "default" },
  processing: { label: "Procesando", color: "warning" },
  processed: { label: "Procesado", color: "success" },
  error: { label: "Error", color: "error" },
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
    if (!isLoggedIn()) {
      router.replace("/login")
      return
    }
    const u = getUser()
    if (u?.role !== "admin") {
      router.replace("/chat")
      return
    }
    loadDocuments()
  }, [router, loadDocuments])

  const startPolling = () => {
    if (pollRef.current) return
    pollRef.current = setInterval(loadDocuments, 3000)
  }

  useEffect(() => () => {
    if (pollRef.current) clearInterval(pollRef.current)
  }, [])

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

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh", bgcolor: "background.default" }}>
      <AppHeader user={user} showChatLink />

      <Box sx={{ maxWidth: 960, width: "100%", mx: "auto", p: { xs: 2, sm: 3 }, flex: 1 }}>
        {/* Page title */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, color: "text.primary" }}>
            Administración
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Cargá y gestioná los documentos de tu comunidad
          </Typography>
        </Box>

        {/* Upload card */}
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: "text.primary" }}>
              Subir documento
            </Typography>
            <Box
              sx={{
                border: "2px dashed",
                borderColor: dragging ? "primary.main" : "grey.200",
                borderRadius: 2,
                p: 4,
                textAlign: "center",
                cursor: "pointer",
                transition: "all 0.15s",
                bgcolor: dragging ? "primary.light" : "transparent",
                "&:hover": {
                  borderColor: "primary.main",
                  bgcolor: "primary.light",
                },
              }}
              onDragOver={(e) => {
                e.preventDefault()
                setDragging(true)
              }}
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
              <UploadFileOutlinedIcon sx={{ fontSize: 40, color: uploading ? "primary.main" : "grey.400", mb: 1 }} />
              {uploading ? (
                <Typography variant="body2" color="primary">
                  Subiendo...
                </Typography>
              ) : (
                <>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary" }}>
                    Arrastrá un archivo o hacé clic para seleccionar
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
                    PDF, DOCX, TXT — máx. 50 MB
                  </Typography>
                </>
              )}
            </Box>
            {uploadError && (
              <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
                {uploadError}
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Documents table */}
        <Card>
          <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
            <Box sx={{ px: 3, pt: 3, pb: 2, borderBottom: "1px solid", borderColor: "grey.100" }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "text.primary" }}>
                Documentos
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {documents.length} documento{documents.length !== 1 ? "s" : ""}
              </Typography>
            </Box>

            {documents.length === 0 ? (
              <Box sx={{ py: 6, textAlign: "center" }}>
                <InsertDriveFileOutlinedIcon sx={{ fontSize: 40, color: "grey.300", mb: 1.5 }} />
                <Typography variant="body2" color="text.secondary">
                  No hay documentos todavía
                </Typography>
              </Box>
            ) : (
              <TableContainer component={Box}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Archivo</TableCell>
                      <TableCell>Estado</TableCell>
                      <TableCell>Chunks</TableCell>
                      <TableCell>Fecha</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {documents.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <InsertDriveFileOutlinedIcon sx={{ fontSize: 16, color: "grey.400" }} />
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {doc.filename}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Chip
                              label={STATUS_CONFIG[doc.status]?.label ?? doc.status}
                              color={STATUS_CONFIG[doc.status]?.color ?? "default"}
                              size="small"
                            />
                            {doc.error_msg && (
                              <Typography variant="caption" color="error" sx={{ display: "block", mt: 0.5 }}>
                                {doc.error_msg}
                              </Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {doc.chunk_count ?? "—"}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {new Date(doc.created_at).toLocaleString("es-AR")}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  )
}
