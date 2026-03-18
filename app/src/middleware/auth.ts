import { Elysia } from "elysia"
import { SignJWT, jwtVerify } from "jose"
import { config } from "../config"

export interface JwtPayload {
  userId: string
  username: string
  communityId: string
  role: "admin" | "collaborator"
}

const secret = new TextEncoder().encode(config.jwtSecret)

export async function signToken(payload: JwtPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(config.jwtExpiry)
    .sign(secret)
}

export async function verifyToken(token: string): Promise<JwtPayload> {
  const { payload } = await jwtVerify(token, secret)
  return payload as unknown as JwtPayload
}

function extractBearer(authHeader: string | undefined): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null
  return authHeader.slice(7)
}

function jsonError(status: number, message: string) {
  return new Response(JSON.stringify({ message }), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

export const requireAuth = new Elysia({ name: "requireAuth" }).derive(
  { as: "scoped" },
  async ({ headers }) => {
    const token = extractBearer(headers.authorization)
    if (!token) throw jsonError(401, "Missing token")

    try {
      const user = await verifyToken(token)
      return { user }
    } catch {
      throw jsonError(401, "Invalid or expired token")
    }
  }
)

export const requireAdmin = new Elysia({ name: "requireAdmin" }).derive(
  { as: "scoped" },
  async ({ headers }) => {
    const token = extractBearer(headers.authorization)
    if (!token) throw jsonError(401, "Missing token")

    let user: JwtPayload
    try {
      user = await verifyToken(token)
    } catch {
      throw jsonError(401, "Invalid or expired token")
    }

    if (user.role !== "admin") throw jsonError(403, "Admin only")
    return { user }
  }
)
