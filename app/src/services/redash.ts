import { config } from "../config"

// ─────────────────────────────────────────────────────────────────────────────
// Shared Redash API helpers
// ─────────────────────────────────────────────────────────────────────────────

const redashHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Key ${config.redashApiKey}`,
})

interface RedashJobResponse {
  job: {
    id: string
    status: number // 1=pending 2=started 3=success 4=failure 5=cancelled
    error?: string
    query_result_id?: number
  }
}

interface RedashResultResponse<T> {
  query_result: {
    data: {
      rows: T[]
      columns: { name: string; type: string }[]
    }
  }
}

async function pollJob<T>(jobId: string): Promise<T[]> {
  const MAX_ATTEMPTS = 12
  const DELAY_MS = 1500

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    await new Promise((r) => setTimeout(r, DELAY_MS))

    const res = await fetch(`${config.redashBaseUrl}/api/jobs/${jobId}`, {
      headers: redashHeaders(),
    })
    if (!res.ok) throw new Error(`Redash poll error: ${res.status}`)

    const data = (await res.json()) as RedashJobResponse
    const { status, error, query_result_id } = data.job

    if (status === 3 && query_result_id) {
      const resultRes = await fetch(
        `${config.redashBaseUrl}/api/query_results/${query_result_id}`,
        { headers: redashHeaders() }
      )
      if (!resultRes.ok) throw new Error(`Redash result error: ${resultRes.status}`)
      const result = (await resultRes.json()) as RedashResultResponse<T>
      return result.query_result.data.rows
    }

    if (status === 4) throw new Error(`Redash job failed: ${error ?? "unknown"}`)
    if (status === 5) throw new Error("Redash job was cancelled")
  }

  throw new Error("Redash query timed out after polling")
}

async function executeRedashQuery<T>(
  queryId: number,
  parameters: Record<string, number | string>,
  maxAge = 300
): Promise<T[]> {
  const res = await fetch(`${config.redashBaseUrl}/api/queries/${queryId}/results`, {
    method: "POST",
    headers: redashHeaders(),
    body: JSON.stringify({ parameters, max_age: maxAge }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Redash API error ${res.status}: ${body}`)
  }

  const data = await res.json()

  if (data.query_result) {
    return (data as RedashResultResponse<T>).query_result.data.rows
  }
  if (data.job) {
    return await pollJob<T>((data as RedashJobResponse).job.id)
  }

  throw new Error("Unexpected Redash response shape")
}

// ─────────────────────────────────────────────────────────────────────────────
// Vacation balances
// ─────────────────────────────────────────────────────────────────────────────

export interface VacationBalance {
  userId: number
  employeeInternalId: string
  fullName: string
  policyType: string
  assignedTotal: number
  balanceAdjustment: number
  daysUsed: number
  usedBalance: number
  futureDaysRequested: number
  availableBalance: number
  availableBalanceToday: number
}

interface VacationRow {
  user_id: number
  Usuario: string
  "Nombre completo": string
  "Tipo Política": string
  "Asignados totales": number
  "Ajuste de saldos": number
  "Días consumidos": number
  "Saldo consumido": number
  "Días solicitados a futuro": number
  "Saldo disponible": number
  "Saldo disponible a hoy": number
}

export async function getVacationBalance(
  instanceId: number,
  userId: number
): Promise<VacationBalance[]> {
  const rows = await executeRedashQuery<VacationRow>(config.redashVacationQueryId, {
    instance_id: instanceId,
    employee_id: userId,
  })

  return rows.map((row) => ({
    userId: row.user_id,
    employeeInternalId: row.Usuario,
    fullName: row["Nombre completo"],
    policyType: row["Tipo Política"],
    assignedTotal: row["Asignados totales"],
    balanceAdjustment: row["Ajuste de saldos"],
    daysUsed: row["Días consumidos"],
    usedBalance: row["Saldo consumido"],
    futureDaysRequested: row["Días solicitados a futuro"],
    availableBalance: row["Saldo disponible"],
    availableBalanceToday: row["Saldo disponible a hoy"],
  }))
}

export function formatVacationContext(balances: VacationBalance[]): string {
  if (balances.length === 0) {
    return "No se encontraron saldos de tiempo libre para este usuario en el sistema."
  }

  const name = balances[0].fullName
  const lines: string[] = [
    `[DATOS EN TIEMPO REAL — Saldos de tiempo libre de ${name}]`,
    "",
  ]

  for (const b of balances) {
    lines.push(`Política: ${b.policyType}`)
    lines.push(`  • Días asignados en el ciclo : ${b.assignedTotal}`)
    lines.push(`  • Ajuste manual de saldo     : ${b.balanceAdjustment}`)
    lines.push(`  • Días consumidos            : ${b.daysUsed}`)
    lines.push(`  • Saldo consumido            : ${b.usedBalance}`)
    lines.push(`  • Días solicitados a futuro  : ${b.futureDaysRequested}`)
    lines.push(`  • Saldo disponible a hoy     : ${b.availableBalanceToday}`)
    lines.push(`  • Saldo disponible total     : ${b.availableBalance}`)
    lines.push("")
  }

  return lines.join("\n")
}

export function isVacationQuery(question: string): boolean {
  const lower = question.toLowerCase()
  const keywords = [
    "vacacion", "vacación", "días libres", "dias libres",
    "días de descanso", "dias de descanso", "saldo", "balance",
    "días que me quedan", "dias que me quedan", "cuántos días", "cuantos dias",
    "licencia", "tiempo libre", "días disponibles", "dias disponibles",
    "holiday", "pto", "time off", "política de tiempo", "politica de tiempo",
    "me quedan", "tengo disponible", "ausencia",
  ]
  return keywords.some((kw) => lower.includes(kw))
}

// ─────────────────────────────────────────────────────────────────────────────
// Knowledge Library
// ─────────────────────────────────────────────────────────────────────────────

export interface KnowledgeArticle {
  libraryId: number
  title: string
  parentId: number | null
  parentList: string | null
  status: string
  textContent: string
  body: string
  depth: number
}

interface KnowledgeRow {
  libraryId: number
  title: string
  parentId: number | null
  parentList: string | null
  status: string
  textContent: string
  body: string
  depth: number
}

// Simple in-memory cache per instanceId — avoids hitting Redash on every message
interface CacheEntry {
  articles: KnowledgeArticle[]
  fetchedAt: number
}
const knowledgeCache = new Map<number, CacheEntry>()
const CACHE_TTL_MS = 10 * 60 * 1000 // 10 minutes

async function fetchKnowledgeLibrary(instanceId: number): Promise<KnowledgeArticle[]> {
  const cached = knowledgeCache.get(instanceId)
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.articles
  }

  const rows = await executeRedashQuery<KnowledgeRow>(
    config.redashKnowledgeQueryId,
    { instanceId },
    600 // 10 min cache on Redash side too
  )

  // Only return published/active articles with actual content
  const articles = rows
    .filter((r) => r.status !== "DRAFT" && (r.textContent?.trim() || r.title?.trim()))
    .map((r) => ({
      libraryId: r.libraryId,
      title: r.title ?? "",
      parentId: r.parentId,
      parentList: r.parentList,
      status: r.status,
      textContent: r.textContent ?? "",
      body: r.body ?? "",
      depth: r.depth,
    }))

  knowledgeCache.set(instanceId, { articles, fetchedAt: Date.now() })
  return articles
}

/**
 * Score an article's relevance to a question using keyword overlap.
 * Returns a score ≥ 0; higher = more relevant.
 */
function scoreArticle(article: KnowledgeArticle, questionWords: string[]): number {
  const haystack = `${article.title} ${article.textContent}`.toLowerCase()
  return questionWords.reduce((score, word) => {
    if (haystack.includes(word)) {
      // Title matches count double
      return score + (article.title.toLowerCase().includes(word) ? 2 : 1)
    }
    return score
  }, 0)
}

const STOP_WORDS = new Set([
  "de","la","el","en","un","una","los","las","por","para","con","que","es",
  "se","del","al","su","sus","como","más","mas","pero","si","no","le","lo",
  "me","mi","te","tu","hay","muy","ya","fue","ser","son","está","esta",
  "tengo","tiene","tiene","qué","que","cómo","como","cuál","cual","the",
  "is","are","in","of","to","a","an","and","or","for","with",
])

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[\s,.?!¿¡:;()\-]+/)
    .filter((w) => w.length > 3 && !STOP_WORDS.has(w))
}

/**
 * Fetches and returns the top-K most relevant knowledge articles for the question.
 * Returns empty array if none are relevant (score = 0).
 */
export async function searchKnowledgeLibrary(
  instanceId: number,
  question: string,
  topK = 5
): Promise<KnowledgeArticle[]> {
  const articles = await fetchKnowledgeLibrary(instanceId)
  if (articles.length === 0) return []

  const questionWords = tokenize(question)
  if (questionWords.length === 0) return []

  const scored = articles
    .map((article) => ({ article, score: scoreArticle(article, questionWords) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)

  return scored.map(({ article }) => article)
}

/**
 * Formats relevant knowledge articles as a readable context block for Claude.
 */
export function formatKnowledgeContext(articles: KnowledgeArticle[]): string {
  if (articles.length === 0) return ""

  const lines: string[] = [
    "[LIBRERÍA DE CONOCIMIENTOS — Artículos relevantes de tu comunidad]",
    "",
  ]

  for (const a of articles) {
    const path = a.parentList ? `${a.parentList} > ${a.title}` : a.title
    lines.push(`## ${path}`)
    const content = a.textContent?.trim()
    if (content) {
      // Truncate very long articles to avoid bloating the context
      lines.push(content.length > 1500 ? content.slice(0, 1500) + "…" : content)
    }
    lines.push("")
  }

  return lines.join("\n")
}
