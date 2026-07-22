import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../modules/prisma/prisma.service';
import type { MemberRequest } from './tenant-member.guard';

/**
 * Resolves the DB user for the authenticated firebaseUid and attaches it to the
 * request, same as TenantMemberGuard, but lets any role through (OWNER, STAFF,
 * PROFESSIONAL). Used by routes scoped to "my own data" (e.g. /me/appointments),
 * where the handler itself restricts access by professionalId.
 */
@Injectable()
export class TenantAnyMemberGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<MemberRequest>();
    if (!req.user) {
      throw new ForbiddenException('TenantAnyMemberGuard requires FirebaseAuthGuard');
    }
    const user = await this.prisma.user.findUnique({
      where: { firebaseUid: req.user.uid },
    });
    if (!user) {
      throw new ForbiddenException('Usuário não pertence a nenhum consultório.');
    }
    req.member = {
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role,
      email: user.email,
      professionalId: user.professionalId,
    };
    return true;
  }
}
