const required = (name: string): string => {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required env var: ${name}`);
  return val;
};

export const config = {
  pineconeApiKey: required("PINECONE_API_KEY"),
  pineconeIndex: process.env.PINECONE_INDEX ?? "sammy-docs",
  pineconeHost: process.env.PINECONE_HOST ?? "",
  anthropicApiKey: required("ANTHROPIC_API_KEY"),
  jwtSecret: required("JWT_SECRET"),
  jwtExpiry: process.env.JWT_EXPIRY ?? "8h",
  databasePath: process.env.DATABASE_PATH ?? "/app/data/sammy.db",
  port: Number(process.env.PORT ?? 3001),
  // Redash
  redashBaseUrl: process.env.REDASH_BASE_URL ?? "https://redash.humand.co",
  redashApiKey: required("REDASH_API_KEY"),
  redashVacationQueryId: Number(process.env.REDASH_VACATION_QUERY_ID ?? "33517"),
  redashKnowledgeQueryId: Number(process.env.REDASH_KNOWLEDGE_QUERY_ID ?? "33514"),
};

export const HARDCODED_PASSWORD = "huckaton";

export interface Community {
  id: string;
  name: string;
}

export interface User {
  id: string;
  username: string;
  communityId: string;
  role: "admin" | "collaborator";
}

export const communities: Community[] = [
  { id: "team35", name: "PROYECTO TEAM 35 - Instance ID 214622" },
  { id: "team35v2", name: "PROYECTO TEAM 35 V2 - Instance ID 214834" },
];

export const users: User[] = [
  { id: "8066601", username: "admin", communityId: "team35", role: "admin" },
  { id: "8067655", username: "admin", communityId: "team35v2", role: "admin" },
  {
    id: "8066601",
    username: "paula.soardo",
    communityId: "team35",
    role: "collaborator",
  },
  {
    id: "8067453",
    username: "violeta.alcibar",
    communityId: "team35",
    role: "collaborator",
  },
  {
    id: "8067859",
    username: "natalia.palero",
    communityId: "team35",
    role: "collaborator",
  },
  {
    id: "8067654",
    username: "paula.soardo",
    communityId: "team35v2",
    role: "collaborator",
  },
  {
    id: "8067653",
    username: "violeta.alcibar",
    communityId: "team35v2",
    role: "collaborator",
  },
  {
    id: "8067655",
    username: "natalia.palero",
    communityId: "team35v2",
    role: "collaborator",
  },
];

/**
 * Maps communityId (used in Sammy) to the numeric Humand instanceId (used in Redash).
 * Add new communities here as the platform grows.
 */
export const communityInstanceMap: Record<string, number> = {
  team35: 214622,
  team35v2: 214834,
};

export function getUserByUsername(
  communityId: string,
  username: string,
): User | undefined {
  return users.find(
    (u) => u.communityId === communityId && u.username === username,
  );
}

export function getCommunityById(id: string): Community | undefined {
  return communities.find((c) => c.id === id);
}

/**
 * Alias for getUserByUsername — used in chat route for Redash lookups.
 */
export const getUserByCommunity = getUserByUsername;
