import { ConflictException, NotFoundException } from '@nestjs/common';
import type { CreateTenantInput } from '@consultorio/contracts';
import { TenantsService } from './tenants.service';

type TxMock = {
  tenant: { create: jest.Mock };
  user: { create: jest.Mock };
  $executeRawUnsafe: jest.Mock;
};

type PrismaMock = {
  plan: { findUnique: jest.Mock };
  tenant: { findUnique: jest.Mock };
  user: { findUnique: jest.Mock };
  $transaction: jest.Mock;
  tx: TxMock;
};

function buildPrismaMock(): PrismaMock {
  const tx: TxMock = {
    tenant: { create: jest.fn() },
    user: { create: jest.fn() },
    $executeRawUnsafe: jest.fn().mockResolvedValue(undefined),
  };
  return {
    plan: { findUnique: jest.fn() },
    tenant: { findUnique: jest.fn() },
    user: { findUnique: jest.fn() },
    $transaction: jest.fn(async (cb: (t: TxMock) => Promise<unknown>) => cb(tx)),
    tx,
  };
}

const input: CreateTenantInput = {
  slug: 'clinica-arte',
  name: 'Clínica Arte de Cuidar',
  category: 'PSICOLOGIA',
  ownerEmail: 'owner@example.com',
  ownerName: 'Ana Owner',
};

describe('TenantsService.createTenant', () => {
  let prisma: PrismaMock;
  let service: TenantsService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    service = new TenantsService(prisma as any);
  });

  it('throws NotFoundException when FREE plan is missing', async () => {
    prisma.plan.findUnique.mockResolvedValue(null);
    await expect(service.createTenant(input, 'uid-1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws ConflictException when slug is taken', async () => {
    prisma.plan.findUnique.mockResolvedValue({ id: 'plan-free', code: 'FREE' });
    prisma.tenant.findUnique.mockResolvedValue({ id: 't-existing', slug: input.slug });
    await expect(service.createTenant(input, 'uid-1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws ConflictException when firebase uid already owns a tenant', async () => {
    prisma.plan.findUnique.mockResolvedValue({ id: 'plan-free', code: 'FREE' });
    prisma.tenant.findUnique.mockResolvedValue(null);
    prisma.user.findUnique.mockResolvedValue({ id: 'u-1', firebaseUid: 'uid-1' });
    await expect(service.createTenant(input, 'uid-1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('creates tenant + owner user inside a transaction with SET LOCAL app.tenant_id', async () => {
    prisma.plan.findUnique.mockResolvedValue({ id: 'plan-free', code: 'FREE' });
    prisma.tenant.findUnique.mockResolvedValue(null);
    prisma.user.findUnique.mockResolvedValue(null);

    const createdTenant = {
      id: 'tenant-1',
      slug: input.slug,
      name: input.name,
      category: input.category,
      status: 'TRIAL',
      planId: 'plan-free',
      trialEndsAt: new Date(),
    };
    prisma.tx.tenant.create.mockResolvedValue(createdTenant);
    prisma.tx.user.create.mockResolvedValue({ id: 'user-1' });

    const result = await service.createTenant(input, 'uid-owner');

    expect(result).toBe(createdTenant);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.tx.tenant.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        slug: input.slug,
        name: input.name,
        category: input.category,
        planId: 'plan-free',
        status: 'TRIAL',
        trialEndsAt: expect.any(Date),
      }),
    });
    expect(prisma.tx.$executeRawUnsafe).toHaveBeenCalledWith(
      `SET LOCAL app.tenant_id = 'tenant-1'`,
    );
    expect(prisma.tx.user.create).toHaveBeenCalledWith({
      data: {
        firebaseUid: 'uid-owner',
        email: input.ownerEmail,
        tenantId: 'tenant-1',
        role: 'OWNER',
      },
    });
  });

  it('sets trialEndsAt ~14 days in the future', async () => {
    prisma.plan.findUnique.mockResolvedValue({ id: 'plan-free', code: 'FREE' });
    prisma.tenant.findUnique.mockResolvedValue(null);
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.tx.tenant.create.mockResolvedValue({ id: 'tenant-1' });
    prisma.tx.user.create.mockResolvedValue({ id: 'u-1' });

    const before = Date.now();
    await service.createTenant(input, 'uid-owner');
    const after = Date.now();

    const call = prisma.tx.tenant.create.mock.calls[0][0];
    const trialEndsAt: Date = call.data.trialEndsAt;
    const fourteenDays = 14 * 24 * 60 * 60 * 1000;
    expect(trialEndsAt.getTime()).toBeGreaterThanOrEqual(before + fourteenDays - 1000);
    expect(trialEndsAt.getTime()).toBeLessThanOrEqual(after + fourteenDays + 1000);
  });
});
