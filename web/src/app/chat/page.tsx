"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import IconButton from "@mui/material/IconButton"
import TextField from "@mui/material/TextField"
import Paper from "@mui/material/Paper"
import SendIcon from "@mui/icons-material/Send"
import AppHeader from "@/components/AppHeader"
import { api, type ChatMessage } from "@/lib/api"
import { getUser, isLoggedIn } from "@/lib/auth"

export default function ChatPage() {
  const router = useRouter()
  const user = getUser()
  const storageKey = `sammy_chat_${user?.communityId}_${user?.username}`

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window === "undefined") return []
    try {
      const saved = localStorage.getItem(storageKey)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace("/login")
    }
  }, [router])

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages))
    } catch {}
  }, [messages, storageKey])

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        bgcolor: "background.default",
      }}
    >
      <AppHeader user={user} showAdminLink={user?.role === "admin"} />

      {/* Messages */}
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          py: 3,
          px: 2,
          display: "flex",
          flexDirection: "column",
          gap: 2,
          maxWidth: 800,
          width: "100%",
          mx: "auto",
          boxSizing: "border-box",
        }}
      >
        {messages.length === 0 && (
          <Box
            sx={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              color: "text.secondary",
              mt: 8,
            }}
          >
            <Box sx={{ position: "relative", width: 72, height: 72, opacity: 0.35 }}>
              <Image src="/sammy.png" alt="Sammy" fill style={{ objectFit: "contain" }} />
            </Box>
            <Typography variant="body1" color="text.secondary">
              Hacé una pregunta sobre tus documentos
            </Typography>
          </Box>
        )}

        {messages.map((msg, i) => (
          <Box
            key={i}
            sx={{
              display: "flex",
              justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
            }}
          >
            <Box
              sx={{
                maxWidth: "80%",
                ...(msg.role === "user"
                  ? {
                      bgcolor: "primary.main",
                      color: "primary.contrastText",
                      borderRadius: "12px 12px 2px 12px",
                    }
                  : {
                      bgcolor: "background.paper",
                      color: "text.primary",
                      border: "1px solid",
                      borderColor: "grey.100",
                      borderRadius: "12px 12px 12px 2px",
                    }),
                px: 2,
                py: 1.5,
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  display: "block",
                  fontWeight: 700,
                  mb: 0.5,
                  opacity: 0.7,
                  fontSize: "0.7rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {msg.role === "user" ? "Vos" : "Sammy"}
              </Typography>
              {msg.role === "assistant" ? (
                <Box
                  className="markdown"
                  sx={{
                    "& p": { m: 0 },
                    "& p + p": { mt: 1 },
                    lineHeight: 1.7,
                    fontSize: "0.95rem",
                  }}
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                </Box>
              ) : (
                <Typography
                  variant="body2"
                  sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word", lineHeight: 1.6 }}
                >
                  {msg.content}
                </Typography>
              )}
            </Box>
          </Box>
        ))}

        {loading && (
          <Box sx={{ display: "flex", justifyContent: "flex-start" }}>
            <Box
              sx={{
                bgcolor: "background.paper",
                border: "1px solid",
                borderColor: "grey.100",
                borderRadius: "12px 12px 12px 2px",
                px: 2,
                py: 1.5,
                maxWidth: "80%",
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  display: "block",
                  fontWeight: 700,
                  mb: 0.5,
                  opacity: 0.7,
                  fontSize: "0.7rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Sammy
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                Pensando...
              </Typography>
            </Box>
          </Box>
        )}
        <div ref={bottomRef} />
      </Box>

      {/* Input bar */}
      <Box
        sx={{
          borderTop: "1px solid",
          borderColor: "grey.100",
          bgcolor: "background.paper",
          p: 2,
          maxWidth: 800,
          width: "100%",
          mx: "auto",
          boxSizing: "border-box",
        }}
      >
        <Paper
          elevation={0}
          sx={{
            display: "flex",
            alignItems: "flex-end",
            gap: 1,
            border: "1px solid",
            borderColor: "grey.200",
            borderRadius: 3,
            px: 2,
            py: 1,
            "&:focus-within": {
              borderColor: "primary.main",
            },
          }}
        >
          <TextField
            multiline
            maxRows={4}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Hacé una pregunta… (Enter para enviar, Shift+Enter para nueva línea)"
            disabled={loading}
            variant="standard"
            fullWidth
            sx={{
              "& .MuiInput-underline:before": { display: "none" },
              "& .MuiInput-underline:after": { display: "none" },
              "& textarea": { fontSize: "0.95rem", py: 0.5 },
            }}
            InputProps={{ disableUnderline: true }}
          />
          <IconButton
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            color="primary"
            size="small"
            sx={{
              bgcolor: "primary.main",
              color: "#fff",
              mb: 0.25,
              flexShrink: 0,
              "&:hover": { bgcolor: "primary.dark" },
              "&.Mui-disabled": { bgcolor: "grey.200", color: "grey.400" },
            }}
          >
            <SendIcon fontSize="small" />
          </IconButton>
        </Paper>
      </Box>
    </Box>
  )
}
