/**
 * Expiração de trial: suspende os consultórios cujo período de teste venceu.
 *
 * Tenants com status TRIAL e `trialEndsAt` no passado passam a SUSPENDED
 * (a página pública já bloqueia SUSPENDED). Pensado para rodar diariamente
 * (Fly scheduled machine ou cron):
 *
 *   pnpm --filter @consultorio/db expire:trials
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const now = new Date();
  const expired = await prisma.tenant.findMany({
    where: { status: 'TRIAL', trialEndsAt: { not: null, lt: now } },
    select: { id: true, name: true, slug: true, trialEndsAt: true },
  });

  if (expired.length === 0) {
    console.log('[expire-trials] nenhum trial vencido.');
    return;
  }

  const result = await prisma.tenant.updateMany({
    where: { status: 'TRIAL', trialEndsAt: { not: null, lt: now } },
    data: { status: 'SUSPENDED' },
  });

  console.log(`[expire-trials] ${result.count} consultório(s) suspenso(s):`);
  for (const t of expired) {
    console.log(`  ✓ ${t.slug} (${t.name}) — trial venceu em ${t.trialEndsAt?.toISOString()}`);
  }
}

main()
  .catch((err) => {
    console.error('[expire-trials] falhou:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
