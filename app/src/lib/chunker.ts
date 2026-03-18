export interface Chunk {
  text: string
  section: string
  chunkIndex: number
}

function estimateTokens(text: string): number {
  return Math.ceil(text.split(/\s+/).filter(Boolean).length * 1.3)
}

function splitBySentence(text: string): string[] {
  const parts: string[] = []
  let current = ""
  for (let i = 0; i < text.length; i++) {
    current += text[i]
    if ((text[i] === "." || text[i] === "?" || text[i] === "!") && (text[i + 1] === " " || i === text.length - 1)) {
      const trimmed = current.trim()
      if (trimmed) parts.push(trimmed)
      current = ""
    }
  }
  const trimmed = current.trim()
  if (trimmed) parts.push(trimmed)
  return parts
}

function emitChunks(paragraphs: string[], section: string, maxTokens: number, overlapTokens: number, startIndex: number): Chunk[] {
  const chunks: Chunk[] = []
  let current: string[] = []
  let currentTokens = 0
  let chunkIdx = startIndex

  const flush = () => {
    if (current.length === 0) return
    const text = current.join("\n\n")
    chunks.push({ text, section, chunkIndex: chunkIdx++ })

    // Build overlap tail
    const overlapParts: string[] = []
    let overlapTokenCount = 0
    for (let i = current.length - 1; i >= 0; i--) {
      const t = estimateTokens(current[i])
      if (overlapTokenCount + t > overlapTokens) break
      overlapParts.unshift(current[i])
      overlapTokenCount += t
    }
    current = overlapParts
    currentTokens = overlapTokenCount
  }

  for (const para of paragraphs) {
    const paraTokens = estimateTokens(para)

    if (paraTokens > maxTokens) {
      // Oversized single paragraph — split by sentence
      flush()
      const sentences = splitBySentence(para)
      let sentBuf: string[] = []
      let sentTokens = 0

      for (const sent of sentences) {
        const st = estimateTokens(sent)
        if (sentTokens + st > maxTokens && sentBuf.length > 0) {
          chunks.push({ text: sentBuf.join(" "), section, chunkIndex: chunkIdx++ })
          sentBuf = []
          sentTokens = 0
        }
        sentBuf.push(sent)
        sentTokens += st
      }
      if (sentBuf.length > 0) {
        chunks.push({ text: sentBuf.join(" "), section, chunkIndex: chunkIdx++ })
      }
      continue
    }

    if (currentTokens + paraTokens > maxTokens && current.length > 0) {
      flush()
    }
    current.push(para)
    currentTokens += paraTokens
  }

  flush()
  return chunks
}

export function chunkMarkdown(markdown: string, maxTokens = 500, overlapTokens = 50): Chunk[] {
  const lines = markdown.split("\n")
  const sections: Array<{ heading: string; paragraphs: string[] }> = []

  let currentSection = { heading: "", paragraphs: [] as string[] }
  let paraBuffer: string[] = []

  const flushPara = () => {
    const text = paraBuffer.join("\n").trim()
    if (text) currentSection.paragraphs.push(text)
    paraBuffer = []
  }

  for (const line of lines) {
    if (/^#{1,3} /.test(line)) {
      flushPara()
      sections.push(currentSection)
      currentSection = { heading: line.replace(/^#{1,3} /, "").trim(), paragraphs: [] }
    } else if (line.trim() === "") {
      flushPara()
    } else {
      paraBuffer.push(line)
    }
  }
  flushPara()
  sections.push(currentSection)

  const allChunks: Chunk[] = []
  for (const section of sections) {
    if (section.paragraphs.length === 0) continue
    const sectionChunks = emitChunks(section.paragraphs, section.heading, maxTokens, overlapTokens, allChunks.length)
    allChunks.push(...sectionChunks)
  }

  return allChunks
}
