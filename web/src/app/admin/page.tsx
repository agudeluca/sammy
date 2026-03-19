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
import Snackbar from "@mui/material/Snackbar"
import Alert from "@mui/material/Alert"
import Tooltip from "@mui/material/Tooltip"
import UploadFileOutlinedIcon from "@mui/icons-material/UploadFileOutlined"
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined"
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline"
import AppHeader from "@/components/AppHeader"
import { api, type Document } from "@/lib/api"
import { getUser, isLoggedIn } from "@/lib/auth"

const STATUS_CONFIG: Record<
  string,
  { label: string; color: "default" | "warning" | "success" | "error" }
> = {
  pending: { label: "Pendiente", color: "default" },
  processing: { label: "Procesando", color: "warning" },
  processed: { label: "Procesado", color: "success" },
  error: { label: "Error", color: "error" },
}

function parseErrorMsg(raw: string): string {
  try {
    // Strip leading HTTP status code like "400 {...}"
    const jsonStart = raw.indexOf("{")
    if (jsonStart === -1) return raw
    const parsed = JSON.parse(raw.slice(jsonStart))
    return parsed?.error?.message ?? parsed?.message ?? raw
  } catch {
    return raw
  }
}

export default function AdminPage() {
  const router = useRouter()
  const [documents, setDocuments] = useState<Document[]>([])
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [toast, setToast] = useState<{
    message: string
    severity: "error" | "success" | "info"
  } | null>(null)
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

  useEffect(
    () => () => {
      if (pollRef.current) clearInterval(pollRef.current)
    },
    [],
  )

  const uploadFile = async (file: File) => {
    setUploading(true)
    try {
      await api.uploadFile(file)
      await loadDocuments()
      startPolling()
      setToast({ message: `"${file.name}" subido correctamente`, severity: "success" })
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Error al subir"
      setToast({ message: parseErrorMsg(raw), severity: "error" })
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
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        bgcolor: "background.default",
      }}
    >
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
                "&:hover": { borderColor: "primary.main", bgcolor: "primary.light" },
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
              <UploadFileOutlinedIcon
                sx={{ fontSize: 40, color: uploading ? "primary.main" : "grey.400", mb: 1 }}
              />
              {uploading ? (
                <Typography variant="body2" color="primary">
                  Subiendo...
                </Typography>
              ) : (
                <>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: "text.primary" }}>
                    Arrastrá un archivo o hacé clic para seleccionar
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ mt: 0.5, display: "block" }}
                  >
                    PDF, DOCX, TXT — máx. 50 MB
                  </Typography>
                </>
              )}
            </Box>
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
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <Chip
                              label={STATUS_CONFIG[doc.status]?.label ?? doc.status}
                              color={STATUS_CONFIG[doc.status]?.color ?? "default"}
                              size="small"
                            />
                            {doc.error_msg && (
                              <Tooltip
                                title={parseErrorMsg(doc.error_msg)}
                                arrow
                                placement="right"
                                componentsProps={{
                                  tooltip: {
                                    sx: {
                                      bgcolor: "grey.900",
                                      color: "#fff",
                                      fontSize: "0.78rem",
                                      maxWidth: 320,
                                      borderRadius: 1.5,
                                      p: 1.5,
                                    },
                                  },
                                  arrow: { sx: { color: "grey.900" } },
                                }}
                              >
                                <ErrorOutlineIcon
                                  sx={{ fontSize: 16, color: "error.main", cursor: "help" }}
                                />
                              </Tooltip>
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

      {/* Toast */}
      <Snackbar
        open={!!toast}
        autoHideDuration={5000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setToast(null)}
          severity={toast?.severity}
          variant="filled"
          sx={{ borderRadius: 2, minWidth: 300 }}
        >
          {toast?.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}
