import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Request } from 'express';
import { Observable } from 'rxjs';

/**
 * Placeholder interceptor. Once Prisma is wired, this resolves the tenant from the
 * X-Tenant-Slug header (or falls back to the authed firebaseUid lookup) and sets
 * `SET LOCAL app.tenant_id` inside a Prisma transaction so RLS policies apply.
 */
@Injectable()
export class TenantScopeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    void req.headers['x-tenant-slug'];
    return next.handle();
  }
}
