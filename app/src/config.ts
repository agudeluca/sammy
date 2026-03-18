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
  { id: "214622", name: "PROYECTO TEAM 35" },
  { id: "214834", name: "PROYECTO TEAM 35 V2" },
];
export const users: User[] = [
  { id: "8066601", username: "admin", communityId: "214622", role: "admin" },
  { id: "8067655", username: "admin", communityId: "214834", role: "admin" },
  {
    id: "8066601",
    username: "paula.soardo",
    communityId: "214622",
    role: "collaborator",
  },
  {
    id: "8067453",
    username: "violeta.alcibar",
    communityId: "214622",
    role: "collaborator",
  },
  {
    id: "8067859",
    username: "natalia.palero",
    communityId: "214622",
    role: "collaborator",
  },
  {
    id: "8067654",
    username: "paula.soardo",
    communityId: "214834",
    role: "collaborator",
  },
  {
    id: "8067653",
    username: "violeta.alcibar",
    communityId: "214834",
    role: "collaborator",
  },
  {
    id: "8067655",
    username: "natalia.palero",
    communityId: "214834",
    role: "collaborator",
  },
];

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
