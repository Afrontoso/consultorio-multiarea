import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export const TenantSlug = createParamDecorator((_data, ctx: ExecutionContext): string | null => {
  const req = ctx.switchToHttp().getRequest<Request>();
  const header = req.headers['x-tenant-slug'];
  if (Array.isArray(header)) return header[0] ?? null;
  return header ?? null;
});
