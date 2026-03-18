import { Elysia, t } from "elysia"
import { rateLimit } from "elysia-rate-limit"
import { requireAuth } from "../middleware/auth"
import { embedQuery } from "../services/llm"
import { queryChunks } from "../services/pinecone"
import { generateAnswer, type ChatMessage } from "../services/llm"

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
    async ({ body, user, error }) => {
      const { question, history } = body

      const queryVec = await embedQuery(question)
      const chunks = await queryChunks(user.communityId, queryVec, 10)

      if (chunks.length === 0) {
        return { answer: "No tengo suficiente información en los documentos para responder eso." }
      }

      const contextChunks = chunks.map((c) => `[${c.filename} / ${c.section || "General"}]\n${c.text}`)

      const answer = await generateAnswer(question, contextChunks, (history ?? []) as ChatMessage[])
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
