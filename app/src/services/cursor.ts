const FALLBACK = "No tengo información suficiente en los documentos.";
const TIMEOUT_MS = 60_000;

export async function askCursor(
  context: string,
  question: string
): Promise<string> {
  const systemPrompt =
    "You are a document assistant. Answer ONLY using the provided context. " +
    "If the context is insufficient or empty, respond exactly: " +
    `"${FALLBACK}"`;

  const message = `CONTEXT:\n${context}\n\nQUESTION:\n${question}`;

  let proc: ReturnType<typeof Bun.spawn>;
  try {
    proc = Bun.spawn(["cursor", "chat", "--no-stream", "--message", message], {
      env: { ...process.env, CURSOR_SYSTEM_PROMPT: systemPrompt },
      stdout: "pipe",
      stderr: "pipe",
    });
  } catch {
    console.error("[cursor] Cursor CLI not found");
    return FALLBACK;
  }

  const timer = setTimeout(() => {
    proc.kill();
  }, TIMEOUT_MS);

  const [stdout, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    proc.exited,
  ]);
  clearTimeout(timer);

  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text();
    console.error("[cursor] exit", exitCode, stderr);
    return FALLBACK;
  }

  return stdout.trim() || FALLBACK;
}
