import { ConflictException, NotFoundException } from '@nestjs/common';
import { PatientsService } from './patients.service';

type PrismaMock = {
  patient: {
    findMany: jest.Mock;
    findFirst: jest.Mock;
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  appointment: { count: jest.Mock };
  withTenant: jest.Mock;
};

function buildPrismaMock(): PrismaMock {
  const mock = {
    patient: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    appointment: { count: jest.fn().mockResolvedValue(0) },
  };
  // withTenant entrega o próprio mock como tx (mesmos jest.Mock por modelo).
  return {
    ...mock,
    withTenant: jest.fn(async (_tenantId: string, fn: (tx: typeof mock) => unknown) =>
      fn(mock),
    ),
  };
}

const input = { name: 'Maria da Silva', phone: '11999990000' };

describe('PatientsService', () => {
  let prisma: PrismaMock;
  let service: PatientsService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    service = new PatientsService(prisma as any);
  });

  describe('list', () => {
    it('exclui soft-deletados e busca por nome ou telefone', async () => {
      await service.list('t-1', { search: 'mar' });

      expect(prisma.patient.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: 't-1',
            deletedAt: null,
            OR: [
              { name: { contains: 'mar', mode: 'insensitive' } },
              { phone: { contains: 'mar' } },
            ],
          }),
        }),
      );
    });
  });

  describe('create', () => {
    it('cria paciente novo', async () => {
      prisma.patient.findUnique.mockResolvedValue(null);
      prisma.patient.create.mockResolvedValue({ id: 'pat-1' });

      await service.create('t-1', input);

      expect(prisma.patient.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: { ...input, tenantId: 't-1' } }),
      );
    });

    it('409 se o telefone já pertence a paciente ativo', async () => {
      prisma.patient.findUnique.mockResolvedValue({ id: 'pat-1', deletedAt: null });

      await expect(service.create('t-1', input)).rejects.toBeInstanceOf(ConflictException);
    });

    it('reativa ficha soft-deletada com o mesmo telefone', async () => {
      prisma.patient.findUnique.mockResolvedValue({ id: 'pat-1', deletedAt: new Date() });
      prisma.patient.update.mockResolvedValue({ id: 'pat-1' });

      await service.create('t-1', input);

      expect(prisma.patient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'pat-1' },
          data: { ...input, deletedAt: null },
        }),
      );
    });
  });

  describe('update', () => {
    it('404 para paciente soft-deletado', async () => {
      prisma.patient.findFirst.mockResolvedValue(null);

      await expect(service.update('t-1', 'pat-1', { name: 'X' })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('409 se o novo telefone é de outro paciente', async () => {
      prisma.patient.findFirst.mockResolvedValue({ id: 'pat-1' });
      prisma.patient.findUnique.mockResolvedValue({ id: 'pat-2' });

      await expect(
        service.update('t-1', 'pat-1', { phone: '11888887777' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('remove', () => {
    it('soft-deleta paciente sem consultas futuras', async () => {
      prisma.patient.findFirst.mockResolvedValue({ id: 'pat-1' });

      const result = await service.remove('t-1', 'pat-1');

      expect(prisma.patient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'pat-1' },
          data: { deletedAt: expect.any(Date) },
        }),
      );
      expect(result).toEqual({ deleted: true });
    });

    it('409 se houver consultas futuras ativas', async () => {
      prisma.patient.findFirst.mockResolvedValue({ id: 'pat-1' });
      prisma.appointment.count.mockResolvedValue(2);

      await expect(service.remove('t-1', 'pat-1')).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.patient.update).not.toHaveBeenCalled();
    });
  });

  describe('get', () => {
    it('404 para paciente inexistente ou deletado', async () => {
      prisma.patient.findFirst.mockResolvedValue(null);

      await expect(service.get('t-1', 'pat-x')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
