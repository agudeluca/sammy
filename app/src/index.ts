import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { config } from "./config";
import { authRoutes } from "./routes/auth";
import { adminRoutes } from "./routes/admin";
import { chatRoutes } from "./routes/chat";

const app = new Elysia()
  .use(cors({ origin: true }))
  .use(authRoutes)
  .use(adminRoutes)
  .use(chatRoutes)
  .get("/health", () => ({ status: "ok" }))
  .listen(config.port);

console.log(`sammy-app running on http://localhost:${config.port}`);
