# Consultório Multi-Área

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
  sdk/        cliente tipado gerado do OpenAPI
```

## Dev local

```bash
pnpm install
pnpm dev
```

## Requisitos

- Node 20+
- pnpm 10+
