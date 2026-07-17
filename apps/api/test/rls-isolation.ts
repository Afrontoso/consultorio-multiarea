/**
 * Teste de integração do isolamento multi-tenant via RLS.
 *
 * Prova que, conectado com a role de aplicação (não-superuser), um request
 * com `app.tenant_id` do tenant A não lê nem escreve dados do tenant B —
 * mesmo SEM nenhum filtro `where: { tenantId }` (simulando um bug de where).
 *
 * Pré-requisitos: Postgres local com migrations aplicadas (container
 * consultorio-pg) e DATABASE_URL de admin no .env.
 *
 * Rodar: pnpm --filter @consultorio/api test:rls
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaClient } from '@consultorio/db';

const PRISMA_DIR = join(__dirname, '..', '..', '..', 'packages', 'db', 'prisma');
const API_ROLE = 'consultorio_api';
const API_PASSWORD = 'consultorio_api_dev';

/**
 * Divide um arquivo SQL em statements, respeitando dollar-quoting ($$...$$),
 * strings ('...') e comentários de linha (-- ...).
 */
export function splitSql(sql: string): string[] {
  const statements: string[] = [];
  let current = '';
  let inDollar = false;
  let inString = false;
  let inComment = false;
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i]!;
    if (inComment) {
      current += ch;
      if (ch === '\n') inComment = false;
      continue;
    }
    if (!inString && !inDollar && sql.startsWith('--', i)) {
      inComment = true;
      current += ch;
      continue;
    }
    if (!inString && sql.startsWith('$$', i)) {
      inDollar = !inDollar;
      current += '$$';
      i++;
      continue;
    }
    if (!inDollar && ch === "'") {
      inString = !inString;
      current += ch;
      continue;
    }
    if (ch === ';' && !inDollar && !inString) {
      if (current.trim()) statements.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.trim()) statements.push(current.trim());
  // Descarta fragmentos que são só comentário
  return statements.filter((s) => s.replace(/^\s*--.*$/gm, '').trim().length > 0);
}

function apiRoleUrl(adminUrl: string): string {
  const url = new URL(adminUrl);
  url.username = API_ROLE;
  url.password = API_PASSWORD;
  return url.toString();
}

async function applySqlFile(client: PrismaClient, file: string): Promise<void> {
  const sql = readFileSync(join(PRISMA_DIR, file), 'utf8');
  for (const statement of splitSql(sql)) {
    await client.$executeRawUnsafe(statement);
  }
}

async function main(): Promise<void> {
  const adminUrl = process.env.DATABASE_URL;
  if (!adminUrl) throw new Error('DATABASE_URL não definida (rode com --env-file=.env).');

  const admin = new PrismaClient({ datasources: { db: { url: adminUrl } } });
  const api = new PrismaClient({ datasources: { db: { url: apiRoleUrl(adminUrl) } } });

  const stamp = Date.now();
  const slugA = `rls-test-a-${stamp}`;
  const slugB = `rls-test-b-${stamp}`;

  let tenantAId = '';
  let tenantBId = '';

  try {
    // Setup (como admin): policies, role de app e dados de dois tenants.
    await applySqlFile(admin, 'rls.sql');
    await applySqlFile(admin, 'roles.sql');

    const plan = await admin.plan.upsert({
      where: { code: 'FREE' },
      update: {},
      create: {
        code: 'FREE',
        priceBRL: 0,
        maxProfessionals: 1,
        maxAppointmentsPerMonth: 30,
        allowsCustomDomain: false,
        allowsBranding: false,
        featuresJson: {},
      },
    });

    const tenantA = await admin.tenant.create({
      data: { slug: slugA, name: 'Tenant A', category: 'PSICOLOGIA', planId: plan.id },
    });
    const tenantB = await admin.tenant.create({
      data: { slug: slugB, name: 'Tenant B', category: 'NUTRICAO', planId: plan.id },
    });
    tenantAId = tenantA.id;
    tenantBId = tenantB.id;

    await admin.professional.create({
      data: { tenantId: tenantAId, name: 'Prof A', email: `a-${stamp}@rls.test` },
    });
    await admin.professional.create({
      data: { tenantId: tenantBId, name: 'Prof B', email: `b-${stamp}@rls.test` },
    });

    // 1) Sem contexto de tenant: nenhuma linha visível.
    const withoutContext = await api.professional.findMany({
      where: { tenantId: { in: [tenantAId, tenantBId] } },
    });
    assert.equal(withoutContext.length, 0, 'sem app.tenant_id nada deve ser visível');
    console.log('✓ sem contexto de tenant, role da API não lê nenhuma linha');

    // 2) Contexto do tenant A + findMany SEM where de tenant (bug simulado):
    //    só as linhas do tenant A aparecem.
    const asTenantA = await api.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT set_config('app.tenant_id', ${tenantAId}, true)`;
      return tx.professional.findMany({
        where: { email: { endsWith: `-${stamp}@rls.test` } },
      });
    });
    assert.equal(asTenantA.length, 1, 'contexto A deve ver exatamente 1 profissional');
    assert.equal(asTenantA[0]!.tenantId, tenantAId, 'a linha visível deve ser do tenant A');
    console.log('✓ com app.tenant_id = A, dados do tenant B ficam invisíveis mesmo sem where');

    // 3) Escrita cruzada: inserir linha do tenant B sob contexto A é bloqueado.
    await assert.rejects(
      api.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT set_config('app.tenant_id', ${tenantAId}, true)`;
        return tx.professional.create({
          data: { tenantId: tenantBId, name: 'Intruso', email: `x-${stamp}@rls.test` },
        });
      }),
      'inserir dados de outro tenant deve violar a policy',
    );
    console.log('✓ escrita cruzada de tenant é bloqueada pela policy');

    console.log('\nRLS OK: isolamento multi-tenant verificado.');
  } finally {
    await admin.professional.deleteMany({
      where: { tenantId: { in: [tenantAId, tenantBId].filter(Boolean) } },
    });
    await admin.tenant.deleteMany({ where: { slug: { in: [slugA, slugB] } } });
    await admin.$disconnect();
    await api.$disconnect();
  }
}

void main().catch((err) => {
  console.error('RLS FALHOU:', err);
  process.exitCode = 1;
});
