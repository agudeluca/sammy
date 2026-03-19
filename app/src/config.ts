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
  redashApiKey: process.env.REDASH_API_KEY ?? "",
  redashVacationQueryId: Number(
    process.env.REDASH_VACATION_QUERY_ID ?? "33517",
  ),
  redashKnowledgeQueryId: Number(
    process.env.REDASH_KNOWLEDGE_QUERY_ID ?? "33514",
  ),
  redashWallPostsQueryId: Number(
    process.env.REDASH_WALL_POSTS_QUERY_ID ?? "33556",
  ),
  redashNewsQueryId: Number(process.env.REDASH_NEWS_QUERY_ID ?? "33562"),
  redashRecognitionsQueryId: Number(
    process.env.REDASH_RECOGNITIONS_QUERY_ID ?? "33563",
  ),
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
  { id: "214834", name: "PROYECTO TEAM 35 V2 - Instance ID 214834" },
  { id: "214622", name: "PROYECTO TEAM 35 - Instance ID 214622" },
];

export const users: User[] = [
  {
    id: "8083469",
    username: "maria",
    communityId: "214834",
    role: "admin",
  },
  {
    id: "8081349",
    username: "juan",
    communityId: "214834",
    role: "collaborator",
  },
];

/**
 * Maps communityId (used in Sammy) to the numeric Humand instanceId (used in Redash).
 * Add new communities here as the platform grows.
 */
export const communityInstanceMap: Record<string, number> = {
  "214622": 214622,
  "214834": 214834,
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
