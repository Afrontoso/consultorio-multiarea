import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { UserRole } from '@consultorio/db';
import { PrismaService } from '../../modules/prisma/prisma.service';
import type { AuthedRequest } from './firebase-auth.guard';

export interface TenantMember {
  userId: string;
  tenantId: string;
  role: UserRole;
  email: string;
  professionalId: string | null;
  patientId: string | null;
}

export interface MemberRequest extends AuthedRequest {
  member?: TenantMember;
}

const ADMIN_ROLES: UserRole[] = ['OWNER', 'STAFF'];

/**
 * Resolve o usuário do banco a partir do firebaseUid autenticado e o anexa ao
 * request como `member`. Compartilhado pelos guards de tenant — o lookup é por
 * firebaseUid, que é global por natureza, daí o `withGlobalScope`.
 * Exige o FirebaseAuthGuard antes.
 */
export async function resolveMember(
  prisma: PrismaService,
  req: MemberRequest,
  guardName: string,
): Promise<TenantMember> {
  if (!req.user) {
    throw new ForbiddenException(`${guardName} requires FirebaseAuthGuard`);
  }
  const uid = req.user.uid;
  const user = await prisma.withGlobalScope((tx) =>
    tx.user.findUnique({ where: { firebaseUid: uid } }),
  );
  if (!user) {
    throw new ForbiddenException('Usuário não pertence a nenhum consultório.');
  }
  const member: TenantMember = {
    userId: user.id,
    tenantId: user.tenantId,
    role: user.role,
    email: user.email,
    professionalId: user.professionalId,
    patientId: user.patientId,
  };
  req.member = member;
  return member;
}

/**
 * Guard das rotas de administração do consultório: além de resolver o membro,
 * só deixa passar OWNER/STAFF.
 */
@Injectable()
export class TenantMemberGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<MemberRequest>();
    const member = await resolveMember(this.prisma, req, 'TenantMemberGuard');
    if (!ADMIN_ROLES.includes(member.role)) {
      throw new ForbiddenException('Apenas administradores podem acessar este recurso.');
    }
    return true;
  }
}
