import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { CreateProfessionalInput, UpdateProfessionalInput } from '@consultorio/contracts';
import { PrismaService } from '../prisma/prisma.service';

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
    return this.prisma.professional.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'asc' },
      select: SELECT,
    });
  }

  async create(tenantId: string, input: CreateProfessionalInput) {
    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      include: { plan: true },
    });
    const count = await this.prisma.professional.count({ where: { tenantId } });
    if (count >= tenant.plan.maxProfessionals) {
      throw new ForbiddenException(
        `Seu plano ${tenant.plan.code} permite até ${tenant.plan.maxProfessionals} profissional(is). Faça upgrade para adicionar mais.`,
      );
    }

    const emailTaken = await this.prisma.professional.findUnique({
      where: { tenantId_email: { tenantId, email: input.email } },
    });
    if (emailTaken) {
      throw new ConflictException(`Já existe profissional com o email ${input.email}.`);
    }

    const { serviceIds, ...data } = input;
    return this.prisma.professional.create({
      data: {
        ...data,
        tenantId,
        services: { connect: await this.ownServiceIds(tenantId, serviceIds) },
      },
      select: SELECT,
    });
  }

  async update(tenantId: string, id: string, input: UpdateProfessionalInput) {
    await this.ensureExists(tenantId, id);
    const { serviceIds, ...data } = input;
    return this.prisma.professional.update({
      where: { id },
      data: {
        ...data,
        ...(serviceIds !== undefined && {
          services: { set: await this.ownServiceIds(tenantId, serviceIds) },
        }),
      },
      select: SELECT,
    });
  }

  async remove(tenantId: string, id: string) {
    await this.ensureExists(tenantId, id);
    const appointments = await this.prisma.appointment.count({
      where: { tenantId, professionalId: id },
    });
    if (appointments > 0) {
      throw new ConflictException(
        'Este profissional tem agendamentos e não pode ser excluído.',
      );
    }
    await this.prisma.professional.delete({ where: { id } });
    return { deleted: true };
  }

  private async ensureExists(tenantId: string, id: string) {
    const found = await this.prisma.professional.findFirst({ where: { id, tenantId } });
    if (!found) throw new NotFoundException('Profissional não encontrado.');
  }

  /** Only connect services that belong to the same tenant. */
  private async ownServiceIds(tenantId: string, serviceIds: string[]) {
    if (serviceIds.length === 0) return [];
    const services = await this.prisma.service.findMany({
      where: { tenantId, id: { in: serviceIds } },
      select: { id: true },
    });
    return services;
  }
}
