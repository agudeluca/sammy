import { Elysia, t } from "elysia"
import { rateLimit } from "elysia-rate-limit"
import { requireAuth } from "../middleware/auth"
import { embedQuery, generateAnswer, type ChatMessage } from "../services/llm"
import { queryChunks } from "../services/pinecone"
import {
  getVacationBalance,
  formatVacationContext,
  isVacationQuery,
  searchKnowledgeLibrary,
  formatKnowledgeContext,
} from "../services/redash"
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

      const contextChunks: string[] = []

      const instanceId = communityInstanceMap[user.communityId]

      // ── 1. Vacaciones: datos en tiempo real desde Redash ─────────────────────
      //    Solo se activa si la pregunta tiene palabras clave de tiempo libre
      if (instanceId && isVacationQuery(question)) {
        try {
          const userRecord = getUserByCommunity(user.communityId, user.username)
          if (userRecord) {
            const balances = await getVacationBalance(instanceId, Number(userRecord.id))
            const ctx = formatVacationContext(balances)
            if (ctx) contextChunks.push(ctx)
          }
        } catch (err) {
          // Redash no disponible → seguimos sin ese contexto
          console.error("[Redash/vacaciones] Error:", err)
        }
      }

      // ── 2. Librería de conocimientos desde Redash ────────────────────────────
      //    Se busca para toda pregunta; solo se agrega si hay artículos relevantes
      if (instanceId) {
        try {
          const articles = await searchKnowledgeLibrary(instanceId, question, 5)
          const ctx = formatKnowledgeContext(articles)
          if (ctx) contextChunks.push(ctx)
        } catch (err) {
          console.error("[Redash/knowledge] Error:", err)
        }
      }

      // ── 3. Documentos indexados en Pinecone ──────────────────────────────────
      try {
        const queryVec = await embedQuery(question)
        const pineconeChunks = await queryChunks(user.communityId, queryVec, 10)
        const docChunks = pineconeChunks.map(
          (c) => `[${c.filename} / ${c.section || "General"}]\n${c.text}`
        )
        contextChunks.push(...docChunks)
      } catch (err) {
        console.error("[Pinecone] Error:", err)
      }

      // ── 4. Sin contexto en absoluto ──────────────────────────────────────────
      if (contextChunks.length === 0) {
        return {
          answer:
            "No tengo suficiente información para responder eso. Podés consultar a tu equipo de RRHH.",
        }
      }

      // ── 5. Generar respuesta con Claude ──────────────────────────────────────
      const answer = await generateAnswer(
        question,
        contextChunks,
        (history ?? []) as ChatMessage[]
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
