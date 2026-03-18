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

export const requireAuth = new Elysia({ name: "requireAuth" }).derive(
  { as: "scoped" },
  async ({ headers, error }) => {
    const token = extractBearer(headers.authorization)
    if (!token) return error(401, { message: "Missing token" })

    try {
      const user = await verifyToken(token)
      return { user }
    } catch {
      return error(401, { message: "Invalid or expired token" })
    }
  }
)

export const requireAdmin = new Elysia({ name: "requireAdmin" })
  .use(requireAuth)
  .derive({ as: "scoped" }, ({ user, error }) => {
    if (!user) return error(401, { message: "Unauthorized" })
    if (user.role !== "admin") return error(403, { message: "Admin only" })
    return {}
  })
