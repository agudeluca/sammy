import { Elysia } from "elysia"
import { cors } from "@elysiajs/cors"
import { config } from "./config"
import { authRoutes } from "./routes/auth"
import { adminRoutes } from "./routes/admin"
import { chatRoutes } from "./routes/chat"

const frontendOrigin = process.env.FRONTEND_URL ?? "http://localhost:3000"

const app = new Elysia()
  .use(cors({ origin: frontendOrigin }))
  .use(authRoutes)
  .use(adminRoutes)
  .use(chatRoutes)
  .get("/health", () => ({ status: "ok" }))
  .listen(config.port)

console.log(`Sammy API running on http://localhost:${config.port}`)

export type App = typeof app
