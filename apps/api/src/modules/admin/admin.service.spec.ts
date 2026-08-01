import { NotFoundException } from '@nestjs/common';
import { AdminService } from './admin.service';

type PrismaMock = {
  tenant: { findMany: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
  plan: { findMany: jest.Mock; findUnique: jest.Mock };
  appointment: { count: jest.Mock };
  adminAuditLog: { create: jest.Mock; findMany: jest.Mock };
  withGlobalScope: jest.Mock;
  $transaction: jest.Mock;
};

function buildPrisma(): PrismaMock {
  const models = {
    tenant: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    plan: { findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn() },
    appointment: { count: jest.fn().mockResolvedValue(0) },
    adminAuditLog: { create: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
  };
  // withGlobalScope/$transaction entregam o próprio mock como tx (mesmos
  // jest.Mock por modelo), como no spec de patients.
  return {
    ...models,
    withGlobalScope: jest.fn(async (fn: (tx: typeof models) => unknown) => fn(models)),
    $transaction: jest.fn(async (fn: (tx: typeof models) => unknown) => fn(models)),
  };
}

describe('AdminService', () => {
  let prisma: PrismaMock;
  let service: AdminService;

  beforeEach(() => {
    prisma = buildPrisma();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    service = new AdminService(prisma as any);
  });

  describe('metrics', () => {
    it('conta por status/plano e soma MRR só dos ACTIVE', async () => {
      prisma.tenant.findMany.mockResolvedValue([
        { status: 'ACTIVE', plan: { code: 'PRO', priceBRL: 99 } },
        { status: 'ACTIVE', plan: { code: 'PRO', priceBRL: 99 } },
        { status: 'TRIAL', plan: { code: 'FREE', priceBRL: 0 } },
        { status: 'SUSPENDED', plan: { code: 'PRO', priceBRL: 99 } },
      ]);
      prisma.appointment.count.mockResolvedValue(7);

      const m = await service.metrics();

      expect(m.totals.tenants).toBe(4);
      expect(m.totals.mrr).toBe(198); // 2 ACTIVE × 99 (suspenso não conta)
      expect(m.totals.appointmentsThisMonth).toBe(7);
      expect(m.byStatus).toMatchObject({ ACTIVE: 2, TRIAL: 1, SUSPENDED: 1, CANCELED: 0 });
      expect(m.byPlan).toEqual({ PRO: 3, FREE: 1 });
    });
  });

  describe('updateTenant', () => {
    const existing = { id: 't1', status: 'ACTIVE', planId: 'p1' };
    const updated = {
      id: 't1',
      name: 'Clínica',
      slug: 'clinica',
      status: 'SUSPENDED',
      trialEndsAt: null,
      createdAt: new Date(),
      plan: { id: 'p1', code: 'PRO', priceBRL: 99 },
    };

    it('atualiza status e registra auditoria com o email do ator', async () => {
      prisma.tenant.findUnique.mockResolvedValue(existing);
      prisma.tenant.update.mockResolvedValue(updated);

      await service.updateTenant('t1', { status: 'SUSPENDED' }, 'admin@x.co');

      expect(prisma.tenant.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 't1' }, data: { status: 'SUSPENDED' } }),
      );
      expect(prisma.adminAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            actorEmail: 'admin@x.co',
            action: 'UPDATE_TENANT',
            tenantId: 't1',
          }),
        }),
      );
    });

    it('grava mudança e auditoria na mesma transação', async () => {
      prisma.tenant.findUnique.mockResolvedValue(existing);
      prisma.tenant.update.mockResolvedValue(updated);

      await service.updateTenant('t1', { status: 'SUSPENDED' }, 'admin@x.co');

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('404 quando o tenant não existe', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);
      await expect(
        service.updateTenant('nope', { status: 'ACTIVE' }, 'admin@x.co'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('404 quando o plano informado não existe', async () => {
      prisma.tenant.findUnique.mockResolvedValue(existing);
      prisma.plan.findUnique.mockResolvedValue(null);
      await expect(
        service.updateTenant('t1', { planId: 'ghost' }, 'admin@x.co'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.tenant.update).not.toHaveBeenCalled();
    });
  });
});
