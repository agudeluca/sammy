import { Elysia, t } from "elysia"
import { communities, getUserByUsername, getCommunityById, HARDCODED_PASSWORD } from "../config"
import { signToken } from "../middleware/auth"

export const authRoutes = new Elysia({ prefix: "/api/auth" })
  .get("/communities", () => communities)
  .post(
    "/login",
    async ({ body }) => {
      const { communityId, username, password } = body

      const unauthorized = () =>
        new Response(JSON.stringify({ message: "Invalid credentials" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        })

      if (password !== HARDCODED_PASSWORD) return unauthorized()

      const community = getCommunityById(communityId)
      if (!community) return unauthorized()

      const user = getUserByUsername(communityId, username)
      if (!user) return unauthorized()

      const token = await signToken({
        userId: user.id,
        username: user.username,
        communityId: user.communityId,
        role: user.role,
      })

      return {
        token,
        user: {
          id: user.id,
          username: user.username,
          communityId: user.communityId,
          role: user.role,
        },
      }
    },
    {
      body: t.Object({
        communityId: t.String(),
        username: t.String(),
        password: t.String(),
      }),
    }
  )
