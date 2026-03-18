import { Elysia, t } from "elysia"
import { communities, getUserByUsername, getCommunityById, HARDCODED_PASSWORD } from "../config"
import { signToken } from "../middleware/auth"

export const authRoutes = new Elysia({ prefix: "/api/auth" })
  .get("/communities", () => communities)
  .post(
    "/login",
    async ({ body, error }) => {
      const { communityId, username, password } = body

      if (password !== HARDCODED_PASSWORD) {
        return error(401, { message: "Invalid credentials" })
      }

      const community = getCommunityById(communityId)
      if (!community) {
        return error(401, { message: "Invalid credentials" })
      }

      const user = getUserByUsername(communityId, username)
      if (!user) {
        return error(401, { message: "Invalid credentials" })
      }

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
