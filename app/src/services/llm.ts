import Anthropic from "@anthropic-ai/sdk"
import { pipeline, env } from "@huggingface/transformers"
import { config } from "../config"

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

export async function generateAnswer(question: string, contextChunks: string[], history: ChatMessage[]): Promise<string> {
  const contextBlock = contextChunks
    .map((chunk, i) => `[${i + 1}] ${chunk}`)
    .join("\n\n---\n\n")

  const systemPrompt = `Eres Sammy, un asistente amable que responde preguntas basándose en los documentos del equipo. Sé directo y conciso.

Reglas:
- Responde únicamente con información del contexto provisto. No uses conocimiento externo.
- Si el contexto no contiene la respuesta, di: "No encontré esa información en los documentos."
- Cita las fuentes con [1], [2], etc. cuando sea útil.
- Responde en el mismo idioma en que te hablan.

Contexto:
${contextBlock}`

  const response = await anthropic.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 1024,
    system: systemPrompt,
    messages: [
      ...history.map((m) => ({ role: m.role, content: m.content }) as Anthropic.MessageParam),
      { role: "user", content: question },
    ],
  })

  const block = response.content.find((b) => b.type === "text")
  if (!block || block.type !== "text") throw new Error("Empty response from Anthropic API")
  return block.text
}
