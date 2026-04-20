import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@consultorio/db';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({ log: ['warn', 'error'] });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /**
   * Run `fn` inside a transaction with `SET LOCAL app.tenant_id = <tenantId>`
   * so Postgres RLS policies on tenant-scoped tables apply.
   */
  withTenant<T>(
    tenantId: string,
    fn: (tx: Omit<PrismaClient, `$${string}`>) => Promise<T>,
  ): Promise<T> {
    return this.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        `SET LOCAL app.tenant_id = '${tenantId.replace(/'/g, "''")}'`,
      );
      return fn(tx);
    });
  }
}
