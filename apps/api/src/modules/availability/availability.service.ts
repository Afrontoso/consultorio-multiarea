import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { AvailabilityQuery } from '@consultorio/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { computeSlots, weekdayOf, DEFAULT_UTC_OFFSET_MINUTES } from './slots';

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async slotsForDay(slug: string, query: AvailabilityQuery) {
    const tenant = await this.prisma.tenant.findUnique({ where: { slug } });
    if (!tenant || tenant.status === 'SUSPENDED' || tenant.status === 'CANCELED') {
      throw new NotFoundException('Consultório não encontrado.');
    }

    const [professional, service] = await Promise.all([
      this.prisma.professional.findFirst({
        where: { id: query.professionalId, tenantId: tenant.id },
        include: { services: { select: { id: true } } },
      }),
      this.prisma.service.findFirst({
        where: { id: query.serviceId, tenantId: tenant.id },
      }),
    ]);
    if (!professional) throw new NotFoundException('Profissional não encontrado.');
    if (!service) throw new NotFoundException('Serviço não encontrado.');
    if (!professional.services.some((s) => s.id === service.id)) {
      throw new BadRequestException('Este profissional não realiza este serviço.');
    }

    const settings = (tenant.settings ?? {}) as { utcOffsetMinutes?: number };
    const utcOffsetMinutes = settings.utcOffsetMinutes ?? DEFAULT_UTC_OFFSET_MINUTES;

    const weekday = weekdayOf(query.date);
    const ranges = await this.prisma.workingHours.findMany({
      where: { tenantId: tenant.id, professionalId: professional.id, weekday },
      select: { startMinute: true, endMinute: true },
    });

    // Janela UTC generosa do dia local (±1 dia cobre qualquer fuso).
    const [y, m, d] = query.date.split('-').map(Number);
    const dayStartUtc = new Date(Date.UTC(y!, m! - 1, d!) - DAY_MS);
    const dayEndUtc = new Date(Date.UTC(y!, m! - 1, d!) + 2 * DAY_MS);

    const [appointments, blocks] = await Promise.all([
      this.prisma.appointment.findMany({
        where: {
          tenantId: tenant.id,
          professionalId: professional.id,
          status: { notIn: ['CANCELED'] },
          date: { gte: dayStartUtc, lt: dayEndUtc },
        },
        select: { date: true, service: { select: { duration: true } } },
      }),
      this.prisma.scheduleBlock.findMany({
        where: {
          tenantId: tenant.id,
          professionalId: professional.id,
          startsAt: { lt: dayEndUtc },
          endsAt: { gt: dayStartUtc },
        },
        select: { startsAt: true, endsAt: true },
      }),
    ]);

    const busy = [
      ...appointments.map((a) => ({
        start: a.date,
        end: new Date(a.date.getTime() + a.service.duration * 60_000),
      })),
      ...blocks.map((b) => ({ start: b.startsAt, end: b.endsAt })),
    ];

    const slots = computeSlots({
      date: query.date,
      utcOffsetMinutes,
      durationMinutes: service.duration,
      ranges,
      busy,
      now: new Date(),
    });

    return {
      date: query.date,
      professionalId: professional.id,
      serviceId: service.id,
      durationMinutes: service.duration,
      slots: slots.map((s) => s.toISOString()),
    };
  }
}
