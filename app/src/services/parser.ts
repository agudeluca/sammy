import { config } from "../config"

export async function parseFile(buffer: Buffer, filename: string): Promise<string> {
  const form = new FormData()
  form.append("file", new Blob([buffer]), filename)

  const res = await fetch(`${config.parserUrl}/parse`, {
    method: "POST",
    body: form,
  })

  if (!res.ok) {
    let detail = await res.text()
    try {
      const json = JSON.parse(detail)
      detail = json?.detail?.error ?? json?.detail ?? detail
    } catch {}
    throw new Error(`Parser error (${res.status}): ${detail}`)
  }

  const data = (await res.json()) as { markdown: string }
  return data.markdown
}
