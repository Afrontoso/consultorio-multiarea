import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  CreatePatientInput,
  ListPatientsQuery,
  UpdatePatientInput,
} from '@consultorio/contracts';
import { PrismaService } from '../prisma/prisma.service';

const SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  birthDate: true,
  notes: true,
  createdAt: true,
} as const;

@Injectable()
export class PatientsService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string, query: ListPatientsQuery) {
    return this.prisma.patient.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(query.search && {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' } },
            { phone: { contains: query.search } },
          ],
        }),
      },
      orderBy: { name: 'asc' },
      select: SELECT,
    });
  }

  /** Ficha do paciente: dados + histórico de agendamentos. */
  async get(tenantId: string, id: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: {
        ...SELECT,
        appointments: {
          orderBy: { date: 'desc' },
          select: {
            id: true,
            date: true,
            status: true,
            professional: { select: { id: true, name: true, color: true } },
            service: { select: { id: true, name: true, duration: true } },
          },
        },
      },
    });
    if (!patient) throw new NotFoundException('Paciente não encontrado.');
    return patient;
  }

  async create(tenantId: string, input: CreatePatientInput) {
    const existing = await this.prisma.patient.findUnique({
      where: { tenantId_phone: { tenantId, phone: input.phone } },
    });
    if (existing && !existing.deletedAt) {
      throw new ConflictException(`Já existe paciente com o telefone ${input.phone}.`);
    }
    if (existing) {
      // Telefone de um paciente soft-deletado: reativa a ficha com os dados novos.
      return this.prisma.patient.update({
        where: { id: existing.id },
        data: { ...input, deletedAt: null },
        select: SELECT,
      });
    }
    return this.prisma.patient.create({
      data: { ...input, tenantId },
      select: SELECT,
    });
  }

  async update(tenantId: string, id: string, input: UpdatePatientInput) {
    await this.ensureExists(tenantId, id);
    if (input.phone) {
      const phoneTaken = await this.prisma.patient.findUnique({
        where: { tenantId_phone: { tenantId, phone: input.phone } },
      });
      if (phoneTaken && phoneTaken.id !== id) {
        throw new ConflictException(`Já existe paciente com o telefone ${input.phone}.`);
      }
    }
    return this.prisma.patient.update({
      where: { id },
      data: input,
      select: SELECT,
    });
  }

  /** Soft-delete (LGPD). Bloqueado enquanto houver consultas futuras ativas. */
  async remove(tenantId: string, id: string) {
    await this.ensureExists(tenantId, id);
    const upcoming = await this.prisma.appointment.count({
      where: {
        tenantId,
        patientId: id,
        status: { notIn: ['CANCELED'] },
        date: { gte: new Date() },
      },
    });
    if (upcoming > 0) {
      throw new ConflictException(
        'Este paciente tem consultas futuras. Cancele-as antes de excluir a ficha.',
      );
    }
    await this.prisma.patient.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { deleted: true };
  }

  private async ensureExists(tenantId: string, id: string) {
    const found = await this.prisma.patient.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!found) throw new NotFoundException('Paciente não encontrado.');
  }
}
