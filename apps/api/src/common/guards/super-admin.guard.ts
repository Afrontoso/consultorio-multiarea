import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthedRequest } from './firebase-auth.guard';

/** Emails com acesso à plataforma, do env (minúsculos). Vazio = ninguém. */
export function superAdminEmails(): Set<string> {
  return new Set(
    (process.env.SUPER_ADMIN_EMAILS ?? '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

/**
 * Libera apenas emails na allowlist SUPER_ADMIN_EMAILS. Usar sempre depois do
 * FirebaseAuthGuard (que popula req.user.email). Sem allowlist configurada,
 * nega todo mundo (fail-safe).
 */
@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const email = req.user?.email?.toLowerCase();
    if (!email || !superAdminEmails().has(email)) {
      throw new ForbiddenException('Acesso restrito à plataforma.');
    }
    return true;
  }
}
