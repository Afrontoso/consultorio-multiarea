import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth';

export interface AuthedRequest extends Request {
  user?: {
    uid: string;
    email?: string;
  };
}

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }
    const token = header.slice('Bearer '.length);
    let decoded: DecodedIdToken;
    try {
      decoded = await getAuth().verifyIdToken(token);
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
    // Só o email verificado prova posse da caixa postal. Sem esta checagem,
    // qualquer um cria conta por email/senha com o endereço de outra pessoa e
    // herda o que estiver amarrado àquele email — o acesso da allowlist de
    // super-admin, um convite de profissional ou de paciente ainda não
    // resgatado. Google e link mágico já chegam aqui verificados.
    if (decoded.email && decoded.email_verified !== true) {
      throw new UnauthorizedException(
        'Confirme seu email para continuar: abra o link de verificação que enviamos.',
      );
    }
    req.user = { uid: decoded.uid, email: decoded.email };
    return true;
  }
}
