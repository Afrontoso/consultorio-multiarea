import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateAppointmentInput,
  ListAppointmentsQuery,
  UpdateAppointmentInput,
} from '@consultorio/contracts';
import { PrismaService, type TenantTx } from '../prisma/prisma.service';
import { DEFAULT_UTC_OFFSET_MINUTES } from '../availability/slots';

const SELECT = {
  id: true,
  date: true,
  status: true,
  notes: true,
  professional: { select: { id: true, name: true, color: true } },
  patient: { select: { id: true, name: true, phone: true } },
  service: { select: { id: true, name: true, duration: true } },
} as const;

// Janela de busca para checagem de conflito (maior duração possível de serviço).
const MAX_SERVICE_MINUTES = 480;

@Injectable()
export class AppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string, query: ListAppointmentsQuery) {
    return this.prisma.withTenant(tenantId, (tx) =>
      tx.appointment.findMany({
        where: {
          tenantId,
          ...(query.professionalId && { professionalId: query.professionalId }),
          ...(query.status && { status: query.status }),
          date: {
            ...(query.from && { gte: query.from }),
            ...(query.to && { lt: query.to }),
          },
        },
        orderBy: { date: 'asc' },
        select: SELECT,
      }),
    );
  }

  create(tenantId: string, input: CreateAppointmentInput) {
    // Transação única: checagem de limite/conflito e criação são atômicas.
    return this.prisma.withTenant(tenantId, async (tx) => {
      const tenant = await tx.tenant.findUniqueOrThrow({
        where: { id: tenantId },
        include: { plan: true },
      });
      const professional = await tx.professional.findFirst({
        where: { id: input.professionalId, tenantId },
      });
      if (!professional) throw new NotFoundException('Profissional não encontrado.');
      const service = await tx.service.findFirst({
        where: { id: input.serviceId, tenantId },
      });
      if (!service) throw new NotFoundException('Serviço não encontrado.');

      await this.ensureMonthlyLimit(tx, tenantId, tenant.plan, input.date);
      await this.ensureNoConflict(
        tx,
        tenantId,
        input.professionalId,
        input.date,
        service.duration,
      );

      const patientId = await this.resolvePatient(tx, tenantId, input);

      return tx.appointment.create({
        data: {
          tenantId,
          date: input.date,
          professionalId: input.professionalId,
          serviceId: input.serviceId,
          patientId,
          notes: input.notes,
          recurrence: input.recurrence,
          status: 'CONFIRMED',
        },
        select: SELECT,
      });
    });
  }

  update(tenantId: string, id: string, input: UpdateAppointmentInput) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const existing = await tx.appointment.findFirst({
        where: { id, tenantId },
        include: { service: { select: { duration: true } } },
      });
      if (!existing) throw new NotFoundException('Agendamento não encontrado.');

      if (input.date && input.date.getTime() !== existing.date.getTime()) {
        await this.ensureNoConflict(
          tx,
          tenantId,
          existing.professionalId,
          input.date,
          existing.service.duration,
          id,
        );
      }

      return tx.appointment.update({
        where: { id },
        data: {
          ...(input.date && { date: input.date }),
          ...(input.status && { status: input.status }),
          ...(input.notes !== undefined && { notes: input.notes }),
        },
        select: SELECT,
      });
    });
  }

  /** Conflito com agendamentos ativos e bloqueios do profissional. */
  private async ensureNoConflict(
    tx: TenantTx,
    tenantId: string,
    professionalId: string,
    start: Date,
    durationMinutes: number,
    ignoreAppointmentId?: string,
  ) {
    const end = new Date(start.getTime() + durationMinutes * 60_000);
    const windowStart = new Date(start.getTime() - MAX_SERVICE_MINUTES * 60_000);

    const appointments = await tx.appointment.findMany({
      where: {
        tenantId,
        professionalId,
        status: { notIn: ['CANCELED'] },
        date: { gte: windowStart, lt: end },
        ...(ignoreAppointmentId && { id: { not: ignoreAppointmentId } }),
      },
      select: { date: true, service: { select: { duration: true } } },
    });
    const blocks = await tx.scheduleBlock.findMany({
      where: {
        tenantId,
        professionalId,
        startsAt: { lt: end },
        endsAt: { gt: start },
      },
      select: { id: true },
    });

    const hasAppointmentConflict = appointments.some((a) => {
      const aEnd = new Date(a.date.getTime() + a.service.duration * 60_000);
      return start < aEnd && end > a.date;
    });
    if (hasAppointmentConflict) {
      throw new ConflictException('Horário indisponível: conflita com outro agendamento.');
    }
    if (blocks.length > 0) {
      throw new ConflictException('Horário indisponível: agenda bloqueada neste período.');
    }
  }

  /** Limite do plano por mês-calendário no fuso do consultório. */
  private async ensureMonthlyLimit(
    tx: TenantTx,
    tenantId: string,
    plan: { code: string; maxAppointmentsPerMonth: number },
    date: Date,
  ) {
    const offsetMs = DEFAULT_UTC_OFFSET_MINUTES * 60_000;
    const local = new Date(date.getTime() + offsetMs);
    const monthStart = new Date(
      Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1) - offsetMs,
    );
    const monthEnd = new Date(
      Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + 1, 1) - offsetMs,
    );

    const count = await tx.appointment.count({
      where: {
        tenantId,
        status: { notIn: ['CANCELED'] },
        date: { gte: monthStart, lt: monthEnd },
      },
    });
    if (count >= plan.maxAppointmentsPerMonth) {
      throw new ForbiddenException(
        `Limite de ${plan.maxAppointmentsPerMonth} agendamentos/mês do plano ${plan.code} atingido. Faça upgrade para continuar agendando.`,
      );
    }
  }

  /** patientId existente ou upsert do paciente inline pelo telefone. */
  private async resolvePatient(tx: TenantTx, tenantId: string, input: CreateAppointmentInput) {
    if (input.patientId) {
      const patient = await tx.patient.findFirst({
        where: { id: input.patientId, tenantId },
      });
      if (!patient) throw new NotFoundException('Paciente não encontrado.');
      return patient.id;
    }
    if (!input.patient) {
      throw new BadRequestException('Informe patientId ou os dados do paciente.');
    }
    const patient = await tx.patient.upsert({
      where: { tenantId_phone: { tenantId, phone: input.patient.phone } },
      // Agendar de novo reativa ficha soft-deletada (consentimento renovado).
      update: { name: input.patient.name, email: input.patient.email, deletedAt: null },
      create: { ...input.patient, tenantId },
    });
    return patient.id;
  }
}
