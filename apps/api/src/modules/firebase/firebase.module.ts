import { Global, Logger, Module, type OnModuleInit } from '@nestjs/common';
import { cert, getApps, initializeApp } from 'firebase-admin/app';

@Global()
@Module({})
export class FirebaseModule implements OnModuleInit {
  private readonly logger = new Logger(FirebaseModule.name);

  onModuleInit(): void {
    if (getApps().length > 0) return;

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
      this.logger.warn(
        'Firebase admin not initialized — FIREBASE_{PROJECT_ID,CLIENT_EMAIL,PRIVATE_KEY} missing. Auth-protected routes will reject every request.',
      );
      return;
    }

    initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
    this.logger.log(`Firebase admin initialized for project ${projectId}`);
  }
}
