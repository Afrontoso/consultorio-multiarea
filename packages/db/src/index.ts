import { PrismaClient } from '@prisma/client';

export * from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma: PrismaClient =
  globalThis.__prisma ?? new PrismaClient({ log: ['warn', 'error'] });

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma;
}

/**
 * Wrap a unit of work in a transaction with `SET LOCAL app.tenant_id = $1`
 * so Postgres RLS policies on tenant-scoped tables take effect.
 */
export async function withTenant<T>(
  tenantId: string,
  fn: (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL app.tenant_id = '${tenantId.replace(/'/g, "''")}'`);
    return fn(tx);
  });
}
