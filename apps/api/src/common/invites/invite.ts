import { ConflictException } from '@nestjs/common';
import { getAuth } from 'firebase-admin/auth';
import type { UserRole } from '@consultorio/db';
import type { PrismaService } from '../../modules/prisma/prisma.service';

/**
 * Parte comum dos convites de profissional e de paciente: garantir a conta no
 * Firebase e criar o `User` do consultório vinculado a ela. O que muda entre os
 * dois — as checagens de "já convidado", o texto do email e a rota de entrada —
 * fica em cada service.
 */

/** URL onde o convidado entra no web. Usa a primeira origem de WEB_ORIGIN. */
export function inviteLoginUrl(path: string): string {
  const origin = process.env.WEB_ORIGIN?.split(',')[0]?.trim() || 'http://localhost:3000';
  return `${origin}${path}`;
}

export interface InviteRequest {
  tenantId: string;
  email: string;
  role: UserRole;
  /** Vínculo do User criado: `{ professionalId }` ou `{ patientId }`. */
  link: { professionalId: string } | { patientId: string };
}

/**
 * Reaproveita a conta do Firebase se já existir para o email, senão cria uma;
 * então grava o `User` do consultório. Devolve o nome do consultório, usado no
 * email de convite.
 *
 * A chamada ao Firebase fica fora da transação de propósito: I/O de rede não
 * deve segurar uma transação Postgres aberta.
 */
export async function grantTenantAccess(
  prisma: PrismaService,
  { tenantId, email, role, link }: InviteRequest,
): Promise<string> {
  const auth = getAuth();
  let firebaseUid: string;
  try {
    firebaseUid = (await auth.getUserByEmail(email)).uid;
  } catch {
    firebaseUid = (await auth.createUser({ email })).uid;
  }

  return prisma.withTenant(tenantId, async (tx) => {
    try {
      await tx.user.create({ data: { firebaseUid, email, tenantId, role, ...link } });
    } catch {
      throw new ConflictException('Este email já está associado a outra conta no sistema.');
    }
    const tenant = await tx.tenant.findUniqueOrThrow({ where: { id: tenantId } });
    return tenant.name;
  });
}
