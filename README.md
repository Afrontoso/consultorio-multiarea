# Consultório Multi-Área

[![CI](https://github.com/Afrontoso/consultorio-multiarea/actions/workflows/ci.yml/badge.svg)](https://github.com/Afrontoso/consultorio-multiarea/actions/workflows/ci.yml)

SaaS de agendamento para consultórios multi-área (psicologia, fisioterapia, nutrição, etc.).

Monorepo Turborepo + pnpm. Stack: Next.js 16, NestJS, Prisma, Supabase Postgres, Firebase Auth.

Plano completo em [PLANO.md](./PLANO.md).

## Estrutura

```
apps/
  web/        Next.js 16 (frontend público + painéis)
  api/        NestJS (REST + Zod)
packages/
  db/         Prisma schema + client
  contracts/  Zod DTOs compartilhados
  ui/         shadcn reutilizáveis
  config/     eslint, tsconfig, tailwind presets
```

## Dev local

```bash
pnpm install
pnpm dev
```

## Isolamento entre consultórios (RLS)

O Postgres é a última linha de defesa do multi-tenant: cada tabela escopada tem
policy de Row Level Security ligada a `app.tenant_id`, setado pela API a cada
request. Para que valha, a API precisa conectar com a role **não-superuser**:

```bash
psql $DATABASE_URL -f packages/db/prisma/rls.sql    # policies
psql $DATABASE_URL -f packages/db/prisma/roles.sql  # role consultorio_api
# e então apontar DATABASE_URL da API para essa role
```

Toda query passa por um dos dois wrappers do `PrismaService`:

- `withTenant(tenantId, fn)` — o caso normal, escopado a um consultório.
- `withGlobalScope(fn)` — **somente leitura** cruzando tenants, para o que é
  global por natureza: achar o usuário pelo `firebaseUid` no login e as
  métricas do painel de plataforma.

Query fora dos dois não enxerga linha alguma (falha fechada, de propósito).

Verificação de ponta a ponta contra o Postgres local:

```bash
pnpm --filter @consultorio/api test:rls
```

## Requisitos

- Node 20+
- pnpm 10+
