import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { TERMS_VERSION } from '@consultorio/contracts';
import { decryptField, encryptField } from '../../common/crypto/field-crypto';

const getUserByEmail = jest.fn();
const createUser = jest.fn();
jest.mock('firebase-admin/auth', () => ({
  getAuth: () => ({ getUserByEmail, createUser }),
}));

import { PatientsService } from './patients.service';

type PrismaMock = {
  patient: {
    findMany: jest.Mock;
    findFirst: jest.Mock;
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  user: { findUnique: jest.Mock; create: jest.Mock };
  tenant: { findUniqueOrThrow: jest.Mock };
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
    user: { findUnique: jest.fn(), create: jest.fn() },
    tenant: { findUniqueOrThrow: jest.fn() },
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

// Adulto (birthDate obrigatório desde a #27): não exige responsável.
const input = {
  name: 'Maria da Silva',
  phone: '11999990000',
  birthDate: new Date('1990-01-01T00:00:00.000Z'),
};

describe('PatientsService', () => {
  let prisma: PrismaMock;
  let service: PatientsService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    const notifications = { patientInvited: jest.fn() };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    service = new PatientsService(prisma as any, notifications as any);
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

      const data = prisma.patient.create.mock.calls[0][0].data;
      expect(data).toMatchObject({ name: input.name, phone: input.phone, tenantId: 't-1' });
    });

    it('cifra notes/birthDate e registra consentimento ao criar', async () => {
      prisma.patient.findUnique.mockResolvedValue(null);
      prisma.patient.create.mockResolvedValue({ id: 'pat-1' });

      await service.create('t-1', {
        name: 'Maria da Silva',
        phone: '11999990000',
        notes: 'Dado sensível',
        birthDate: new Date('1990-05-10T00:00:00.000Z'),
        consent: true,
      });

      const data = prisma.patient.create.mock.calls[0][0].data;
      expect(data.notes).toMatch(/^v1:/);
      expect(decryptField(data.notes)).toBe('Dado sensível');
      expect(data.birthDate).toMatch(/^v1:/);
      expect(new Date(decryptField(data.birthDate)).toISOString()).toBe(
        '1990-05-10T00:00:00.000Z',
      );
      expect(data.consentAt).toBeInstanceOf(Date);
      expect(data.consentVersion).toBe(TERMS_VERSION);
    });

    it('repassa os dados do responsável ao criar paciente menor', async () => {
      prisma.patient.findUnique.mockResolvedValue(null);
      prisma.patient.create.mockResolvedValue({ id: 'pat-1' });

      await service.create('t-1', {
        name: 'João Junior',
        phone: '11988887777',
        birthDate: new Date('2015-03-01T00:00:00.000Z'),
        guardianName: 'Maria Mãe',
        guardianPhone: '11999990000',
        guardianRelationship: 'mãe',
      });

      const data = prisma.patient.create.mock.calls[0][0].data;
      expect(data).toMatchObject({
        guardianName: 'Maria Mãe',
        guardianPhone: '11999990000',
        guardianRelationship: 'mãe',
      });
    });

    it('409 se o telefone já pertence a paciente ativo', async () => {
      prisma.patient.findUnique.mockResolvedValue({ id: 'pat-1', deletedAt: null });

      await expect(service.create('t-1', input)).rejects.toBeInstanceOf(ConflictException);
    });

    it('reativa ficha soft-deletada com o mesmo telefone', async () => {
      prisma.patient.findUnique.mockResolvedValue({ id: 'pat-1', deletedAt: new Date() });
      prisma.patient.update.mockResolvedValue({ id: 'pat-1' });

      await service.create('t-1', input);

      const call = prisma.patient.update.mock.calls[0][0];
      expect(call.where).toEqual({ id: 'pat-1' });
      expect(call.data).toMatchObject({ name: input.name, deletedAt: null });
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

    it('decifra notes/birthDate ao ler a ficha', async () => {
      prisma.patient.findFirst.mockResolvedValue({
        id: 'pat-1',
        name: 'Maria',
        notes: encryptField('Anotação sensível'),
        birthDate: encryptField('1990-05-10T00:00:00.000Z'),
        appointments: [],
      });

      const patient = await service.get('t-1', 'pat-1');

      expect(patient.notes).toBe('Anotação sensível');
      expect(patient.birthDate?.toISOString()).toBe('1990-05-10T00:00:00.000Z');
    });
  });

  describe('invite', () => {
    beforeEach(() => {
      getUserByEmail.mockReset();
      createUser.mockReset();
    });

    it('404 para paciente que não pertence ao tenant', async () => {
      prisma.patient.findFirst.mockResolvedValue(null);
      await expect(service.invite('t-1', 'pat-alheio')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('400 quando o paciente não tem email cadastrado', async () => {
      prisma.patient.findFirst.mockResolvedValue({ id: 'pat-1', name: 'Maria', email: null });
      await expect(service.invite('t-1', 'pat-1')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('409 quando o paciente já tem acesso', async () => {
      prisma.patient.findFirst.mockResolvedValue({
        id: 'pat-1',
        name: 'Maria',
        email: 'maria@example.com',
      });
      prisma.user.findUnique.mockResolvedValueOnce({ id: 'u-1' }); // by patientId
      await expect(service.invite('t-1', 'pat-1')).rejects.toBeInstanceOf(ConflictException);
    });

    it('409 quando o email já está em uso por outro usuário do tenant', async () => {
      prisma.patient.findFirst.mockResolvedValue({
        id: 'pat-1',
        name: 'Maria',
        email: 'maria@example.com',
      });
      prisma.user.findUnique
        .mockResolvedValueOnce(null) // by patientId
        .mockResolvedValueOnce({ id: 'u-2' }); // by tenantId_email
      await expect(service.invite('t-1', 'pat-1')).rejects.toBeInstanceOf(ConflictException);
    });

    it('convida com sucesso reaproveitando usuário Firebase existente', async () => {
      prisma.patient.findFirst.mockResolvedValue({
        id: 'pat-1',
        name: 'Maria',
        email: 'maria@example.com',
      });
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.tenant.findUniqueOrThrow.mockResolvedValue({ id: 't-1', name: 'Clínica Teste' });
      getUserByEmail.mockResolvedValue({ uid: 'firebase-uid-1' });

      const result = await service.invite('t-1', 'pat-1');

      expect(createUser).not.toHaveBeenCalled();
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          firebaseUid: 'firebase-uid-1',
          email: 'maria@example.com',
          tenantId: 't-1',
          role: 'PATIENT',
          patientId: 'pat-1',
        },
      });
      expect(result).toEqual({ invited: true, email: 'maria@example.com' });
    });

    it('cria usuário Firebase quando não existe um com o email', async () => {
      prisma.patient.findFirst.mockResolvedValue({
        id: 'pat-1',
        name: 'Maria',
        email: 'maria@example.com',
      });
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.tenant.findUniqueOrThrow.mockResolvedValue({ id: 't-1', name: 'Clínica Teste' });
      getUserByEmail.mockRejectedValue(new Error('user-not-found'));
      createUser.mockResolvedValue({ uid: 'firebase-uid-2' });

      await service.invite('t-1', 'pat-1');

      expect(createUser).toHaveBeenCalledWith({ email: 'maria@example.com' });
    });
  });
});
