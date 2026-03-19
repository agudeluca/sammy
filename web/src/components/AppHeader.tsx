"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import AppBar from "@mui/material/AppBar"
import Toolbar from "@mui/material/Toolbar"
import Typography from "@mui/material/Typography"
import Box from "@mui/material/Box"
import Chip from "@mui/material/Chip"
import Avatar from "@mui/material/Avatar"
import Popover from "@mui/material/Popover"
import Divider from "@mui/material/Divider"
import Button from "@mui/material/Button"
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined"
import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined"
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline"
import { clearSession } from "@/lib/auth"
import type { SessionUser } from "@/lib/auth"

interface AppHeaderProps {
  user: SessionUser | null
  showAdminLink?: boolean
  showChatLink?: boolean
  extraActions?: React.ReactNode
}

function getInitials(username: string) {
  return username.slice(0, 2).toUpperCase()
}

function stringToColor(str: string) {
  // Deterministic color from string
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  const colors = ["#496BE3", "#886BFF", "#6FD1E7", "#4ED364", "#F0B623"]
  return colors[Math.abs(hash) % colors.length]
}

export default function AppHeader({
  user,
  showAdminLink,
  showChatLink,
  extraActions,
}: AppHeaderProps) {
  const router = useRouter()
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)

  const handleOpenMenu = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget)
  const handleClose = () => setAnchorEl(null)

  const handleLogout = () => {
    handleClose()
    clearSession()
    router.replace("/login")
  }

  const open = Boolean(anchorEl)

  return (
    <AppBar
      position="static"
      color="inherit"
      elevation={0}
      sx={{ borderBottom: "1px solid", borderColor: "grey.100" }}
    >
      <Toolbar sx={{ px: { xs: 2, sm: 3 }, gap: 1, minHeight: 56 }}>
        {/* Logo */}
        <Box sx={{ position: "relative", width: 30, height: 30, mr: 0.5, flexShrink: 0 }}>
          <Image src="/sammy.png" alt="Sammy" fill style={{ objectFit: "contain" }} />
        </Box>
        <Typography variant="h6" sx={{ fontWeight: 700, color: "text.primary", fontSize: "1rem" }}>
          Sammy
        </Typography>
        {user?.communityId && (
          <Chip
            label={user.communityId}
            size="small"
            sx={{
              ml: 1,
              fontSize: "0.68rem",
              fontWeight: 600,
              bgcolor: "primary.light",
              color: "primary.dark",
              height: 22,
            }}
          />
        )}

        <Box sx={{ flexGrow: 1 }} />

        {/* Nav links */}
        {showAdminLink && (
          <Button
            size="small"
            startIcon={<AdminPanelSettingsOutlinedIcon />}
            onClick={() => router.push("/admin")}
            sx={{ color: "text.secondary", fontWeight: 600, fontSize: "0.85rem" }}
          >
            Admin
          </Button>
        )}
        {showChatLink && (
          <Button
            size="small"
            startIcon={<ChatBubbleOutlineIcon />}
            onClick={() => router.push("/chat")}
            sx={{ color: "text.secondary", fontWeight: 600, fontSize: "0.85rem" }}
          >
            Chat
          </Button>
        )}

        {extraActions}

        {/* Username + Avatar button */}
        {user && (
          <Box
            onClick={handleOpenMenu}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              ml: 0.5,
              px: 1,
              py: 0.5,
              borderRadius: 2,
              cursor: "pointer",
              "&:hover": { bgcolor: "grey.100" },
            }}
          >
            <Typography
              variant="body2"
              sx={{
                fontWeight: 500,
                color: "text.secondary",
                display: { xs: "none", sm: "block" },
              }}
            >
              {user.username}
            </Typography>
            <Avatar
              sx={{
                width: 32,
                height: 32,
                bgcolor: stringToColor(user.username),
                fontSize: "0.75rem",
                fontWeight: 700,
              }}
            >
              {getInitials(user.username)}
            </Avatar>
          </Box>
        )}
      </Toolbar>

      {/* User popover */}
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{
          paper: {
            sx: {
              mt: 1,
              width: 280,
              borderRadius: 2,
              border: "1px solid",
              borderColor: "grey.100",
              boxShadow: "0 8px 24px rgba(0,0,0,0.10)",
              overflow: "hidden",
            },
          },
        }}
      >
        {/* User info */}
        <Box sx={{ px: 2.5, py: 2, display: "flex", alignItems: "center", gap: 1.5 }}>
          <Avatar
            sx={{
              width: 44,
              height: 44,
              bgcolor: stringToColor(user?.username ?? ""),
              fontSize: "1rem",
              fontWeight: 700,
            }}
          >
            {getInitials(user?.username ?? "")}
          </Avatar>
          <Box>
            <Typography
              variant="body2"
              sx={{ fontWeight: 700, color: "text.primary", lineHeight: 1.3 }}
            >
              {user?.username}
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              {user?.communityId}
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ borderColor: "grey.100" }} />

        {/* Logout */}
        <Box sx={{ p: 0.5 }}>
          <Button
            fullWidth
            startIcon={<LogoutOutlinedIcon sx={{ fontSize: 18 }} />}
            onClick={handleLogout}
            sx={{
              justifyContent: "flex-start",
              color: "text.primary",
              fontWeight: 600,
              fontSize: "0.9rem",
              px: 2,
              py: 1.2,
              borderRadius: 1.5,
              "&:hover": { bgcolor: "grey.50" },
            }}
          >
            Cerrar sesión
          </Button>
        </Box>
      </Popover>
    </AppBar>
  )
}
