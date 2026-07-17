import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateProfessionalInput,
  CreateScheduleBlockInput,
  SetWorkingHoursInput,
  UpdateProfessionalInput,
} from '@consultorio/contracts';
import { PrismaService, type TenantTx } from '../prisma/prisma.service';

const SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  bio: true,
  photoUrl: true,
  color: true,
  createdAt: true,
  services: { select: { id: true, name: true } },
} as const;

@Injectable()
export class ProfessionalsService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string) {
    return this.prisma.withTenant(tenantId, (tx) =>
      tx.professional.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'asc' },
        select: SELECT,
      }),
    );
  }

  create(tenantId: string, input: CreateProfessionalInput) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const tenant = await tx.tenant.findUniqueOrThrow({
        where: { id: tenantId },
        include: { plan: true },
      });
      const count = await tx.professional.count({ where: { tenantId } });
      if (count >= tenant.plan.maxProfessionals) {
        throw new ForbiddenException(
          `Seu plano ${tenant.plan.code} permite até ${tenant.plan.maxProfessionals} profissional(is). Faça upgrade para adicionar mais.`,
        );
      }

      const emailTaken = await tx.professional.findUnique({
        where: { tenantId_email: { tenantId, email: input.email } },
      });
      if (emailTaken) {
        throw new ConflictException(`Já existe profissional com o email ${input.email}.`);
      }

      const { serviceIds, ...data } = input;
      return tx.professional.create({
        data: {
          ...data,
          tenantId,
          services: { connect: await this.ownServiceIds(tx, tenantId, serviceIds) },
        },
        select: SELECT,
      });
    });
  }

  update(tenantId: string, id: string, input: UpdateProfessionalInput) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      await this.ensureExists(tx, tenantId, id);
      const { serviceIds, ...data } = input;
      return tx.professional.update({
        where: { id },
        data: {
          ...data,
          ...(serviceIds !== undefined && {
            services: { set: await this.ownServiceIds(tx, tenantId, serviceIds) },
          }),
        },
        select: SELECT,
      });
    });
  }

  remove(tenantId: string, id: string) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      await this.ensureExists(tx, tenantId, id);
      const appointments = await tx.appointment.count({
        where: { tenantId, professionalId: id },
      });
      if (appointments > 0) {
        throw new ConflictException(
          'Este profissional tem agendamentos e não pode ser excluído.',
        );
      }
      await tx.professional.delete({ where: { id } });
      return { deleted: true };
    });
  }

  getWorkingHours(tenantId: string, professionalId: string) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      await this.ensureExists(tx, tenantId, professionalId);
      return this.readWorkingHours(tx, tenantId, professionalId);
    });
  }

  setWorkingHours(tenantId: string, professionalId: string, input: SetWorkingHoursInput) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      await this.ensureExists(tx, tenantId, professionalId);
      await tx.workingHours.deleteMany({ where: { tenantId, professionalId } });
      await tx.workingHours.createMany({
        data: input.ranges.map((r) => ({ ...r, tenantId, professionalId })),
      });
      return this.readWorkingHours(tx, tenantId, professionalId);
    });
  }

  listBlocks(tenantId: string, professionalId: string) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      await this.ensureExists(tx, tenantId, professionalId);
      return tx.scheduleBlock.findMany({
        where: { tenantId, professionalId, endsAt: { gte: new Date() } },
        orderBy: { startsAt: 'asc' },
        select: { id: true, startsAt: true, endsAt: true, reason: true },
      });
    });
  }

  createBlock(tenantId: string, professionalId: string, input: CreateScheduleBlockInput) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      await this.ensureExists(tx, tenantId, professionalId);
      return tx.scheduleBlock.create({
        data: { ...input, tenantId, professionalId },
        select: { id: true, startsAt: true, endsAt: true, reason: true },
      });
    });
  }

  removeBlock(tenantId: string, professionalId: string, blockId: string) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const block = await tx.scheduleBlock.findFirst({
        where: { id: blockId, tenantId, professionalId },
      });
      if (!block) throw new NotFoundException('Bloqueio não encontrado.');
      await tx.scheduleBlock.delete({ where: { id: blockId } });
      return { deleted: true };
    });
  }

  private readWorkingHours(tx: TenantTx, tenantId: string, professionalId: string) {
    return tx.workingHours.findMany({
      where: { tenantId, professionalId },
      orderBy: [{ weekday: 'asc' }, { startMinute: 'asc' }],
      select: { id: true, weekday: true, startMinute: true, endMinute: true },
    });
  }

  private async ensureExists(tx: TenantTx, tenantId: string, id: string) {
    const found = await tx.professional.findFirst({ where: { id, tenantId } });
    if (!found) throw new NotFoundException('Profissional não encontrado.');
  }

  /** Only connect services that belong to the same tenant. */
  private async ownServiceIds(tx: TenantTx, tenantId: string, serviceIds: string[]) {
    if (serviceIds.length === 0) return [];
    const services = await tx.service.findMany({
      where: { tenantId, id: { in: serviceIds } },
      select: { id: true },
    });
    return services;
  }
}
