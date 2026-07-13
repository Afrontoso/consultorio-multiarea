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
}

export interface MemberRequest extends AuthedRequest {
  member?: TenantMember;
}

const ADMIN_ROLES: UserRole[] = ['OWNER', 'STAFF'];

/**
 * Resolves the DB user for the authenticated firebaseUid and attaches it to the
 * request. Must run after FirebaseAuthGuard. Only OWNER/STAFF pass — this guard
 * protects tenant-admin routes.
 */
@Injectable()
export class TenantMemberGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<MemberRequest>();
    if (!req.user) {
      throw new ForbiddenException('TenantMemberGuard requires FirebaseAuthGuard');
    }
    const user = await this.prisma.user.findUnique({
      where: { firebaseUid: req.user.uid },
    });
    if (!user) {
      throw new ForbiddenException('Usuário não pertence a nenhum consultório.');
    }
    if (!ADMIN_ROLES.includes(user.role)) {
      throw new ForbiddenException('Apenas administradores podem acessar este recurso.');
    }
    req.member = {
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role,
      email: user.email,
    };
    return true;
  }
}
