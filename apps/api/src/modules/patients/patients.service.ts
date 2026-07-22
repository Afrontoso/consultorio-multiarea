import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { getAuth } from 'firebase-admin/auth';
import type {
  CreatePatientInput,
  ListPatientsQuery,
  UpdatePatientInput,
} from '@consultorio/contracts';
import { PrismaService, type TenantTx } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

const SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  birthDate: true,
  notes: true,
  createdAt: true,
  user: { select: { id: true } },
} as const;

function inviteLoginUrl(): string {
  const origin = process.env.WEB_ORIGIN?.split(',')[0]?.trim() || 'http://localhost:3000';
  return `${origin}/paciente`;
}

@Injectable()
export class PatientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  list(tenantId: string, query: ListPatientsQuery) {
    return this.prisma.withTenant(tenantId, (tx) =>
      tx.patient.findMany({
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
      }),
    );
  }

  /** Ficha do paciente: dados + histórico de agendamentos. */
  async get(tenantId: string, id: string) {
    const patient = await this.prisma.withTenant(tenantId, (tx) =>
      tx.patient.findFirst({
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
      }),
    );
    if (!patient) throw new NotFoundException('Paciente não encontrado.');
    return patient;
  }

  create(tenantId: string, input: CreatePatientInput) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const existing = await tx.patient.findUnique({
        where: { tenantId_phone: { tenantId, phone: input.phone } },
      });
      if (existing && !existing.deletedAt) {
        throw new ConflictException(`Já existe paciente com o telefone ${input.phone}.`);
      }
      if (existing) {
        // Telefone de um paciente soft-deletado: reativa a ficha com os dados novos.
        return tx.patient.update({
          where: { id: existing.id },
          data: { ...input, deletedAt: null },
          select: SELECT,
        });
      }
      return tx.patient.create({
        data: { ...input, tenantId },
        select: SELECT,
      });
    });
  }

  update(tenantId: string, id: string, input: UpdatePatientInput) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      await this.ensureExists(tx, tenantId, id);
      if (input.phone) {
        const phoneTaken = await tx.patient.findUnique({
          where: { tenantId_phone: { tenantId, phone: input.phone } },
        });
        if (phoneTaken && phoneTaken.id !== id) {
          throw new ConflictException(`Já existe paciente com o telefone ${input.phone}.`);
        }
      }
      return tx.patient.update({
        where: { id },
        data: input,
        select: SELECT,
      });
    });
  }

  /** Soft-delete (LGPD). Bloqueado enquanto houver consultas futuras ativas. */
  remove(tenantId: string, id: string) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      await this.ensureExists(tx, tenantId, id);
      const upcoming = await tx.appointment.count({
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
      await tx.patient.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
      return { deleted: true };
    });
  }

  async invite(tenantId: string, patientId: string) {
    // Checagens dentro da transação; a chamada ao Firebase fica fora (I/O de
    // rede não deve segurar a transação Postgres aberta).
    const patient = await this.prisma.withTenant(tenantId, async (tx) => {
      const patient = await tx.patient.findFirst({
        where: { id: patientId, tenantId, deletedAt: null },
      });
      if (!patient) throw new NotFoundException('Paciente não encontrado.');
      if (!patient.email) {
        throw new BadRequestException('Cadastre um email para este paciente antes de convidar.');
      }

      const existingUser = await tx.user.findUnique({ where: { patientId } });
      if (existingUser) {
        throw new ConflictException('Este paciente já tem acesso à área do paciente.');
      }
      const emailTaken = await tx.user.findUnique({
        where: { tenantId_email: { tenantId, email: patient.email } },
      });
      if (emailTaken) {
        throw new ConflictException('Já existe um usuário com este email neste consultório.');
      }
      return patient;
    });

    const auth = getAuth();
    let firebaseUid: string;
    try {
      firebaseUid = (await auth.getUserByEmail(patient.email!)).uid;
    } catch {
      firebaseUid = (await auth.createUser({ email: patient.email! })).uid;
    }

    const tenantName = await this.prisma.withTenant(tenantId, async (tx) => {
      try {
        await tx.user.create({
          data: {
            firebaseUid,
            email: patient.email!,
            tenantId,
            role: 'PATIENT',
            patientId,
          },
        });
      } catch {
        throw new ConflictException('Este email já está associado a outra conta no sistema.');
      }
      const tenant = await tx.tenant.findUniqueOrThrow({ where: { id: tenantId } });
      return tenant.name;
    });

    this.notifications.patientInvited({
      to: patient.email!,
      patientName: patient.name,
      tenantName,
      loginUrl: inviteLoginUrl(),
    });

    return { invited: true, email: patient.email! };
  }

  private async ensureExists(tx: TenantTx, tenantId: string, id: string) {
    const found = await tx.patient.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!found) throw new NotFoundException('Paciente não encontrado.');
  }
}
