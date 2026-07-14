---
name: verify
description: Receita para buildar, subir e dirigir o app (API NestJS + web Next.js) contra o Postgres local para verificação end-to-end.
---

# Verificação end-to-end deste repo

## Pré-requisitos
- Postgres local no Docker: `open -a Docker` (se o daemon estiver parado), depois `docker start consultorio-pg`. As URLs em `apps/api/.env` já apontam para ele.
- Dados de teste existentes: tenant `e2e-sched-claude` (profissional "Dra. Agenda", serviço "Sessão" 60min, horário de trabalho segunda-feira 09:00–12:00, offset -180). Consultar ids: `docker exec consultorio-pg psql -U postgres -d consultorio -c '...'`.

## Subir
- API: `cd apps/api && pnpm build && node dist/main.js &` → `http://localhost:3333/v1` (healthcheck em `/v1/health`). Evita o watch do `nest start` que segura a porta 3333 (issue #24).
- Web: `cd apps/web && pnpm dev &` → `http://localhost:3000`. Página pública do tenant: `/c/<slug>`, agendamento: `/c/<slug>/agendar`.

## Dirigir
- Endpoints públicos (sem auth): `GET /v1/public/tenants/:slug/booking`, `GET .../availability?professionalId=&serviceId=&date=YYYY-MM-DD`, `POST .../appointments`.
- Browser: Playwright não está no repo — instalar no scratchpad (`npm i playwright && npx playwright install chromium`) e dirigir com um script `.mjs`. O CSS usa animação `stagger` (filhos começam com opacity 0, até ~1.6s de delay) — esperar `waitForTimeout(1600)` antes de screenshots.
- Fluxos logados (painel/onboarding) SÃO verificáveis: existe o usuário de teste `firebaseUid=e2e-sched-claude` (OWNER do tenant e2e). Gerar custom token com `firebase-admin` (require a partir de `apps/api/node_modules`, credenciais do `apps/api/.env`), e no Playwright: carregar qualquer página do app, `page.evaluate` importando o SDK web do CDN gstatic (v12), `initializeApp(config)` **sem nome** (a persistência no indexedDB é chaveada por `apiKey:[DEFAULT]`; o registro do CDN não colide com o bundle), `signInWithCustomToken`, esperar ~1,5s e recarregar — o app reconhece a sessão. Config do client em `apps/web/.env.local`.
- Nos cards da agenda do painel, o estado `open` sobrevive a refetches (mesma key React) — em drives, escopar cliques pelo card (`locator('div.border-l-4').filter({ hasText: ... })`), senão "cancelar consulta" pode acertar outro card.

## Limpar
- Apagar agendamentos/pacientes criados no tenant de teste via psql (Appointment antes de Patient, por FK).
- Matar os processos da API/web que subiu.

## Gotchas
- Lint usa ESLint 9 flat config: preset em `packages/config/eslint/base.js`, cada pacote tem `eslint.config.mjs`; o web usa os presets flat nativos do `eslint-config-next@16` (`next lint` não existe mais).
- Dev usa banco local; Supabase está pausado (URLs comentadas no .env).
