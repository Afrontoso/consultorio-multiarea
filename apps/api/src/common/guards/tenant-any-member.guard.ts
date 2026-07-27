import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { PrismaService } from '../../modules/prisma/prisma.service';
import { resolveMember, type MemberRequest } from './tenant-member.guard';

/**
 * Mesma resolução de membro do TenantMemberGuard, mas sem filtro de papel
 * (OWNER, STAFF, PROFESSIONAL, PATIENT). Usado nas rotas escopadas a "meus
 * próprios dados" (ex.: /me/appointments), onde o próprio handler restringe o
 * acesso pelo professionalId/patientId do membro.
 */
@Injectable()
export class TenantAnyMemberGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<MemberRequest>();
    await resolveMember(this.prisma, req, 'TenantAnyMemberGuard');
    return true;
  }
}
