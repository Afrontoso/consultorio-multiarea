import { ConflictException, NotFoundException } from '@nestjs/common';
import { ServicesService } from './services.service';

type PrismaMock = {
  service: {
    findMany: jest.Mock;
    findFirst: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  professional: { findMany: jest.Mock };
  appointment: { count: jest.Mock };
};

function buildPrismaMock(): PrismaMock {
  return {
    service: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    professional: { findMany: jest.fn() },
    appointment: { count: jest.fn() },
  };
}

const input = {
  name: 'Sessão de terapia',
  duration: 50,
  price: 180,
  professionalIds: [] as string[],
};

describe('ServicesService', () => {
  let prisma: PrismaMock;
  let service: ServicesService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    service = new ServicesService(prisma as any);
  });

  it('list converts Decimal price to number', async () => {
    prisma.service.findMany.mockResolvedValue([
      { id: 's-1', name: 'Sessão', description: null, duration: 50, price: '180.00', professionals: [] },
    ]);

    const result = await service.list('t-1');

    expect(result[0]!.price).toBe(180);
    expect(typeof result[0]!.price).toBe('number');
    expect(prisma.service.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tenantId: 't-1' } }),
    );
  });

  it('create scopes service to tenant and converts price', async () => {
    prisma.service.create.mockResolvedValue({
      id: 's-1',
      name: input.name,
      description: null,
      duration: 50,
      price: '180.00',
      professionals: [],
    });

    const result = await service.create('t-1', input);

    expect(result.price).toBe(180);
    expect(prisma.service.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tenantId: 't-1', name: input.name }),
      }),
    );
  });

  it('update throws NotFoundException for service of another tenant', async () => {
    prisma.service.findFirst.mockResolvedValue(null);
    await expect(service.update('t-1', 's-alheio', { name: 'X' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('remove throws ConflictException when service has appointments', async () => {
    prisma.service.findFirst.mockResolvedValue({ id: 's-1' });
    prisma.appointment.count.mockResolvedValue(1);
    await expect(service.remove('t-1', 's-1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('remove deletes when there are no appointments', async () => {
    prisma.service.findFirst.mockResolvedValue({ id: 's-1' });
    prisma.appointment.count.mockResolvedValue(0);
    prisma.service.delete.mockResolvedValue({ id: 's-1' });

    const result = await service.remove('t-1', 's-1');

    expect(result).toEqual({ deleted: true });
  });
});
