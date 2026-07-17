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

    const { professional, service, ranges, appointments, blocks } =
      await this.prisma.withTenant(tenant.id, async (tx) => {
        const prof = await tx.professional.findFirst({
          where: { id: query.professionalId, tenantId: tenant.id },
          include: { services: { select: { id: true } } },
        });
        if (!prof) throw new NotFoundException('Profissional não encontrado.');
        const svc = await tx.service.findFirst({
          where: { id: query.serviceId, tenantId: tenant.id },
        });
        if (!svc) throw new NotFoundException('Serviço não encontrado.');
        if (!prof.services.some((s) => s.id === svc.id)) {
          throw new BadRequestException('Este profissional não realiza este serviço.');
        }

        const weekday = weekdayOf(query.date);
        const workingRanges = await tx.workingHours.findMany({
          where: { tenantId: tenant.id, professionalId: prof.id, weekday },
          select: { startMinute: true, endMinute: true },
        });

        // Janela UTC generosa do dia local (±1 dia cobre qualquer fuso).
        const [y, m, d] = query.date.split('-').map(Number);
        const dayStartUtc = new Date(Date.UTC(y!, m! - 1, d!) - DAY_MS);
        const dayEndUtc = new Date(Date.UTC(y!, m! - 1, d!) + 2 * DAY_MS);

        const appts = await tx.appointment.findMany({
          where: {
            tenantId: tenant.id,
            professionalId: prof.id,
            status: { notIn: ['CANCELED'] },
            date: { gte: dayStartUtc, lt: dayEndUtc },
          },
          select: { date: true, service: { select: { duration: true } } },
        });
        const blks = await tx.scheduleBlock.findMany({
          where: {
            tenantId: tenant.id,
            professionalId: prof.id,
            startsAt: { lt: dayEndUtc },
            endsAt: { gt: dayStartUtc },
          },
          select: { startsAt: true, endsAt: true },
        });

        return {
          professional: prof,
          service: svc,
          ranges: workingRanges,
          appointments: appts,
          blocks: blks,
        };
      });

    const settings = (tenant.settings ?? {}) as { utcOffsetMinutes?: number };
    const utcOffsetMinutes = settings.utcOffsetMinutes ?? DEFAULT_UTC_OFFSET_MINUTES;

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
