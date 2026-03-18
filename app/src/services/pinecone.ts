import { Pinecone } from "@pinecone-database/pinecone";
import { config } from "../config";

const pc = new Pinecone({ apiKey: config.pineconeApiKey });
const index = pc.index(config.pineconeIndex);

export interface ChunkRecord {
  chunkId: string;
  docId: string;
  source: string;
  text: string;
  vector: number[];
}

export async function upsertChunks(
  communityId: string,
  chunks: ChunkRecord[]
): Promise<void> {
  const ns = index.namespace(communityId);
  const vectors = chunks.map((c) => ({
    id: c.chunkId,
    values: c.vector,
    metadata: {
      doc_id: c.docId,
      chunk_id: c.chunkId,
      source: c.source,
      text: c.text,
    },
  }));

  // Pinecone upsert in batches of 100
  for (let i = 0; i < vectors.length; i += 100) {
    await ns.upsert(vectors.slice(i, i + 100));
  }
}

export async function deleteByDocId(
  communityId: string,
  docId: string
): Promise<void> {
  const ns = index.namespace(communityId);
  await ns.deleteMany({ doc_id: { $eq: docId } });
}

export async function querySimilar(
  communityId: string,
  vector: number[],
  topK = 10
): Promise<string[]> {
  const ns = index.namespace(communityId);
  const result = await ns.query({
    vector,
    topK,
    includeMetadata: true,
  });

  return (result.matches ?? [])
    .map((m) => m.metadata?.text as string)
    .filter(Boolean);
}
