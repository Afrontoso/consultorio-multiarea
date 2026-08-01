import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  TERMS_VERSION,
  type CreatePatientInput,
  type GuardianInput,
  type ListPatientsQuery,
  type UpdatePatientInput,
} from '@consultorio/contracts';
import { Prisma } from '@consultorio/db';
import { PrismaService, type TenantTx } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  decryptField,
  decryptOptional,
  encryptField,
  encryptOptional,
} from '../../common/crypto/field-crypto';
import { grantTenantAccess, inviteLoginUrl } from '../../common/invites/invite';

const SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  birthDate: true,
  notes: true,
  guardians: true,
  createdAt: true,
  user: { select: { id: true } },
} as const;

type PatientWrite = CreatePatientInput | UpdatePatientInput;

/**
 * Monta os dados de escrita: cifra os campos sensíveis (`notes`, `birthDate`)
 * e traduz o `consent` do contrato em `consentAt`/`consentVersion`. Só toca
 * chaves presentes no input (seguro para create e para update parcial).
 */
function toWriteData(input: PatientWrite): Prisma.PatientUncheckedUpdateInput {
  const { consent, birthDate, notes, guardians, ...rest } = input;
  const data: Prisma.PatientUncheckedUpdateInput = { ...rest };
  if ('notes' in input) data.notes = encryptOptional(notes ?? null);
  if ('birthDate' in input) {
    data.birthDate = birthDate ? encryptField(new Date(birthDate).toISOString()) : null;
  }
  // Responsáveis: lista em texto claro (Json). Ausência → não mexe; presença
  // (mesmo vazia) sobrescreve.
  if (guardians !== undefined) {
    data.guardians = guardians as Prisma.InputJsonValue;
  }
  if (consent === true) {
    data.consentAt = new Date();
    data.consentVersion = TERMS_VERSION;
  }
  return data;
}

/**
 * Decifra os campos sensíveis de uma ficha lida do banco e normaliza
 * `guardians` (Json) para um tipo concreto — assim o retorno não vaza o tipo
 * `Prisma.JsonValue` (não-nomeável na fronteira do controller).
 */
function decryptPatient<
  T extends { birthDate: string | null; notes: string | null; guardians?: unknown },
>(
  patient: T,
): Omit<T, 'birthDate' | 'notes' | 'guardians'> & {
  birthDate: Date | null;
  notes: string | null;
  guardians: GuardianInput[];
} {
  return {
    ...patient,
    notes: decryptOptional(patient.notes),
    birthDate: patient.birthDate ? new Date(decryptField(patient.birthDate)) : null,
    guardians: (patient.guardians as GuardianInput[] | null) ?? [],
  };
}

// DTOs de resposta explícitos: evitam vazar o tipo Json do Prisma (não
// nomeável na fronteira do controller) e documentam o contrato da ficha.
export interface PatientResponse {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  birthDate: Date | null;
  notes: string | null;
  guardians: GuardianInput[];
  createdAt: Date;
  user: { id: string } | null;
}

export interface PatientDetailResponse extends PatientResponse {
  appointments: {
    id: string;
    date: Date;
    status: string;
    professional: { id: string; name: string; color: string };
    service: { id: string; name: string; duration: number };
  }[];
}

@Injectable()
export class PatientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async list(tenantId: string, query: ListPatientsQuery): Promise<PatientResponse[]> {
    const patients = await this.prisma.withTenant(tenantId, (tx) =>
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
    return patients.map(decryptPatient);
  }

  /** Ficha do paciente: dados + histórico de agendamentos. */
  async get(tenantId: string, id: string): Promise<PatientDetailResponse> {
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
    return decryptPatient(patient);
  }

  create(tenantId: string, input: CreatePatientInput): Promise<PatientResponse> {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const existing = await tx.patient.findUnique({
        where: { tenantId_phone: { tenantId, phone: input.phone } },
      });
      if (existing && !existing.deletedAt) {
        throw new ConflictException(`Já existe paciente com o telefone ${input.phone}.`);
      }
      if (existing) {
        // Telefone de um paciente soft-deletado: reativa a ficha com os dados novos.
        const patient = await tx.patient.update({
          where: { id: existing.id },
          data: { ...toWriteData(input), deletedAt: null },
          select: SELECT,
        });
        return decryptPatient(patient);
      }
      const patient = await tx.patient.create({
        data: { ...toWriteData(input), tenantId } as Prisma.PatientUncheckedCreateInput,
        select: SELECT,
      });
      return decryptPatient(patient);
    });
  }

  update(tenantId: string, id: string, input: UpdatePatientInput): Promise<PatientResponse> {
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
      const patient = await tx.patient.update({
        where: { id },
        data: toWriteData(input),
        select: SELECT,
      });
      return decryptPatient(patient);
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
    // Checagens dentro da transação; o convite em si (Firebase + criação do
    // User) sai fora dela, em grantTenantAccess. Devolve nome e email já
    // estreitados para string — o `email` da ficha é opcional.
    const patient = await this.prisma.withTenant(tenantId, async (tx) => {
      const patient = await tx.patient.findFirst({
        where: { id: patientId, tenantId, deletedAt: null },
      });
      if (!patient) throw new NotFoundException('Paciente não encontrado.');
      const email = patient.email;
      if (!email) {
        throw new BadRequestException('Cadastre um email para este paciente antes de convidar.');
      }

      const existingUser = await tx.user.findUnique({ where: { patientId } });
      if (existingUser) {
        throw new ConflictException('Este paciente já tem acesso à área do paciente.');
      }
      const emailTaken = await tx.user.findUnique({
        where: { tenantId_email: { tenantId, email } },
      });
      if (emailTaken) {
        throw new ConflictException('Já existe um usuário com este email neste consultório.');
      }
      return { name: patient.name, email };
    });

    const tenantName = await grantTenantAccess(this.prisma, {
      tenantId,
      email: patient.email,
      role: 'PATIENT',
      link: { patientId },
    });

    this.notifications.patientInvited({
      to: patient.email,
      patientName: patient.name,
      tenantName,
      loginUrl: inviteLoginUrl('/paciente'),
    });

    return { invited: true, email: patient.email };
  }

  private async ensureExists(tx: TenantTx, tenantId: string, id: string) {
    const found = await tx.patient.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!found) throw new NotFoundException('Paciente não encontrado.');
  }
}
