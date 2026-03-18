const required = (name: string): string => {
  const val = process.env[name]
  if (!val) throw new Error(`Missing required env var: ${name}`)
  return val
}

export const config = {
  pineconeApiKey: required("PINECONE_API_KEY"),
  pineconeIndex: process.env.PINECONE_INDEX ?? "sammy-docs",
  cursorApiKey: required("CURSOR_API_KEY"),
  jwtSecret: required("JWT_SECRET"),
  jwtExpiry: process.env.JWT_EXPIRY ?? "8h",
  parserUrl: process.env.PARSER_URL ?? "http://parser:8000",
  databasePath: process.env.DATABASE_PATH ?? "/app/data/sammy.db",
  port: Number(process.env.PORT ?? 3001),
}

export const HARDCODED_PASSWORD = "huckaton"

export interface Community {
  id: string
  name: string
}

export interface User {
  id: string
  username: string
  communityId: string
  role: "admin" | "collaborator"
}

export const communities: Community[] = [
  { id: "acme", name: "Acme Corp" },
  { id: "globex", name: "Globex Inc" },
]

export const users: User[] = [
  { id: "alice", username: "admin", communityId: "acme", role: "admin" },
  { id: "bob", username: "bob", communityId: "acme", role: "collaborator" },
  { id: "carol", username: "admin", communityId: "globex", role: "admin" },
  { id: "dave", username: "dave", communityId: "globex", role: "collaborator" },
]

export function getUserByUsername(communityId: string, username: string): User | undefined {
  return users.find((u) => u.communityId === communityId && u.username === username)
}

export function getCommunityById(id: string): Community | undefined {
  return communities.find((c) => c.id === id)
}
