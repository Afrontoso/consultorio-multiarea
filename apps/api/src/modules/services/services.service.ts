import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { CreateServiceInput, UpdateServiceInput } from '@consultorio/contracts';
import { PrismaService, type TenantTx } from '../prisma/prisma.service';

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
    const services = await this.prisma.withTenant(tenantId, (tx) =>
      tx.service.findMany({
        where: { tenantId },
        orderBy: { name: 'asc' },
        select: SELECT,
      }),
    );
    return services.map(toDto);
  }

  async create(tenantId: string, input: CreateServiceInput): Promise<ServiceDto> {
    const created = await this.prisma.withTenant(tenantId, async (tx) => {
      const { professionalIds, ...data } = input;
      return tx.service.create({
        data: {
          ...data,
          tenantId,
          professionals: {
            connect: await this.ownProfessionalIds(tx, tenantId, professionalIds),
          },
        },
        select: SELECT,
      });
    });
    return toDto(created);
  }

  async update(tenantId: string, id: string, input: UpdateServiceInput): Promise<ServiceDto> {
    const updated = await this.prisma.withTenant(tenantId, async (tx) => {
      await this.ensureExists(tx, tenantId, id);
      const { professionalIds, ...data } = input;
      return tx.service.update({
        where: { id },
        data: {
          ...data,
          ...(professionalIds !== undefined && {
            professionals: {
              set: await this.ownProfessionalIds(tx, tenantId, professionalIds),
            },
          }),
        },
        select: SELECT,
      });
    });
    return toDto(updated);
  }

  remove(tenantId: string, id: string) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      await this.ensureExists(tx, tenantId, id);
      const appointments = await tx.appointment.count({
        where: { tenantId, serviceId: id },
      });
      if (appointments > 0) {
        throw new ConflictException('Este serviço tem agendamentos e não pode ser excluído.');
      }
      await tx.service.delete({ where: { id } });
      return { deleted: true };
    });
  }

  private async ensureExists(tx: TenantTx, tenantId: string, id: string) {
    const found = await tx.service.findFirst({ where: { id, tenantId } });
    if (!found) throw new NotFoundException('Serviço não encontrado.');
  }

  /** Only connect professionals that belong to the same tenant. */
  private async ownProfessionalIds(tx: TenantTx, tenantId: string, professionalIds: string[]) {
    if (professionalIds.length === 0) return [];
    return tx.professional.findMany({
      where: { tenantId, id: { in: professionalIds } },
      select: { id: true },
    });
  }
}
