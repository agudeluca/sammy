import OpenAI from "openai"
import { config } from "../config"

const cursor = new OpenAI({
  apiKey: config.cursorApiKey,
  baseURL: "https://api.cursor.sh/v1",
})

const BATCH_SIZE = 100

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const results: number[][] = []
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE)
    const res = await cursor.embeddings.create({
      model: "text-embedding-3-small",
      input: batch,
      dimensions: 1536,
    })
    results.push(...res.data.map((d) => d.embedding))
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

  const systemPrompt = `Eres un asistente de búsqueda de documentos. Responde ÚNICAMENTE basándote en el contexto proporcionado a continuación. No uses conocimiento externo.

Reglas:
- Cita las secciones relevantes usando los números de contexto, por ejemplo: [1], [2].
- Si el contexto no contiene suficiente información para responder la pregunta, responde exactamente: "No tengo suficiente información en los documentos para responder eso."
- Responde en el mismo idioma en que se hace la pregunta.

Contexto:
${contextBlock}`

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...history.map((m) => ({ role: m.role, content: m.content }) satisfies OpenAI.Chat.ChatCompletionMessageParam),
    { role: "user", content: question },
  ]

  const response = await cursor.chat.completions.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages,
  })

  const content = response.choices[0]?.message?.content
  if (!content) throw new Error("Empty response from Cursor API")
  return content
}
