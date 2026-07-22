import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';

const getUserByEmail = jest.fn();
const createUser = jest.fn();
jest.mock('firebase-admin/auth', () => ({
  getAuth: () => ({ getUserByEmail, createUser }),
}));

import { ProfessionalsService } from './professionals.service';

type PrismaMock = {
  tenant: { findUniqueOrThrow: jest.Mock };
  professional: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
    findFirst: jest.Mock;
    count: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  user: { findUnique: jest.Mock; create: jest.Mock };
  service: { findMany: jest.Mock };
  appointment: { count: jest.Mock };
  withTenant: jest.Mock;
};

function buildPrismaMock(): PrismaMock {
  const mock = {
    tenant: { findUniqueOrThrow: jest.fn() },
    professional: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    user: { findUnique: jest.fn(), create: jest.fn() },
    service: { findMany: jest.fn() },
    appointment: { count: jest.fn() },
  };
  // withTenant entrega o próprio mock como tx (mesmos jest.Mock por modelo).
  return {
    ...mock,
    withTenant: jest.fn(async (_tenantId: string, fn: (tx: typeof mock) => unknown) =>
      fn(mock),
    ),
  };
}

const input = {
  name: 'Dra. Ana',
  email: 'ana@example.com',
  color: '#3b82f6',
  serviceIds: [] as string[],
};

describe('ProfessionalsService', () => {
  let prisma: PrismaMock;
  let service: ProfessionalsService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    const notifications = { professionalInvited: jest.fn() };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    service = new ProfessionalsService(prisma as any, notifications as any);
  });

  describe('create', () => {
    it('throws ForbiddenException when plan limit is reached', async () => {
      prisma.tenant.findUniqueOrThrow.mockResolvedValue({
        id: 't-1',
        plan: { code: 'FREE', maxProfessionals: 1 },
      });
      prisma.professional.count.mockResolvedValue(1);

      await expect(service.create('t-1', input)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws ConflictException when email already exists in tenant', async () => {
      prisma.tenant.findUniqueOrThrow.mockResolvedValue({
        id: 't-1',
        plan: { code: 'PRO', maxProfessionals: 3 },
      });
      prisma.professional.count.mockResolvedValue(1);
      prisma.professional.findUnique.mockResolvedValue({ id: 'p-existing' });

      await expect(service.create('t-1', input)).rejects.toBeInstanceOf(ConflictException);
    });

    it('creates professional scoped to tenant', async () => {
      prisma.tenant.findUniqueOrThrow.mockResolvedValue({
        id: 't-1',
        plan: { code: 'FREE', maxProfessionals: 1 },
      });
      prisma.professional.count.mockResolvedValue(0);
      prisma.professional.findUnique.mockResolvedValue(null);
      prisma.professional.create.mockResolvedValue({ id: 'p-1', name: input.name });

      await service.create('t-1', input);

      expect(prisma.professional.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tenantId: 't-1', name: input.name }),
        }),
      );
    });

    it('only connects services belonging to the tenant', async () => {
      prisma.tenant.findUniqueOrThrow.mockResolvedValue({
        id: 't-1',
        plan: { code: 'PRO', maxProfessionals: 3 },
      });
      prisma.professional.count.mockResolvedValue(0);
      prisma.professional.findUnique.mockResolvedValue(null);
      prisma.service.findMany.mockResolvedValue([{ id: 's-own' }]);
      prisma.professional.create.mockResolvedValue({ id: 'p-1' });

      await service.create('t-1', { ...input, serviceIds: ['s-own', 's-other-tenant'] });

      expect(prisma.service.findMany).toHaveBeenCalledWith({
        where: { tenantId: 't-1', id: { in: ['s-own', 's-other-tenant'] } },
        select: { id: true },
      });
      const call = prisma.professional.create.mock.calls[0][0];
      expect(call.data.services.connect).toEqual([{ id: 's-own' }]);
    });
  });

  describe('update', () => {
    it('throws NotFoundException for professional of another tenant', async () => {
      prisma.professional.findFirst.mockResolvedValue(null);
      await expect(service.update('t-1', 'p-alheio', { name: 'X' })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('throws ConflictException when professional has appointments', async () => {
      prisma.professional.findFirst.mockResolvedValue({ id: 'p-1' });
      prisma.appointment.count.mockResolvedValue(2);
      await expect(service.remove('t-1', 'p-1')).rejects.toBeInstanceOf(ConflictException);
    });

    it('deletes when there are no appointments', async () => {
      prisma.professional.findFirst.mockResolvedValue({ id: 'p-1' });
      prisma.appointment.count.mockResolvedValue(0);
      prisma.professional.delete.mockResolvedValue({ id: 'p-1' });

      const result = await service.remove('t-1', 'p-1');

      expect(result).toEqual({ deleted: true });
      expect(prisma.professional.delete).toHaveBeenCalledWith({ where: { id: 'p-1' } });
    });
  });

  describe('invite', () => {
    beforeEach(() => {
      getUserByEmail.mockReset();
      createUser.mockReset();
    });

    it('throws NotFoundException when professional does not belong to tenant', async () => {
      prisma.professional.findFirst.mockResolvedValue(null);
      await expect(service.invite('t-1', 'p-alheio')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ConflictException when professional already has a user', async () => {
      prisma.professional.findFirst.mockResolvedValue({ id: 'p-1', email: 'ana@example.com' });
      prisma.user.findUnique.mockResolvedValueOnce({ id: 'u-1' }); // by professionalId
      await expect(service.invite('t-1', 'p-1')).rejects.toBeInstanceOf(ConflictException);
    });

    it('throws ConflictException when email is already used by another user in the tenant', async () => {
      prisma.professional.findFirst.mockResolvedValue({ id: 'p-1', email: 'ana@example.com' });
      prisma.user.findUnique
        .mockResolvedValueOnce(null) // by professionalId
        .mockResolvedValueOnce({ id: 'u-2' }); // by tenantId_email
      await expect(service.invite('t-1', 'p-1')).rejects.toBeInstanceOf(ConflictException);
    });

    it('reuses an existing Firebase account by email and creates the User', async () => {
      prisma.professional.findFirst.mockResolvedValue({
        id: 'p-1',
        name: 'Dra. Ana',
        email: 'ana@example.com',
      });
      prisma.user.findUnique.mockResolvedValue(null);
      getUserByEmail.mockResolvedValue({ uid: 'firebase-uid-1' });
      prisma.user.create.mockResolvedValue({ id: 'u-new' });
      prisma.tenant.findUniqueOrThrow.mockResolvedValue({ id: 't-1', name: 'Consultório X' });

      const result = await service.invite('t-1', 'p-1');

      expect(createUser).not.toHaveBeenCalled();
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          firebaseUid: 'firebase-uid-1',
          email: 'ana@example.com',
          tenantId: 't-1',
          role: 'PROFESSIONAL',
          professionalId: 'p-1',
        },
      });
      expect(result).toEqual({ invited: true, email: 'ana@example.com' });
    });

    it('creates a new Firebase account when none exists for the email', async () => {
      prisma.professional.findFirst.mockResolvedValue({
        id: 'p-1',
        name: 'Dra. Ana',
        email: 'ana@example.com',
      });
      prisma.user.findUnique.mockResolvedValue(null);
      getUserByEmail.mockRejectedValue(new Error('user-not-found'));
      createUser.mockResolvedValue({ uid: 'firebase-uid-2' });
      prisma.user.create.mockResolvedValue({ id: 'u-new' });
      prisma.tenant.findUniqueOrThrow.mockResolvedValue({ id: 't-1', name: 'Consultório X' });

      await service.invite('t-1', 'p-1');

      expect(createUser).toHaveBeenCalledWith({ email: 'ana@example.com' });
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ firebaseUid: 'firebase-uid-2' }) }),
      );
    });
  });
});
