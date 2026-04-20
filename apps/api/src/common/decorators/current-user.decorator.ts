import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AuthedRequest } from '../guards/firebase-auth.guard';

export interface CurrentUserPayload {
  uid: string;
  email?: string;
}

export const CurrentUser = createParamDecorator(
  (_data, ctx: ExecutionContext): CurrentUserPayload => {
    const req = ctx.switchToHttp().getRequest<AuthedRequest>();
    if (!req.user) {
      throw new Error('CurrentUser decorator used on route without FirebaseAuthGuard');
    }
    return req.user;
  },
);
