import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { MemberRequest, TenantMember } from '../guards/tenant-member.guard';

export const CurrentMember = createParamDecorator(
  (_data, ctx: ExecutionContext): TenantMember => {
    const req = ctx.switchToHttp().getRequest<MemberRequest>();
    if (!req.member) {
      throw new Error('CurrentMember decorator used on route without TenantMemberGuard');
    }
    return req.member;
  },
);
