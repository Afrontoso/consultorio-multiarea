import { AsyncLocalStorage } from 'node:async_hooks';

export interface TenantStore {
  tenantId: string;
}

const storage = new AsyncLocalStorage<TenantStore>();

/**
 * Contexto de tenant por request (AsyncLocalStorage), populado pelo
 * TenantScopeInterceptor. `PrismaService.withTenant` confere o tenantId
 * explícito contra este contexto como defesa em profundidade.
 */
export const TenantContext = {
  run<T>(tenantId: string, fn: () => T): T {
    return storage.run({ tenantId }, fn);
  },
  tenantId(): string | undefined {
    return storage.getStore()?.tenantId;
  },
};
