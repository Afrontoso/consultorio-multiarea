import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { CreateServiceInput, UpdateServiceInput } from '@consultorio/contracts';
import { PrismaService } from '../prisma/prisma.service';

const SELECT = {
  id: true,
  name: true,
  description: true,
  duration: true,
  price: true,
  professionals: { select: { id: true, name: true } },
} as const;

export interface ServiceDto {
  id: string;
  name: string;
  description: string | null;
  duration: number;
  price: number;
  professionals: { id: string; name: string }[];
}

/** Prisma Decimal → number para o JSON da API. */
function toDto(svc: { price: unknown } & Omit<ServiceDto, 'price'>): ServiceDto {
  return { ...svc, price: Number(svc.price) };
}

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string): Promise<ServiceDto[]> {
    const services = await this.prisma.service.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
      select: SELECT,
    });
    return services.map(toDto);
  }

  async create(tenantId: string, input: CreateServiceInput): Promise<ServiceDto> {
    const { professionalIds, ...data } = input;
    const created = await this.prisma.service.create({
      data: {
        ...data,
        tenantId,
        professionals: { connect: await this.ownProfessionalIds(tenantId, professionalIds) },
      },
      select: SELECT,
    });
    return toDto(created);
  }

  async update(tenantId: string, id: string, input: UpdateServiceInput): Promise<ServiceDto> {
    await this.ensureExists(tenantId, id);
    const { professionalIds, ...data } = input;
    const updated = await this.prisma.service.update({
      where: { id },
      data: {
        ...data,
        ...(professionalIds !== undefined && {
          professionals: { set: await this.ownProfessionalIds(tenantId, professionalIds) },
        }),
      },
      select: SELECT,
    });
    return toDto(updated);
  }

  async remove(tenantId: string, id: string) {
    await this.ensureExists(tenantId, id);
    const appointments = await this.prisma.appointment.count({
      where: { tenantId, serviceId: id },
    });
    if (appointments > 0) {
      throw new ConflictException('Este serviço tem agendamentos e não pode ser excluído.');
    }
    await this.prisma.service.delete({ where: { id } });
    return { deleted: true };
  }

  private async ensureExists(tenantId: string, id: string) {
    const found = await this.prisma.service.findFirst({ where: { id, tenantId } });
    if (!found) throw new NotFoundException('Serviço não encontrado.');
  }

  /** Only connect professionals that belong to the same tenant. */
  private async ownProfessionalIds(tenantId: string, professionalIds: string[]) {
    if (professionalIds.length === 0) return [];
    return this.prisma.professional.findMany({
      where: { tenantId, id: { in: professionalIds } },
      select: { id: true },
    });
  }
}
