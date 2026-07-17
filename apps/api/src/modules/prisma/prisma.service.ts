import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@consultorio/db';
import { TenantContext } from '../../common/tenant-context';

/** Client restrito passado aos callbacks de `withTenant` (sem métodos `$...`). */
export type TenantTx = Omit<PrismaClient, `$${string}`>;

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
   * Run `fn` inside a transaction with `app.tenant_id` set via set_config
   * (equivalente a SET LOCAL) so Postgres RLS policies on tenant-scoped
   * tables apply. Requer usuário de banco não-superuser em produção
   * (ver packages/db/prisma/roles.sql).
   */
  withTenant<T>(tenantId: string, fn: (tx: TenantTx) => Promise<T>): Promise<T> {
    const contextTenantId = TenantContext.tenantId();
    if (contextTenantId && contextTenantId !== tenantId) {
      // Bug de programação: um service tentou operar em um tenant diferente
      // do resolvido para o request autenticado.
      throw new Error(
        `withTenant(${tenantId}) conflita com o tenant do request (${contextTenantId})`,
      );
    }
    return this.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`;
      return fn(tx);
    });
  }
}
