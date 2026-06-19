# Stage 1: Build
FROM node:22-slim AS builder

# Native build tools (sharp, onnxruntime-node, better-sqlite3 may need to compile)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ ca-certificates \
 && rm -rf /var/lib/apt/lists/*

RUN corepack enable

WORKDIR /app

# Install dependencies (cached layer). pnpm-workspace.yaml carries the
# onlyBuiltDependencies / allowBuilds config required by pnpm 11.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# Copy source and build (skip db:migrate — that runs at container start)
COPY . .
RUN NITRO_PRESET=node-server pnpm exec nuxt build

# Stage 2: Production image
FROM node:22-slim AS runner

# curl for docker-compose healthchecks, ca-certificates for outbound HTTPS
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Nitro's node-server preset bundles all runtime deps inside .output —
# no second pnpm install needed.
COPY --from=builder /app/.output ./.output

# Migration tooling — needed by docker-entrypoint.sh at startup.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/server/database/migrations ./server/database/migrations
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/package.json ./package.json

COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# Ensure the data directory exists (SQLite database lives here)
RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

EXPOSE 3000

CMD ["./docker-entrypoint.sh"]
