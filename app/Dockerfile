FROM oven/bun:1.2 AS base
WORKDIR /app

COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

COPY . .

# Pre-download the embedding model so the first request isn't slow
RUN bun -e "import { pipeline, env } from '@huggingface/transformers'; env.cacheDir = '/app/.cache/hf'; await pipeline('feature-extraction', 'Xenova/all-mpnet-base-v2', { dtype: 'q8' });"

CMD ["bun", "run", "src/index.ts"]
