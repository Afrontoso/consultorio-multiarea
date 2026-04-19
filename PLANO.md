# Plano de Implementação — SaaS Consultório Multi-Área

> Projeto do zero em `/Users/victorleandro/Desktop/Projetos/consultorio-multiarea`.
> Segunda renda, dev solo part-time (~15h/semana).

## Decisões travadas

- **Auth:** Firebase Authentication (Email/Senha + Google + Magic Link).
- **Domínio:** ainda não comprado — registrar `.com.br` em registro.br (~R$40/ano). Até lá, usar domínio temporário da Vercel (`*.vercel.app`) e subpath (`/c/:slug`) em vez de subdomínio.
- **CNPJ:** MEI em processo — Stripe/Mercado Pago exigem CNPJ ativo para recebimento em BRL. Enquanto não sair, rodar tudo em **sandbox/test mode**.
- **Escopo MVP:** conforme descrito abaixo, sem recortes.
- **Idioma:** 100% PT-BR no MVP (sem i18n).

## Stack

| Camada | Escolha |
|---|---|
| Monorepo | Turborepo + pnpm workspaces |
| Frontend | Next.js 16 (App Router) + Tailwind 4 + shadcn/ui + TypeScript |
| Backend | NestJS + REST + Zod DTOs |
| Auth | Firebase Authentication (client) + `firebase-admin` (server) |
| Banco | Supabase Postgres (free tier) |
| ORM | Prisma |
| Hosting front | Vercel Hobby |
| Hosting back | Fly.io (free `shared-cpu-1x`) |
| Fila | BullMQ + Redis Upstash free |
| Pagamentos | Stripe (assinaturas) + Mercado Pago (PIX/Boleto) via adapter — **só ativar depois do MEI** |
| Observabilidade | Sentry free + Axiom free |
| Multi-tenancy | Schema compartilhado + coluna `tenantId` + Postgres RLS |

## Estrutura do monorepo

```
consultorio-multiarea/
├── apps/
│   ├── web/                    # Next.js
│   │   ├── app/
│   │   │   ├── (marketing)/    # landing pública
│   │   │   ├── (tenant)/       # resolvido por middleware (host ou /c/:slug)
│   │   │   │   ├── agendar/
│   │   │   │   ├── painel/
│   │   │   │   └── profissional/
│   │   │   ├── (platform)/     # /super-admin
│   │   │   └── api/webhooks/   # Stripe, MP, Firebase
│   │   └── middleware.ts       # tenant resolution
│   └── api/                    # NestJS
│       └── src/
│           ├── modules/
│           │   ├── tenants/
│           │   ├── professionals/
│           │   ├── services/
│           │   ├── appointments/
│           │   ├── patients/
│           │   ├── billing/
│           │   ├── domains/
│           │   ├── notifications/
│           │   └── super-admin/
│           ├── common/
│           │   ├── guards/firebase-auth.guard.ts
│           │   ├── decorators/tenant.decorator.ts
│           │   └── interceptors/tenant-scope.interceptor.ts
│           └── jobs/
├── packages/
│   ├── db/                     # Prisma schema + client + migrations
│   ├── contracts/              # Zod schemas compartilhados
│   ├── ui/                     # shadcn reutilizáveis
│   ├── config/                 # eslint, tsconfig, tailwind presets
│   └── sdk/                    # cliente tipado gerado do OpenAPI
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

## Modelo de dados (Prisma)

```prisma
model Tenant {
  id           String   @id @default(cuid())
  slug         String   @unique
  name         String
  category     HealthCategory
  customDomain String?  @unique
  domainStatus DomainStatus @default(NONE)
  planId       String
  plan         Plan     @relation(fields: [planId], references: [id])
  branding     Json?     // {primaryColor, logoUrl, favicon}
  settings     Json?     // {timezone, currency}
  status       TenantStatus @default(TRIAL)
  trialEndsAt  DateTime?
  createdAt    DateTime @default(now())

  users         User[]
  professionals Professional[]
  services      Service[]
  patients      Patient[]
  appointments  Appointment[]
  subscription  Subscription?

  @@index([customDomain])
}

model User {
  id             String  @id @default(cuid())
  firebaseUid    String  @unique
  email          String
  tenantId       String
  role           UserRole
  professionalId String? @unique
  patientId      String? @unique
  tenant         Tenant  @relation(fields: [tenantId], references: [id])

  @@index([tenantId])
  @@unique([tenantId, email])
}

model Professional {
  id                 String   @id @default(cuid())
  tenantId           String
  name               String
  email              String
  phone              String?
  bio                String?
  photoUrl           String?
  color              String   @default("#3b82f6")
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
  tenant             Tenant   @relation(fields: [tenantId], references: [id])
  appointments       Appointment[]
  services           Service[] @relation("ProfessionalToService")
  patients           Patient[] @relation("PatientToProfessional")

  @@index([tenantId])
  @@unique([tenantId, email])
}

model Service {
  id            String   @id @default(cuid())
  tenantId      String
  name          String
  description   String?
  duration      Int
  price         Decimal  @db.Decimal(10,2)
  tenant        Tenant   @relation(fields: [tenantId], references: [id])
  professionals Professional[] @relation("ProfessionalToService")
  appointments  Appointment[]

  @@index([tenantId])
}

model Patient {
  id            String   @id @default(cuid())
  tenantId      String
  name          String
  email         String?
  phone         String
  birthDate     DateTime?
  notes         String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  tenant        Tenant   @relation(fields: [tenantId], references: [id])
  appointments  Appointment[]
  professionals Professional[] @relation("PatientToProfessional")

  @@index([tenantId])
  @@unique([tenantId, phone])
}

model Appointment {
  id               String   @id @default(cuid())
  tenantId         String
  date             DateTime
  status           String   @default("CONFIRMED")
  notes            String?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  professionalId   String
  patientId        String
  serviceId        String
  recurrence       String?
  recurringEventId String?
  tenant           Tenant       @relation(fields: [tenantId], references: [id])
  professional     Professional @relation(fields: [professionalId], references: [id])
  patient          Patient      @relation(fields: [patientId], references: [id])
  service          Service      @relation(fields: [serviceId], references: [id])

  @@index([tenantId, date])
}

model Plan {
  id                      String  @id @default(cuid())
  code                    String  @unique       // FREE, STARTER, PRO, CLINIC
  priceBRL                Decimal
  maxProfessionals        Int
  maxAppointmentsPerMonth Int
  allowsCustomDomain      Boolean
  allowsBranding          Boolean
  featuresJson            Json
  tenants                 Tenant[]
}

model Subscription {
  id               String @id @default(cuid())
  tenantId         String @unique
  planId           String
  provider         PaymentProvider
  externalId       String
  status           SubStatus
  currentPeriodEnd DateTime
  tenant           Tenant @relation(fields: [tenantId], references: [id])
}

enum HealthCategory  { PSICOLOGIA FISIOTERAPIA NUTRICAO ODONTO ESTETICA TERAPIAS PERSONAL OUTROS }
enum TenantStatus    { TRIAL ACTIVE SUSPENDED CANCELED }
enum DomainStatus    { NONE PENDING VERIFIED FAILED }
enum UserRole        { OWNER STAFF PROFESSIONAL PATIENT }
enum PaymentProvider { STRIPE MERCADO_PAGO }
enum SubStatus       { TRIALING ACTIVE PAST_DUE CANCELED }
```

**RLS Postgres** em todas as tabelas com `tenantId`:
```sql
ALTER TABLE "Professional" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "Professional"
  USING (tenant_id = current_setting('app.tenant_id', true));
```
Nest seta `SET LOCAL app.tenant_id = $1` no início de cada transação.

## Fluxo de autenticação

1. Front autentica no Firebase (`firebase/auth`) → recebe `idToken`.
2. Toda request ao Nest: `Authorization: Bearer <idToken>`.
3. `FirebaseAuthGuard` valida com `firebase-admin.auth().verifyIdToken()`.
4. `TenantScopeInterceptor` resolve tenant por:
   - Header `X-Tenant-Slug` (setado pelo middleware do Next a partir do host ou `/c/:slug`)
   - Fallback: lookup `User.firebaseUid → tenantId`
5. `SET LOCAL app.tenant_id` dentro da transação Prisma.
6. **Onboarding (primeiro login):** `POST /tenants` cria `Tenant` + `User(role=OWNER)` vinculado ao `firebaseUid`.

## Estratégia de URL (ajustada — sem domínio ainda)

**Enquanto não tem domínio:**
- Subpath: `minhaapp.vercel.app/c/:slug` — middleware detecta `/c/`, injeta `X-Tenant-Slug`, rewrite para `/(tenant)/...`.
- Landing principal: `minhaapp.vercel.app`.
- Não dá para oferecer domínio próprio a pagantes ainda — **feature-flag "customDomain" desligada até registrar dominio raiz**.

**Depois de comprar domínio (ex: `agendaja.com.br`):**
- Wildcard DNS `*.agendaja.com.br` → Vercel.
- Subdomínio grátis: `clinica.agendaja.com.br`.
- Domínio próprio pago: Vercel Domains API provisiona + Let's Encrypt automático.

## Planos e preços (BRL)

| Plano | Preço | Profs | Agendamentos/mês | Subdomínio | Domínio próprio | Branding | Lembrete WhatsApp |
|---|---|---|---|---|---|---|---|
| Free | R$0 | 1 | 30 | ✅ (com marca d'água) | ❌ | ❌ | ❌ |
| Starter | R$39 | 1 | ilimitado | ✅ | ❌ | ❌ | ❌ |
| Pro | R$89 | 3 | ilimitado | ✅ | ✅ | ✅ | ✅ |
| Clinic | R$189 | 10 | ilimitado | ✅ | ✅ | ✅ | ✅ (+ relatórios + prontuário) |

Add-on pagamento online da consulta: fee 2% sobre GMV.

## Roadmap em fases

### Fase 0 — Setup monorepo (1 semana / ~15h)
- [ ] Inicializar Turborepo + pnpm workspaces.
- [ ] Criar `apps/web` (Next.js 16) e `apps/api` (NestJS) vazios com healthcheck.
- [ ] Criar `packages/db` com Prisma.
- [ ] Criar `packages/contracts` (Zod), `packages/ui`, `packages/config`.
- [ ] CI GitHub Actions (lint + typecheck + build).

### Fase 1 — MVP multi-tenant grátis (4 semanas / ~60h)
- [ ] Schema Prisma completo + migração inicial no Supabase.
- [ ] RLS Postgres em todas as tabelas com `tenantId`.
- [ ] `FirebaseAuthGuard` + `TenantScopeInterceptor` no Nest.
- [ ] Middleware de tenant no Next (por `/c/:slug` enquanto não há domínio).
- [ ] Onboarding wizard (5 passos: dados → profissionais → serviços → horários → publicar).
- [ ] Painel admin do tenant (CRUD profs, serviços, agenda, pacientes, bloqueios).
- [ ] Painel do profissional (agenda própria).
- [ ] Página pública de agendamento (calendário + formulário de paciente).
- [ ] Área do paciente (login Firebase, reagendar, cancelar).
- [ ] Email de confirmação (Resend).
- [ ] Deploy Vercel + Fly + Supabase.
- [ ] **Entregável:** 5 amigos cadastram consultório grátis e recebem agendamentos reais.

### Fase 2 — Monetização (3 semanas / ~45h) — depende do MEI sair
- [ ] Módulo `billing` com adapter `PaymentProvider`.
- [ ] Stripe sandbox: checkout + webhook → atualiza `Subscription`.
- [ ] Mercado Pago sandbox (PIX/Boleto) pelo mesmo adapter.
- [ ] Paywall por feature (middleware consultando `Plan.featuresJson`).
- [ ] Quando o domínio raiz chegar: módulo `domains` + Vercel Domains API.
- [ ] Painel de branding (logo, cores, favicon).
- [ ] Super-admin (MRR, lista de tenants, suspender inadimplente).
- [ ] **Entregável:** primeiro cliente pagante (mesmo que seja você testando).

### Fase 3 — Add-ons por ROI (6–10 semanas)
Ordem recomendada:
1. **Lembretes WhatsApp** (Z-API ~R$50/mês ilimitado). *Esforço P, receita alta.*
2. **Pagamento online da consulta** (Stripe Connect / MP Split, fee 2%). *M, alta.*
3. **Prontuário simples** (campos por categoria: psicologia=evolução; nutrição=antropometria). *M, média.*
4. **Google Calendar sync** (OAuth + push). *P, retenção.*
5. **Landing page do profissional** com SEO local (`schema.org MedicalBusiness`). *P, aquisição.*
6. **Marketplace público** (diretório + comissão R$5/novo paciente). *G, alta — fase 4.*
7. **Telemedicina** (Daily.co, ~$4/1000min). *M, nicho.*
8. **Afiliados** (cupom + split 20% por 3 meses). *P, aquisição.*
9. **White-label** enterprise. *G, só após 100 tenants.*

### Fase 4 — Escala (quando MRR > R$3k)
- Migrar Supabase → Neon Pro ou RDS.
- Read replica.
- Redis Upstash pago.
- Fly paid ou AWS ECS.

## Custos mensais

| Fase | Tenants | Total/mês |
|---|---|---|
| Pré-MVP | 0 | **R$0** |
| MVP (amigos) | 10 | **R$50** (Z-API) |
| Validação | 100 | **~R$405** |
| Escala inicial | 1000 | **~R$1.200** |

**Break-even fase validação:** ~5 Pro ou 11 Starter. Meta 12 meses: 30 pagantes → ~R$2.700 MRR → lucro ~R$2.300/mês.

## Riscos

| Risco | Mitigação |
|---|---|
| Concorrência (iClinic, Feegow, Doctoralia) | Foco em micro-nichos (psico, nutri, estética, personal) com preço 50% menor. |
| LGPD dados de saúde | `pgcrypto` em campos sensíveis. Log de consentimento. Sem prontuário formal no MVP (evita CFM). |
| WhatsApp caro | Z-API (custo fixo) no início; Cloud API só com volume alto. Cobrar add-on. |
| Churn | Lembretes automáticos + relatório mensal "R$X agendados" por email. |
| Vendor lock-in | Adapter pattern em `AuthProvider`, `DomainProvider`, `PaymentProvider`. Firebase substituível em ~2 dias. |
| Suporte consome tempo | Vídeos curtos (Loom), FAQ em bot WhatsApp, Discord da comunidade. |

## Preocupações regulatórias (MVP)

- **LGPD:** termos de uso + política de privacidade obrigatórios antes do primeiro cliente real. Consentimento explícito. Direito ao esquecimento implementado (`DELETE /patients/:id` faz soft-delete + job de purge em 30 dias).
- **CFM/Conselhos:** **fora do MVP.** Prontuário no MVP é "anotação de sessão" — não substitui prontuário formal com assinatura ICP-Brasil.
- **Termos e política:** usar templates do iubenda ou gerar com ChatGPT + revisão de amigo advogado.

## Primeiras 10 tarefas concretas

1. Criar diretório, `git init`, inicializar Turborepo + pnpm.
2. Estruturar workspaces: `apps/web`, `apps/api`, `packages/{db,contracts,ui,config,sdk}`.
3. Bootar Next.js 16 em `apps/web` com Tailwind 4 + shadcn/ui.
4. Bootar NestJS em `apps/api` com `/health`.
5. Configurar `packages/db` com Prisma + schema acima + primeira migration.
6. Criar projeto Supabase, pegar `DATABASE_URL`, rodar migrations.
7. Criar projeto Firebase, habilitar Email/Senha + Google + Magic Link.
8. Implementar `FirebaseAuthGuard` e `TenantScopeInterceptor` no Nest.
9. Implementar `middleware.ts` no Next com resolução por `/c/:slug`.
10. Endpoint `POST /tenants` + tela de onboarding (wizard 5 passos).

## Pendências externas (não-código)

- [ ] Finalizar MEI (bloqueia Stripe/MP recebimento em BRL).
- [ ] Escolher e comprar domínio `.com.br` (bloqueia subdomínio grátis e domínio próprio pagante).
- [ ] Criar conta Supabase, Firebase, Vercel, Fly.io, Upstash, Resend, Sentry, Axiom.
- [ ] Criar contas Stripe (com CNPJ) e Mercado Pago quando MEI sair.
- [ ] Redigir Termos de Uso + Política de Privacidade (iubenda free ou template).

---

**Próximo passo:** executar tarefa #1. Abrir nova conversa apontando para este diretório e pedir "execute a tarefa 1 do PLANO.md".
