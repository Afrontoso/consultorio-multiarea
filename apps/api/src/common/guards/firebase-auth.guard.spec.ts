import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';

const verifyIdToken = jest.fn();
jest.mock('firebase-admin/auth', () => ({
  getAuth: () => ({ verifyIdToken }),
}));

import { FirebaseAuthGuard } from './firebase-auth.guard';

function mockContext(headers: Record<string, string | undefined>): {
  ctx: ExecutionContext;
  req: { headers: Record<string, string | undefined>; user?: { uid: string; email?: string } };
} {
  const req: { headers: Record<string, string | undefined>; user?: { uid: string; email?: string } } = { headers };
  const ctx = {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
  return { ctx, req };
}

describe('FirebaseAuthGuard', () => {
  let guard: FirebaseAuthGuard;

  beforeEach(() => {
    guard = new FirebaseAuthGuard();
    verifyIdToken.mockReset();
  });

  it('rejects requests without Authorization header', async () => {
    const { ctx } = mockContext({});
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects Authorization headers that do not start with "Bearer "', async () => {
    const { ctx } = mockContext({ authorization: 'Basic abc' });
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects tokens that fail verification', async () => {
    verifyIdToken.mockRejectedValueOnce(new Error('expired'));
    const { ctx } = mockContext({ authorization: 'Bearer bad-token' });
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('attaches decoded uid/email to the request on success', async () => {
    verifyIdToken.mockResolvedValueOnce({ uid: 'u-1', email: 'a@b.co' });
    const { ctx, req } = mockContext({ authorization: 'Bearer good-token' });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(req.user).toEqual({ uid: 'u-1', email: 'a@b.co' });
    expect(verifyIdToken).toHaveBeenCalledWith('good-token');
  });
});
