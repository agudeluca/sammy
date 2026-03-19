import { describe, it, expect, beforeEach, mock } from "bun:test"

// Set env vars before any module that uses config is loaded
process.env.PINECONE_API_KEY = "test"
process.env.ANTHROPIC_API_KEY = "test"
process.env.JWT_SECRET = "test"
process.env.REDASH_API_KEY = "test-key"
process.env.REDASH_BASE_URL = "https://redash.test"
process.env.REDASH_VACATION_QUERY_ID = "1"
process.env.REDASH_KNOWLEDGE_QUERY_ID = "2"

// Dynamic imports so env vars are set first
const { default: _, ...redash } = await import("../redash")
const {
  formatVacationContext,
  formatKnowledgeContext,
  formatKnowledgeList,
  searchKnowledgeLibrary,
  listKnowledgeLibrary,
  getVacationBalance,
} = redash

import type { VacationBalance, KnowledgeArticle } from "../redash"

// ─────────────────────────────────────────────────────────────────────────────
// Rows that mirror the real Redash schema (enabled/disabled status, depth 0/1)
// ─────────────────────────────────────────────────────────────────────────────
const realWorldRows: KnowledgeArticle[] = [
  {
    libraryId: 100,
    title: "Benefícios",
    parentId: null,
    parentList: null,
    status: "enabled",
    textContent: "Aqui você poderá encontrar os diversos benefícios",
    body: "<p>...</p>",
    depth: 0,
  },
  {
    libraryId: 101,
    title: "Fitness Corporativo",
    parentId: 100,
    parentList: "[100]",
    status: "enabled",
    textContent: "Cadastre-se e faça parte do nossa equipe esportiva",
    body: "<p>...</p>",
    depth: 1,
  },
  {
    libraryId: 102,
    title: "Benefícios gastronômicos",
    parentId: 100,
    parentList: "[100]",
    status: "enabled",
    textContent: "Almoce a preços especiais com nosso cartão VISA",
    body: "<p>...</p>",
    depth: 1,
  },
  {
    libraryId: 200,
    title: "Vagas Internas",
    parentId: null,
    parentList: null,
    status: "enabled",
    textContent: "Em nossa empresa, sempre surgem novas oportunidades",
    body: "<p>...</p>",
    depth: 0,
  },
  {
    libraryId: 300,
    title: "Calendario",
    parentId: null,
    parentList: null,
    status: "disabled",
    textContent: "",
    body: "",
    depth: 0,
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// formatVacationContext
// ─────────────────────────────────────────────────────────────────────────────
const sampleBalance: VacationBalance = {
  userId: 42,
  employeeInternalId: "emp@company.com",
  fullName: "Juan Pérez",
  policyType: "Vacaciones",
  startDate: "2026-01-01",
  endDate: "2026-12-31",
  currentBalance: 15,
  expirationDate: null,
}

describe("formatVacationContext", () => {
  it("returns no-data message when balances is empty", () => {
    const result = formatVacationContext([])
    expect(result).toContain("No se encontraron")
  })

  it("includes employee name in header", () => {
    const result = formatVacationContext([sampleBalance])
    expect(result).toContain("Juan Pérez")
  })

  it("includes policy type", () => {
    const result = formatVacationContext([sampleBalance])
    expect(result).toContain("Vacaciones")
  })

  it("shows currentBalance", () => {
    const result = formatVacationContext([sampleBalance])
    expect(result).toContain("15")
  })

  it("shows date period", () => {
    const result = formatVacationContext([sampleBalance])
    expect(result).toContain("2026-01-01")
  })

  it("shows expiration date when present", () => {
    const withExpiry: VacationBalance = { ...sampleBalance, expirationDate: "2027-12-31T00:00:00" }
    const result = formatVacationContext([withExpiry])
    expect(result).toContain("2027-12-31")
  })

  it("formats multiple policies", () => {
    const second: VacationBalance = { ...sampleBalance, policyType: "Días de estudio" }
    const result = formatVacationContext([sampleBalance, second])
    expect(result).toContain("Vacaciones")
    expect(result).toContain("Días de estudio")
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// formatKnowledgeContext
// ─────────────────────────────────────────────────────────────────────────────
const sampleArticle: KnowledgeArticle = {
  libraryId: 1,
  title: "Política de Home Office",
  parentId: null,
  parentList: null,
  status: "PUBLISHED",
  textContent: "Podés trabajar desde casa hasta 3 días por semana.",
  body: "<p>...</p>",
  depth: 1,
}

describe("formatKnowledgeContext", () => {
  it("returns empty string when no articles", () => {
    expect(formatKnowledgeContext([])).toBe("")
  })

  it("includes article title", () => {
    const result = formatKnowledgeContext([sampleArticle])
    expect(result).toContain("Política de Home Office")
  })

  it("includes article content", () => {
    const result = formatKnowledgeContext([sampleArticle])
    expect(result).toContain("3 días por semana")
  })

  it("shows breadcrumb path when parentList is set", () => {
    const article = { ...sampleArticle, parentList: "RRHH" }
    const result = formatKnowledgeContext([article])
    expect(result).toContain("RRHH > Política de Home Office")
  })

  it("truncates content longer than 1500 chars", () => {
    const longContent = "x".repeat(2000)
    const article = { ...sampleArticle, textContent: longContent }
    const result = formatKnowledgeContext([article])
    expect(result).toContain("…")
  })

  it("formats multiple articles", () => {
    const second: KnowledgeArticle = { ...sampleArticle, libraryId: 2, title: "Código de Conducta" }
    const result = formatKnowledgeContext([sampleArticle, second])
    expect(result).toContain("Política de Home Office")
    expect(result).toContain("Código de Conducta")
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Helpers for fetch mocking
// ─────────────────────────────────────────────────────────────────────────────
function mockFetch(rows: unknown[]) {
  globalThis.fetch = mock(() =>
    Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          query_result: { data: { rows, columns: [] } },
        }),
      text: () => Promise.resolve(""),
    } as Response)
  ) as unknown as typeof fetch
}

// ─────────────────────────────────────────────────────────────────────────────
// searchKnowledgeLibrary
// ─────────────────────────────────────────────────────────────────────────────
const knowledgeRows: KnowledgeArticle[] = [
  {
    libraryId: 1,
    title: "Home Office Policy",
    parentId: null,
    parentList: null,
    status: "PUBLISHED",
    textContent: "Employees can work from home three days per week.",
    body: "",
    depth: 1,
  },
  {
    libraryId: 2,
    title: "Vacation Policy",
    parentId: null,
    parentList: null,
    status: "PUBLISHED",
    textContent: "Annual vacation days are granted based on seniority.",
    body: "",
    depth: 1,
  },
  {
    libraryId: 3,
    title: "Draft Article",
    parentId: null,
    parentList: null,
    status: "DRAFT",
    textContent: "This article is not published yet.",
    body: "",
    depth: 1,
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// listKnowledgeLibrary
// ─────────────────────────────────────────────────────────────────────────────
describe("listKnowledgeLibrary", () => {
  it("returns all enabled articles for an instanceId", async () => {
    mockFetch(realWorldRows)
    const results = await listKnowledgeLibrary(214834)
    // disabled "Calendario" is excluded; enabled items are returned
    expect(results.every((a) => a.status !== "disabled")).toBe(true)
    expect(results.some((a) => a.title === "Benefícios")).toBe(true)
    expect(results.some((a) => a.title === "Vagas Internas")).toBe(true)
  })

  it("returns both root categories and child articles", async () => {
    mockFetch(realWorldRows)
    const results = await listKnowledgeLibrary(214835)
    const depths = results.map((a) => a.depth)
    expect(depths).toContain(0)
    expect(depths).toContain(1)
  })

  it("returns empty array when Redash returns no rows", async () => {
    mockFetch([])
    const results = await listKnowledgeLibrary(214836)
    expect(results).toHaveLength(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// formatKnowledgeList
// ─────────────────────────────────────────────────────────────────────────────
describe("formatKnowledgeList", () => {
  it("returns empty string when articles array is empty", () => {
    expect(formatKnowledgeList([])).toBe("")
  })

  it("includes root category names in bold", () => {
    const result = formatKnowledgeList(realWorldRows.filter((a) => a.status !== "disabled"))
    expect(result).toContain("**Benefícios**")
    expect(result).toContain("**Vagas Internas**")
  })

  it("lists children under their parent category", () => {
    const result = formatKnowledgeList(realWorldRows.filter((a) => a.status !== "disabled"))
    expect(result).toContain("  - Fitness Corporativo")
    expect(result).toContain("  - Benefícios gastronômicos")
  })

  it("does not include disabled categories", () => {
    const result = formatKnowledgeList(realWorldRows.filter((a) => a.status !== "disabled"))
    expect(result).not.toContain("Calendario")
  })
})

describe("searchKnowledgeLibrary", () => {
  beforeEach(() => {
    // Use a unique instanceId per test to bypass the in-memory cache
  })

  it("returns relevant articles matching the question", async () => {
    mockFetch(knowledgeRows)
    const results = await searchKnowledgeLibrary(100001, "home office remote work", 5)
    expect(results.some((a) => a.title === "Home Office Policy")).toBe(true)
  })

  it("filters out DRAFT articles", async () => {
    mockFetch(knowledgeRows)
    const results = await searchKnowledgeLibrary(100002, "draft article published", 5)
    expect(results.every((a) => a.status !== "DRAFT")).toBe(true)
  })

  it("returns empty array when no articles match", async () => {
    mockFetch(knowledgeRows)
    const results = await searchKnowledgeLibrary(100003, "xyzzy foobar quux", 5)
    expect(results).toHaveLength(0)
  })

  it("respects topK limit", async () => {
    mockFetch(knowledgeRows)
    const results = await searchKnowledgeLibrary(100004, "policy annual vacation home", 1)
    expect(results.length).toBeLessThanOrEqual(1)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// getVacationBalance
// ─────────────────────────────────────────────────────────────────────────────
const rawVacationRow = {
  user_id: 42,
  employeeInternalId: "emp@company.com",
  "Nombre del Colaborador": "Juan Pérez",
  instanceId: 214622,
  vacation_policy_type_id: 1,
  "Tipo de Política": "Vacaciones",
  startDate: "2026-01-01",
  endDate: "2026-12-31",
  policyId: 100,
  currentBalance: 15.0,
  expirationDate: null,
}

describe("getVacationBalance", () => {
  it("maps Spanish column names to camelCase fields", async () => {
    mockFetch([rawVacationRow])
    const result = await getVacationBalance(214622, 42)
    expect(result).toHaveLength(1)
    const b = result[0]
    expect(b.userId).toBe(42)
    expect(b.fullName).toBe("Juan Pérez")
    expect(b.policyType).toBe("Vacaciones")
    expect(b.currentBalance).toBe(15)
    expect(b.expirationDate).toBeNull()
  })

  it("throws when fetch fails", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve({
        ok: false,
        status: 500,
        json: () => Promise.resolve({}),
        text: () => Promise.resolve("Internal Server Error"),
      } as Response)
    ) as unknown as typeof fetch

    await expect(getVacationBalance(214622, 99)).rejects.toThrow("500")
  })

  it("handles async job flow (job → poll → result)", async () => {
    let callCount = 0
    globalThis.fetch = mock(() => {
      callCount++
      if (callCount === 1) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ job: { id: "job-1", status: 1 } }),
          text: () => Promise.resolve(""),
        } as Response)
      }
      if (callCount === 2) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({ job: { id: "job-1", status: 3, query_result_id: 99 } }),
          text: () => Promise.resolve(""),
        } as Response)
      }
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            query_result: { data: { rows: [rawVacationRow], columns: [] } },
          }),
        text: () => Promise.resolve(""),
      } as Response)
    }) as unknown as typeof fetch

    const result = await getVacationBalance(214622, 42)
    expect(result).toHaveLength(1)
    expect(result[0].fullName).toBe("Juan Pérez")
  })
})
