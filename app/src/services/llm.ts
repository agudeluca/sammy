import Anthropic from "@anthropic-ai/sdk"
import { pipeline, env } from "@huggingface/transformers"
import { config } from "../config"
import {
  getVacationBalance,
  formatVacationContext,
  searchKnowledgeLibrary,
  formatKnowledgeContext,
  listKnowledgeLibrary,
  formatKnowledgeList,
} from "./redash"
import { queryChunks } from "./pinecone"

const anthropic = new Anthropic({ apiKey: config.anthropicApiKey })

// Cache model in /app/.cache so it persists across container restarts
env.cacheDir = "/app/.cache/hf"

const BATCH_SIZE = 32

type EmbeddingPipeline = Awaited<ReturnType<typeof pipeline>>
let _embedder: EmbeddingPipeline | null = null

async function getEmbedder(): Promise<EmbeddingPipeline> {
  if (!_embedder) {
    _embedder = await pipeline("feature-extraction", "Xenova/all-mpnet-base-v2", { dtype: "q8" })
  }
  return _embedder
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const embedder = await getEmbedder()
  const results: number[][] = []
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE)
    const output = await embedder(batch, { pooling: "mean", normalize: true })
    results.push(...(output.tolist() as number[][]))
  }
  return results
}

export async function embedQuery(text: string): Promise<number[]> {
  const [vec] = await embedTexts([text])
  return vec
}

export interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

export interface ChatContext {
  instanceId: number | undefined
  userId: number | undefined
  communityId: string
}

const REDASH_TOOLS: Anthropic.Tool[] = [
  {
    name: "get_vacation_balance",
    description:
      "Obtiene el saldo de vacaciones y tiempo libre del empleado autenticado. Usar cuando el usuario pregunta sobre sus días disponibles, saldo de licencias, cuántas vacaciones tiene, tiempo libre, ausencias, PTO, etc.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "list_knowledge_articles",
    description:
      "Lista todas las categorías y artículos disponibles en la librería de conocimientos. Usar cuando el usuario quiere ver qué temas hay disponibles, listar artículos, explorar la librería, o no especifica un tema concreto.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "search_knowledge_library",
    description:
      "Busca artículos en la librería de conocimientos de la comunidad sobre políticas, procedimientos, beneficios, reglamentos internos y cualquier información institucional. Usar cuando el usuario pregunta sobre un tema específico.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "La consulta de búsqueda" },
      },
      required: ["query"],
    },
  },
  {
    name: "search_documents",
    description:
      "Busca en los documentos y archivos subidos a la comunidad (manuales, reglamentos, presentaciones, contratos). Usar para preguntas sobre contenido específico de documentos.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "La consulta de búsqueda" },
      },
      required: ["query"],
    },
  },
]

const SYSTEM_PROMPT = `Eres Sammy, un asistente amable que responde preguntas del equipo. Sé directo y conciso.

Tienes acceso a herramientas para obtener información actualizada:
- get_vacation_balance: para preguntas sobre vacaciones, saldo de tiempo libre, días disponibles, licencias
- list_knowledge_articles: para listar o explorar qué temas/categorías hay en la librería de conocimientos
- search_knowledge_library: para buscar sobre un tema específico en la librería de conocimientos
- search_documents: para buscar en documentos subidos (manuales, reglamentos, presentaciones)

Reglas:
- Usa las herramientas cuando la pregunta lo requiera. Puedes llamar múltiples herramientas si es necesario.
- Responde únicamente con información de los resultados de las herramientas. No uses conocimiento externo.
- Si las herramientas no devuelven información relevante, di: "No encontré esa información en los documentos."
- Responde en el mismo idioma en que te hablan.`

async function executeTool(
  name: string,
  input: Record<string, string>,
  ctx: ChatContext
): Promise<string> {
  try {
    if (name === "get_vacation_balance") {
      if (!ctx.instanceId || !ctx.userId) {
        return "No hay datos de Redash configurados para esta comunidad."
      }
      const balances = await getVacationBalance(ctx.instanceId, ctx.userId)
      return formatVacationContext(balances)
    }

    if (name === "list_knowledge_articles") {
      if (!ctx.instanceId) {
        return "No hay librería de conocimientos configurada para esta comunidad."
      }
      const articles = await listKnowledgeLibrary(ctx.instanceId)
      return formatKnowledgeList(articles) || "No se encontraron artículos en la librería de conocimientos."
    }

    if (name === "search_knowledge_library") {
      if (!ctx.instanceId) {
        return "No hay librería de conocimientos configurada para esta comunidad."
      }
      const articles = await searchKnowledgeLibrary(ctx.instanceId, input.query, 5)
      return formatKnowledgeContext(articles) || "No se encontraron artículos relevantes."
    }

    if (name === "search_documents") {
      const queryVec = await embedQuery(input.query)
      const chunks = await queryChunks(ctx.communityId, queryVec, 10)
      if (chunks.length === 0) return "No se encontraron documentos relevantes."
      return chunks
        .map((c) => `[${c.filename} / ${c.section || "General"}]\n${c.text}`)
        .join("\n\n---\n\n")
    }

    return `Herramienta desconocida: ${name}`
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[executeTool] ${name} failed:`, msg)
    return `Error al ejecutar ${name}: ${msg}`
  }
}

export async function generateAnswerWithTools(
  question: string,
  history: ChatMessage[],
  ctx: ChatContext
): Promise<string> {
  const messages: Anthropic.MessageParam[] = [
    ...history.map((m) => ({ role: m.role, content: m.content } as Anthropic.MessageParam)),
    { role: "user", content: question },
  ]

  // First call: Claude decides which tools to use
  const firstResponse = await anthropic.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    tools: REDASH_TOOLS,
    messages,
  })

  if (firstResponse.stop_reason !== "tool_use") {
    const textBlock = firstResponse.content.find((b) => b.type === "text")
    if (!textBlock || textBlock.type !== "text") throw new Error("Empty response from Anthropic API")
    return textBlock.text
  }

  // Execute all tool calls in parallel
  const toolUseBlocks = firstResponse.content.filter(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
  )
  const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
    toolUseBlocks.map(async (block) => {
      const result = await executeTool(block.name, block.input as Record<string, string>, ctx)
      return {
        type: "tool_result" as const,
        tool_use_id: block.id,
        content: result,
      }
    })
  )

  // Second call: Claude generates final response with tool results
  const secondResponse = await anthropic.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    tools: REDASH_TOOLS,
    messages: [
      ...messages,
      { role: "assistant", content: firstResponse.content },
      { role: "user", content: toolResults },
    ],
  })

  const textBlock = secondResponse.content.find((b) => b.type === "text")
  if (!textBlock || textBlock.type !== "text") throw new Error("Empty response from Anthropic API")
  return textBlock.text
}
