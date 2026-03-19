"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Box from "@mui/material/Box"
import Card from "@mui/material/Card"
import CardContent from "@mui/material/CardContent"
import TextField from "@mui/material/TextField"
import Button from "@mui/material/Button"
import Typography from "@mui/material/Typography"
import MenuItem from "@mui/material/MenuItem"
import Alert from "@mui/material/Alert"
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
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      {/* Left panel */}
      <Box
        sx={{
          flex: 1,
          display: { xs: "none", md: "flex" },
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(145deg, #EFF2FF 0%, #CAD5FE 100%)",
          p: 6,
        }}
      >
        <Box sx={{ textAlign: "center" }}>
          <Box sx={{ mx: "auto", mb: 3, width: 140, height: 140, position: "relative" }}>
            <Image src="/sammy.png" alt="Sammy" fill style={{ objectFit: "contain" }} priority />
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: "#2C35A1", mb: 1 }}>
            Sammy
          </Typography>
          <Typography variant="body1" sx={{ color: "#496BE3", maxWidth: 280, mx: "auto" }}>
            Tu asistente inteligente de documentos
          </Typography>
        </Box>
      </Box>

      {/* Right panel */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: 4,
          backgroundColor: "background.paper",
        }}
      >
        <Box sx={{ width: "100%", maxWidth: 400 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5, color: "text.primary" }}>
            Iniciar sesión
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mb: 4 }}>
            Ingresa tus credenciales para continuar
          </Typography>

          <form onSubmit={handleSubmit}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
              <TextField
                select
                label="Comunidad"
                value={communityId}
                onChange={(e) => setCommunityId(e.target.value)}
                required
                fullWidth
                size="small"
              >
                {communities.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="Usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin o tu usuario"
                required
                fullWidth
                size="small"
                autoComplete="username"
              />

              <TextField
                label="Contraseña"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                fullWidth
                size="small"
                autoComplete="current-password"
              />

              {error && (
                <Alert severity="error" sx={{ borderRadius: 2 }}>
                  {error}
                </Alert>
              )}

              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={loading}
                fullWidth
                sx={{ mt: 0.5, py: 1.5 }}
              >
                {loading ? "Ingresando..." : "Continuar"}
              </Button>
            </Box>
          </form>

          <Typography
            variant="caption"
            sx={{ display: "block", textAlign: "center", mt: 4, color: "text.secondary" }}
          >
            Al ingresar aceptás nuestros términos de uso
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}
