import { Pinecone } from "@pinecone-database/pinecone"
import { config } from "../config"
import type { Chunk } from "../lib/chunker"

const pc = new Pinecone({ apiKey: config.pineconeApiKey })
const index = pc.index(config.pineconeIndex)

const UPSERT_BATCH = 100

export interface ChunkMetadata {
  community_id: string
  document_id: string
  filename: string
  section: string
  chunk_index: number
  text: string
}

export async function upsertChunks(
  communityId: string,
  documentId: string,
  filename: string,
  chunks: Chunk[],
  vectors: number[][]
): Promise<void> {
  const ns = index.namespace(communityId)

  const records = chunks.map((chunk, i) => ({
    id: `${documentId}_${chunk.chunkIndex}`,
    values: vectors[i],
    metadata: {
      community_id: communityId,
      document_id: documentId,
      filename,
      section: chunk.section,
      chunk_index: chunk.chunkIndex,
      text: chunk.text,
    } satisfies ChunkMetadata,
  }))

  for (let i = 0; i < records.length; i += UPSERT_BATCH) {
    await ns.upsert(records.slice(i, i + UPSERT_BATCH))
  }
}

export async function queryChunks(communityId: string, queryVector: number[], topK = 10): Promise<ChunkMetadata[]> {
  const ns = index.namespace(communityId)
  const result = await ns.query({ vector: queryVector, topK, includeMetadata: true })
  return (result.matches ?? [])
    .filter((m) => m.metadata)
    .map((m) => m.metadata as unknown as ChunkMetadata)
}

export async function deleteDocumentChunks(communityId: string, documentId: string): Promise<void> {
  const ns = index.namespace(communityId)
  await ns.deleteMany({ document_id: documentId } as never)
}
