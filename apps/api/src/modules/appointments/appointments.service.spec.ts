import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AppointmentsService, monthWindowUtc } from './appointments.service';

type PrismaMock = {
  tenant: { findUniqueOrThrow: jest.Mock };
  professional: { findFirst: jest.Mock };
  service: { findFirst: jest.Mock };
  patient: { findFirst: jest.Mock; findUniqueOrThrow: jest.Mock; upsert: jest.Mock };
  appointment: {
    findMany: jest.Mock;
    findFirst: jest.Mock;
    count: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  scheduleBlock: { findMany: jest.Mock };
  withTenant: jest.Mock;
};

function buildPrismaMock(): PrismaMock {
  const mock = {
    tenant: { findUniqueOrThrow: jest.fn() },
    professional: { findFirst: jest.fn() },
    service: { findFirst: jest.fn() },
    patient: { findFirst: jest.fn(), findUniqueOrThrow: jest.fn(), upsert: jest.fn() },
    appointment: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn(),
      update: jest.fn(),
    },
    scheduleBlock: { findMany: jest.fn().mockResolvedValue([]) },
  };
  // withTenant entrega o próprio mock como tx (mesmos jest.Mock por modelo).
  return {
    ...mock,
    withTenant: jest.fn(async (_tenantId: string, fn: (tx: typeof mock) => unknown) =>
      fn(mock),
    ),
  };
}

const baseInput = {
  date: new Date('2026-07-13T12:00:00Z'),
  professionalId: 'prof-1',
  serviceId: 'svc-1',
  patient: { name: 'Paciente Teste', phone: '11999990000' },
};

function happyPathMocks(prisma: PrismaMock) {
  prisma.tenant.findUniqueOrThrow.mockResolvedValue({
    id: 't-1',
    name: 'Clínica Teste',
    settings: null,
    plan: { code: 'FREE', maxAppointmentsPerMonth: 30 },
  });
  prisma.professional.findFirst.mockResolvedValue({
    id: 'prof-1',
    name: 'Ana',
    email: 'ana@example.com',
  });
  prisma.service.findFirst.mockResolvedValue({ id: 'svc-1', name: 'Sessão', duration: 60 });
  prisma.patient.upsert.mockResolvedValue({ id: 'pat-1' });
  prisma.patient.findUniqueOrThrow.mockResolvedValue({
    id: 'pat-1',
    name: 'Paciente Teste',
    email: 'paciente@example.com',
  });
  prisma.appointment.create.mockResolvedValue({ id: 'apt-1' });
}

describe('monthWindowUtc', () => {
  it('vira o mês no fuso do consultório (UTC-3), não em UTC', () => {
    // 2026-08-01T02:30Z ainda é 31 de julho 23:30 no fuso -180.
    const { monthStart, monthEnd } = monthWindowUtc(new Date('2026-08-01T02:30:00Z'), -180);
    expect(monthStart.toISOString()).toBe('2026-07-01T03:00:00.000Z');
    expect(monthEnd.toISOString()).toBe('2026-08-01T03:00:00.000Z');
  });
});

describe('AppointmentsService', () => {
  let prisma: PrismaMock;
  let notifications: { appointmentConfirmed: jest.Mock; appointmentCanceled: jest.Mock };
  let service: AppointmentsService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    notifications = { appointmentConfirmed: jest.fn(), appointmentCanceled: jest.fn() };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    service = new AppointmentsService(prisma as any, notifications as any);
  });

  describe('create', () => {
    it('cria agendamento com paciente inline (upsert por telefone)', async () => {
      happyPathMocks(prisma);

      await service.create('t-1', baseInput);

      expect(prisma.patient.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId_phone: { tenantId: 't-1', phone: '11999990000' } },
        }),
      );
      expect(prisma.appointment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: 't-1',
            patientId: 'pat-1',
            status: 'CONFIRMED',
          }),
        }),
      );
    });

    it('dispara email de confirmação após criar', async () => {
      happyPathMocks(prisma);

      await service.create('t-1', baseInput);

      expect(notifications.appointmentConfirmed).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantName: 'Clínica Teste',
          patientEmail: 'paciente@example.com',
          professionalEmail: 'ana@example.com',
        }),
      );
    });

    it('rejeita profissional de outro tenant', async () => {
      happyPathMocks(prisma);
      prisma.professional.findFirst.mockResolvedValue(null);
      await expect(service.create('t-1', baseInput)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejeita quando o limite mensal do plano foi atingido', async () => {
      happyPathMocks(prisma);
      prisma.appointment.count.mockResolvedValue(30);
      await expect(service.create('t-1', baseInput)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('agendamentos CANCELED não contam no limite mensal', async () => {
      happyPathMocks(prisma);
      await service.create('t-1', baseInput);
      expect(prisma.appointment.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: { notIn: ['CANCELED'] } }),
        }),
      );
    });

    it('rejeita conflito com agendamento existente sobreposto', async () => {
      happyPathMocks(prisma);
      // Existente 11:30–12:30 UTC conflita com novo 12:00–13:00 UTC
      prisma.appointment.findMany.mockResolvedValue([
        { date: new Date('2026-07-13T11:30:00Z'), service: { duration: 60 } },
      ]);
      await expect(service.create('t-1', baseInput)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('não conflita com agendamento que termina exatamente no início do novo', async () => {
      happyPathMocks(prisma);
      // Existente 11:00–12:00 UTC encosta no novo 12:00–13:00 UTC
      prisma.appointment.findMany.mockResolvedValue([
        { date: new Date('2026-07-13T11:00:00Z'), service: { duration: 60 } },
      ]);
      await expect(service.create('t-1', baseInput)).resolves.toBeDefined();
    });

    it('rejeita horário dentro de bloqueio de agenda', async () => {
      happyPathMocks(prisma);
      prisma.scheduleBlock.findMany.mockResolvedValue([{ id: 'blk-1' }]);
      await expect(service.create('t-1', baseInput)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('usa patientId existente sem upsert, validando o tenant', async () => {
      happyPathMocks(prisma);
      prisma.patient.findFirst.mockResolvedValue({ id: 'pat-9' });

      await service.create('t-1', {
        date: baseInput.date,
        professionalId: 'prof-1',
        serviceId: 'svc-1',
        patientId: 'pat-9',
      });

      expect(prisma.patient.upsert).not.toHaveBeenCalled();
      expect(prisma.appointment.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ patientId: 'pat-9' }) }),
      );
    });
  });

  describe('update', () => {
    const existingAppointment = {
      id: 'apt-1',
      date: new Date('2026-07-13T12:00:00Z'),
      status: 'CONFIRMED',
      professionalId: 'prof-1',
      tenant: { name: 'Clínica Teste', settings: null },
      service: { name: 'Sessão', duration: 60 },
      professional: { name: 'Ana' },
      patient: { name: 'Paciente Teste', email: 'paciente@example.com' },
    };

    it('remarcar revalida conflito ignorando o próprio agendamento', async () => {
      prisma.appointment.findFirst.mockResolvedValue(existingAppointment);
      prisma.appointment.update.mockResolvedValue({ id: 'apt-1' });

      await service.update('t-1', 'apt-1', { date: new Date('2026-07-13T15:00:00Z') });

      expect(prisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: { not: 'apt-1' } }),
        }),
      );
    });

    it('mudança só de status não roda checagem de conflito', async () => {
      prisma.appointment.findFirst.mockResolvedValue(existingAppointment);
      prisma.appointment.update.mockResolvedValue({ id: 'apt-1' });

      await service.update('t-1', 'apt-1', { status: 'CANCELED' });

      expect(prisma.appointment.findMany).not.toHaveBeenCalled();
    });

    it('cancelamento dispara email para o paciente', async () => {
      prisma.appointment.findFirst.mockResolvedValue(existingAppointment);
      prisma.appointment.update.mockResolvedValue({ id: 'apt-1' });

      await service.update('t-1', 'apt-1', { status: 'CANCELED' });

      expect(notifications.appointmentCanceled).toHaveBeenCalledWith(
        expect.objectContaining({ patientEmail: 'paciente@example.com' }),
      );
    });

    it('cancelamento de agendamento já cancelado não dispara email de novo', async () => {
      prisma.appointment.findFirst.mockResolvedValue({
        ...existingAppointment,
        status: 'CANCELED',
      });
      prisma.appointment.update.mockResolvedValue({ id: 'apt-1' });

      await service.update('t-1', 'apt-1', { status: 'CANCELED' });

      expect(notifications.appointmentCanceled).not.toHaveBeenCalled();
    });

    it('agendamento de outro tenant é 404', async () => {
      prisma.appointment.findFirst.mockResolvedValue(null);
      await expect(
        service.update('t-1', 'apt-alheio', { status: 'CANCELED' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('usage', () => {
    it('retorna uso do mês corrente com plano e limite', async () => {
      prisma.tenant.findUniqueOrThrow.mockResolvedValue({
        id: 't-1',
        plan: { code: 'FREE', maxAppointmentsPerMonth: 30 },
      });
      prisma.appointment.count.mockResolvedValue(25);

      const result = await service.usage('t-1');

      expect(result).toEqual({ planCode: 'FREE', used: 25, limit: 30 });
      expect(prisma.appointment.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: 't-1',
            status: { notIn: ['CANCELED'] },
          }),
        }),
      );
    });
  });
});
