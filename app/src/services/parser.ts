import Anthropic from "@anthropic-ai/sdk"
import { config } from "../config"

const anthropic = new Anthropic({ apiKey: config.anthropicApiKey })

export async function parseFile(buffer: Buffer, filename: string): Promise<string> {
  const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase()

  if (ext === ".txt") {
    return buffer.toString("utf-8")
  }

  if (ext === ".docx") {
    const mammoth = await import("mammoth")
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  }

  if (ext === ".pdf") {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: buffer.toString("base64"),
              },
            },
            {
              type: "text",
              text: "Extract all text from this document and return it as clean markdown. Preserve headers, lists, tables and structure. Return only the extracted content, no commentary.",
            },
          ],
        },
      ],
    })
    const block = response.content.find((b) => b.type === "text")
    if (!block || block.type !== "text") throw new Error("No text extracted from PDF")
    return block.text
  }

  throw new Error(`Unsupported file type: ${ext}`)
}
