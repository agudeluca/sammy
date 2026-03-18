import Elysia, { t } from "elysia";
import { SignJWT } from "jose";
import { config } from "../config";

const secret = new TextEncoder().encode(config.jwtSecret);

export const authRoutes = new Elysia({ prefix: "/api/auth" }).post(
  "/login",
  async ({ body, set }) => {
    const { username, password } = body;
    if (username !== config.authUsername || password !== config.authPassword) {
      set.status = 401;
      return { error: "Invalid credentials" };
    }

    const token = await new SignJWT({ sub: username })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime(config.jwtExpiry)
      .setIssuedAt()
      .sign(secret);

    return { token };
  },
  {
    body: t.Object({
      username: t.String(),
      password: t.String(),
    }),
  }
);
