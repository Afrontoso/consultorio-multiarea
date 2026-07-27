import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { PrismaService } from '../../modules/prisma/prisma.service';
import { TenantContext } from '../tenant-context';
import type { MemberRequest } from '../guards/tenant-member.guard';

/**
 * Popula o TenantContext (AsyncLocalStorage) do request autenticado:
 * usa o membro resolvido pelo TenantMemberGuard ou, na falta dele, faz
 * lookup por firebaseUid. Rotas públicas seguem sem contexto — o service
 * resolve o tenant pelo slug e abre `withTenant` explicitamente.
 */
@Injectable()
export class TenantScopeInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const req = context.switchToHttp().getRequest<MemberRequest>();

    let tenantId = req.member?.tenantId;
    if (!tenantId && req.user) {
      const uid = req.user.uid;
      const user = await this.prisma.withGlobalScope((tx) =>
        tx.user.findUnique({ where: { firebaseUid: uid }, select: { tenantId: true } }),
      );
      tenantId = user?.tenantId;
    }
    if (!tenantId) return next.handle();

    const scoped = tenantId;
    return new Observable((subscriber) => {
      const subscription = TenantContext.run(scoped, () =>
        next.handle().subscribe(subscriber),
      );
      return () => subscription.unsubscribe();
    });
  }
}
