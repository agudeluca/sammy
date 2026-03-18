import { jwtVerify } from "jose";
import { config } from "../config";

const secret = new TextEncoder().encode(config.jwtSecret);

export async function verifyToken(authHeader: string | null): Promise<string> {
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Missing token");
  }
  const token = authHeader.slice(7);
  const { payload } = await jwtVerify(token, secret);
  return payload.sub as string;
}
