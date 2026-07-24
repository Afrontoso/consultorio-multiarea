import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { SuperAdminGuard, superAdminEmails } from './super-admin.guard';

function mockContext(user?: { uid: string; email?: string }): ExecutionContext {
  const req = { user };
  return { switchToHttp: () => ({ getRequest: () => req }) } as unknown as ExecutionContext;
}

describe('SuperAdminGuard', () => {
  const guard = new SuperAdminGuard();
  const original = process.env.SUPER_ADMIN_EMAILS;

  afterEach(() => {
    process.env.SUPER_ADMIN_EMAILS = original;
  });

  it('libera email na allowlist (case-insensitive)', () => {
    process.env.SUPER_ADMIN_EMAILS = 'admin@x.co, boss@y.co';
    expect(guard.canActivate(mockContext({ uid: 'u', email: 'Admin@X.co' }))).toBe(true);
  });

  it('nega email fora da allowlist', () => {
    process.env.SUPER_ADMIN_EMAILS = 'admin@x.co';
    expect(() => guard.canActivate(mockContext({ uid: 'u', email: 'outro@x.co' }))).toThrow(
      ForbiddenException,
    );
  });

  it('nega quando não há email no token', () => {
    process.env.SUPER_ADMIN_EMAILS = 'admin@x.co';
    expect(() => guard.canActivate(mockContext({ uid: 'u' }))).toThrow(ForbiddenException);
  });

  it('nega todos quando a allowlist está vazia (fail-safe)', () => {
    process.env.SUPER_ADMIN_EMAILS = '';
    expect(() => guard.canActivate(mockContext({ uid: 'u', email: 'admin@x.co' }))).toThrow(
      ForbiddenException,
    );
  });

  it('superAdminEmails faz parse, normaliza e ignora vazios', () => {
    process.env.SUPER_ADMIN_EMAILS = ' A@x.co ,, b@Y.co ';
    expect([...superAdminEmails()]).toEqual(['a@x.co', 'b@y.co']);
  });
});
