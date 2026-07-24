import { NotFoundException } from '@nestjs/common';
import { BookingService } from './booking.service';
import { DEFAULT_UTC_OFFSET_MINUTES } from '../availability/slots';

type PrismaMock = {
  tenant: { findUnique: jest.Mock };
  service: { findMany: jest.Mock };
  professional: { findMany: jest.Mock };
  withTenant: jest.Mock;
};

function buildPrismaMock(): PrismaMock {
  const mock = {
    tenant: { findUnique: jest.fn() },
    service: { findMany: jest.fn().mockResolvedValue([]) },
    professional: { findMany: jest.fn().mockResolvedValue([]) },
  };
  // withTenant entrega o próprio mock como tx (mesmos jest.Mock por modelo).
  return {
    ...mock,
    withTenant: jest.fn(async (_tenantId: string, fn: (tx: typeof mock) => unknown) =>
      fn(mock),
    ),
  };
}

const activeTenant = {
  id: 't-1',
  slug: 'clinica-exemplo',
  name: 'Clínica Exemplo',
  category: 'PSICOLOGIA',
  status: 'ACTIVE',
  settings: null,
};

describe('BookingService', () => {
  let prisma: PrismaMock;
  let appointments: { create: jest.Mock };
  let service: BookingService;

  beforeEach(() => {
    prisma = buildPrismaMock();
    appointments = { create: jest.fn() };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    service = new BookingService(prisma as any, appointments as any);
  });

  describe('profile', () => {
    it('retorna tenant, profissionais e serviços com preço numérico', async () => {
      prisma.tenant.findUnique.mockResolvedValue(activeTenant);
      prisma.professional.findMany.mockResolvedValue([
        { id: 'prof-1', name: 'Ana', bio: 'Psicóloga', photoUrl: null, color: '#333' },
      ]);
      prisma.service.findMany.mockResolvedValue([
        { id: 'svc-1', name: 'Sessão', description: null, duration: 50, price: '180.00' },
      ]);

      const result = await service.profile('clinica-exemplo');

      expect(result.tenant).toEqual({
        slug: 'clinica-exemplo',
        name: 'Clínica Exemplo',
        category: 'PSICOLOGIA',
        watermark: false,
      });
      expect(result.professionals).toHaveLength(1);
      expect(result.services[0]!.price).toBe(180);
    });

    it('marca watermark quando o plano tem featuresJson.watermark (FREE)', async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        ...activeTenant,
        plan: { code: 'FREE', featuresJson: { watermark: true } },
      });

      const result = await service.profile('clinica-exemplo');

      expect(result.tenant.watermark).toBe(true);
    });

    it('404 para slug inexistente', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);

      await expect(service.profile('nao-existe')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('404 para tenant suspenso', async () => {
      prisma.tenant.findUnique.mockResolvedValue({ ...activeTenant, status: 'SUSPENDED' });

      await expect(service.profile('clinica-exemplo')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('catalog', () => {
    it('retorna dados do tenant e serviços com preço numérico', async () => {
      prisma.tenant.findUnique.mockResolvedValue(activeTenant);
      prisma.service.findMany.mockResolvedValue([
        {
          id: 'svc-1',
          name: 'Sessão',
          description: null,
          duration: 50,
          price: '180.00',
          professionals: [{ id: 'prof-1', name: 'Ana', bio: null, photoUrl: null, color: '#333' }],
        },
      ]);

      const result = await service.catalog('clinica-exemplo');

      expect(result.tenant).toEqual({
        slug: 'clinica-exemplo',
        name: 'Clínica Exemplo',
        category: 'PSICOLOGIA',
        utcOffsetMinutes: DEFAULT_UTC_OFFSET_MINUTES,
        watermark: false,
      });
      expect(result.services[0]!.price).toBe(180);
    });

    it('só lista serviços que têm ao menos um profissional', async () => {
      prisma.tenant.findUnique.mockResolvedValue(activeTenant);

      await service.catalog('clinica-exemplo');

      expect(prisma.service.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 't-1', professionals: { some: {} } },
        }),
      );
    });

    it('usa utcOffsetMinutes das settings quando definido', async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        ...activeTenant,
        settings: { utcOffsetMinutes: -240 },
      });

      const result = await service.catalog('clinica-exemplo');

      expect(result.tenant.utcOffsetMinutes).toBe(-240);
    });

    it('404 para slug inexistente', async () => {
      prisma.tenant.findUnique.mockResolvedValue(null);

      await expect(service.catalog('nao-existe')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('404 para tenant suspenso', async () => {
      prisma.tenant.findUnique.mockResolvedValue({ ...activeTenant, status: 'SUSPENDED' });

      await expect(service.catalog('clinica-exemplo')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('book', () => {
    const input = {
      date: new Date('2026-07-20T13:00:00Z'),
      professionalId: 'prof-1',
      serviceId: 'svc-1',
      patient: { name: 'Paciente Teste', phone: '11999990000' },
      consent: true as const,
    };

    it('delega ao motor de agendamentos com o tenantId resolvido pelo slug', async () => {
      prisma.tenant.findUnique.mockResolvedValue(activeTenant);
      appointments.create.mockResolvedValue({ id: 'apt-1' });

      const result = await service.book('clinica-exemplo', input);

      expect(appointments.create).toHaveBeenCalledWith('t-1', input);
      expect(result).toEqual({ id: 'apt-1' });
    });

    it('404 para tenant cancelado, sem chamar o motor', async () => {
      prisma.tenant.findUnique.mockResolvedValue({ ...activeTenant, status: 'CANCELED' });

      await expect(service.book('clinica-exemplo', input)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(appointments.create).not.toHaveBeenCalled();
    });
  });
});
