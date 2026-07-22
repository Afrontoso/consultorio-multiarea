# Build a partir da raiz do monorepo: fly.toml aponta [build].dockerfile pra cá
# com contexto na raiz do repo.
#
# Sem estágio de runtime "enxuto": mantemos o filesystem completo do build
# (inclui devDependencies, como o CLI do prisma em packages/db) porque o
# release_command do fly.toml roda `prisma migrate deploy` a partir da
# própria imagem publicada.

FROM node:20-slim AS base
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
WORKDIR /repo

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/config/package.json packages/config/package.json
RUN pnpm install --frozen-lockfile --filter @consultorio/api...

FROM deps AS runtime
COPY tsconfig.base.json ./
COPY packages/config packages/config
COPY packages/db packages/db
COPY packages/contracts packages/contracts
COPY apps/api apps/api
RUN pnpm --filter @consultorio/db build \
 && pnpm --filter @consultorio/contracts build \
 && pnpm --filter @consultorio/api build

WORKDIR /repo/apps/api
ENV NODE_ENV=production
EXPOSE 3333
CMD ["node", "dist/main.js"]
