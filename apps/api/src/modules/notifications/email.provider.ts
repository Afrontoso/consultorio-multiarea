import { Logger } from '@nestjs/common';

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
}

/**
 * Contrato de envio de notificação. WhatsApp (Z-API) entra depois pelo
 * mesmo padrão de adapter.
 */
export interface EmailProvider {
  send(message: EmailMessage): Promise<void>;
}

export const EMAIL_PROVIDER = Symbol('EMAIL_PROVIDER');

/** Sem RESEND_API_KEY (dev): só loga o que seria enviado. */
export class NoopEmailProvider implements EmailProvider {
  private readonly logger = new Logger('NoopEmailProvider');

  async send(message: EmailMessage): Promise<void> {
    this.logger.log(`[email não enviado — sem RESEND_API_KEY] to=${message.to} subject="${message.subject}"`);
  }
}

/** Envio real via API HTTP do Resend (sem SDK). */
export class ResendEmailProvider implements EmailProvider {
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {}

  async send(message: EmailMessage): Promise<void> {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.from,
        to: [message.to],
        subject: message.subject,
        html: message.html,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Resend respondeu ${res.status}: ${body}`);
    }
  }
}
