import { Elysia, t } from "elysia"
import { rateLimit } from "elysia-rate-limit"
import { requireAuth } from "../middleware/auth"
import { generateAnswerWithTools, type ChatMessage } from "../services/llm"
import { communityInstanceMap, getUserByCommunity } from "../config"

export const chatRoutes = new Elysia({ prefix: "/api" })
  .use(
    rateLimit({
      duration: 60_000,
      max: 20,
      generator: (req, server) => server?.requestIP(req)?.address ?? "unknown",
    })
  )
  .use(requireAuth)
  .post(
    "/chat",
    async ({ body, user }) => {
      const { question, history } = body
      const instanceId = communityInstanceMap[user.communityId]
      const userRecord = getUserByCommunity(user.communityId, user.username)

      const answer = await generateAnswerWithTools(
        question,
        (history ?? []) as ChatMessage[],
        {
          instanceId,
          userId: userRecord ? Number(userRecord.id) : undefined,
          communityId: user.communityId,
        }
      )
      return { answer }
    },
    {
      body: t.Object({
        question: t.String({ minLength: 1 }),
        history: t.Optional(
          t.Array(
            t.Object({
              role: t.Union([t.Literal("user"), t.Literal("assistant")]),
              content: t.String(),
            })
          )
        ),
      }),
    }
  )
