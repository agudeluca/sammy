const CHUNK_SIZE = 800; // approx tokens (~4 chars/token)
const OVERLAP = 100;
const CHARS_PER_TOKEN = 4;

const MAX_CHARS = CHUNK_SIZE * CHARS_PER_TOKEN;
const OVERLAP_CHARS = OVERLAP * CHARS_PER_TOKEN;

export function chunkText(text: string): string[] {
  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 0);
  const chunks: string[] = [];
  let current = "";

  for (const para of paragraphs) {
    if (current.length + para.length + 2 <= MAX_CHARS) {
      current += (current ? "\n\n" : "") + para;
    } else {
      if (current) {
        chunks.push(current.trim());
        // Keep overlap from end of previous chunk
        const overlap = current.slice(-OVERLAP_CHARS);
        current = overlap + "\n\n" + para;
      } else {
        // Single paragraph larger than chunk size — split by sentence
        const sentences = para.match(/[^.!?]+[.!?]+/g) ?? [para];
        for (const sentence of sentences) {
          if (current.length + sentence.length <= MAX_CHARS) {
            current += sentence;
          } else {
            if (current) chunks.push(current.trim());
            current = sentence;
          }
        }
      }
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks;
}
