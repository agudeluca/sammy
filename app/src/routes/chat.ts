import Elysia, { t } from "elysia";
import { verifyToken } from "../middleware/auth";
import { embedTexts } from "../services/parser";
import { querySimilar } from "../services/pinecone";
import { askCursor } from "../services/cursor";

export const chatRoutes = new Elysia({ prefix: "/api" }).post(
  "/chat",
  async ({ body, request, set }) => {
    await verifyToken(request.headers.get("authorization")).catch(() => {
      set.status = 401;
      throw new Error("Unauthorized");
    });

    const { community_id, question } = body;

    // 1. Embed the question
    const [queryVector] = await embedTexts([question]);

    // 2. Retrieve relevant chunks from Pinecone
    const chunks = await querySimilar(community_id, queryVector, 10);

    const context = chunks.length > 0
      ? chunks.join("\n\n---\n\n")
      : "";

    // 3. Call Cursor CLI
    const answer = await askCursor(context, question);

    return { answer };
  },
  {
    body: t.Object({
      community_id: t.String(),
      question: t.String({ minLength: 1 }),
      history: t.Optional(
        t.Array(t.Object({ role: t.String(), content: t.String() }))
      ),
    }),
  }
);
