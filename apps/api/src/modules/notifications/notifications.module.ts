import { Global, Logger, Module } from '@nestjs/common';
import {
  EMAIL_PROVIDER,
  NoopEmailProvider,
  ResendEmailProvider,
  type EmailProvider,
} from './email.provider';
import { NotificationsService } from './notifications.service';

const DEFAULT_FROM = 'Consultório <onboarding@resend.dev>';

@Global()
@Module({
  providers: [
    {
      provide: EMAIL_PROVIDER,
      useFactory: (): EmailProvider => {
        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) {
          new Logger('NotificationsModule').warn(
            'RESEND_API_KEY ausente — emails serão apenas logados (NoopEmailProvider).',
          );
          return new NoopEmailProvider();
        }
        return new ResendEmailProvider(apiKey, process.env.EMAIL_FROM ?? DEFAULT_FROM);
      },
    },
    NotificationsService,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
