import { config } from "../config";

export async function parseFile(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`${config.parserUrl}/parse`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? "Parser error");
  }

  const data = await res.json();
  return data.markdown as string;
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const res = await fetch(`${config.parserUrl}/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ texts }),
  });

  if (!res.ok) {
    throw new Error("Embed error: " + res.statusText);
  }

  const data = await res.json();
  return data.vectors as number[][];
}
