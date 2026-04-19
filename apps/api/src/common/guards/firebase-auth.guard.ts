import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { getAuth } from 'firebase-admin/auth';

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
    try {
      const decoded = await getAuth().verifyIdToken(token);
      req.user = { uid: decoded.uid, email: decoded.email };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
