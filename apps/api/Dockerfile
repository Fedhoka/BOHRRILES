FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

# ── deps ──────────────────────────────────────────────────────────────────────
FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/core/package.json ./packages/core/
COPY apps/api/package.json ./apps/api/
RUN pnpm install --frozen-lockfile --prod=false

# ── build ─────────────────────────────────────────────────────────────────────
FROM deps AS build
COPY packages/core ./packages/core
COPY apps/api ./apps/api
RUN pnpm --filter @bohr/core build
RUN pnpm --filter @bohr/api build

# ── runtime ───────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/core/package.json ./packages/core/
COPY apps/api/package.json ./apps/api/
RUN pnpm install --frozen-lockfile --prod

COPY --from=build /app/packages/core/dist ./packages/core/dist
COPY --from=build /app/apps/api/dist ./apps/api/dist

WORKDIR /app/apps/api

RUN mkdir -p data

EXPOSE 3001
ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
