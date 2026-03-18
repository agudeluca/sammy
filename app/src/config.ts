export const config = {
  port: Number(process.env.PORT ?? 3000),
  pineconeApiKey: process.env.PINECONE_API_KEY ?? "",
  pineconeIndex: process.env.PINECONE_INDEX ?? "sammy-docs",
  parserUrl: process.env.PARSER_URL ?? "http://localhost:8000",
  databasePath: process.env.DATABASE_PATH ?? "./data/sammy.db",
  authUsername: process.env.AUTH_USERNAME ?? "admin",
  authPassword: process.env.AUTH_PASSWORD ?? "changeme",
  jwtSecret: process.env.JWT_SECRET ?? "dev_secret_change_in_production",
  jwtExpiry: process.env.JWT_EXPIRY ?? "8h",
} as const;
