import { Inject, Injectable, Logger } from '@nestjs/common';
import { DEFAULT_UTC_OFFSET_MINUTES } from '../availability/slots';
import { EMAIL_PROVIDER, type EmailProvider } from './email.provider';

export interface AppointmentEmailContext {
  tenantName: string;
  serviceName: string;
  durationMinutes: number;
  professionalName: string;
  professionalEmail?: string | null;
  patientName: string;
  patientEmail?: string | null;
  date: Date;
  utcOffsetMinutes?: number;
}

/** "quinta-feira, 23/07/2026 às 14:00" no fuso do consultório. */
export function formatDateTimePtBr(date: Date, utcOffsetMinutes: number): string {
  const local = new Date(date.getTime() + utcOffsetMinutes * 60_000);
  const weekday = local.toLocaleDateString('pt-BR', { weekday: 'long', timeZone: 'UTC' });
  const day = local.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  const hh = String(local.getUTCHours()).padStart(2, '0');
  const mm = String(local.getUTCMinutes()).padStart(2, '0');
  return `${weekday}, ${day} às ${hh}:${mm}`;
}

function layout(title: string, lines: string[]): string {
  return [
    `<div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;color:#1c1917">`,
    `<h1 style="font-size:22px;font-weight:normal">${title}</h1>`,
    ...lines.map((l) => `<p style="font-size:15px;line-height:1.6">${l}</p>`),
    `</div>`,
  ].join('\n');
}

/**
 * Notificações transacionais. Fire-and-forget: falha de email nunca derruba
 * o agendamento — só loga.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(@Inject(EMAIL_PROVIDER) private readonly email: EmailProvider) {}

  /** Confirmação para o paciente + aviso para o profissional. */
  appointmentConfirmed(ctx: AppointmentEmailContext): void {
    const when = formatDateTimePtBr(ctx.date, ctx.utcOffsetMinutes ?? DEFAULT_UTC_OFFSET_MINUTES);

    if (ctx.patientEmail) {
      this.fire({
        to: ctx.patientEmail,
        subject: `Consulta confirmada — ${ctx.tenantName}`,
        html: layout(`Sua consulta está confirmada, ${ctx.patientName}.`, [
          `<strong>${ctx.serviceName}</strong> (${ctx.durationMinutes} min) com <strong>${ctx.professionalName}</strong>.`,
          `<strong>${when}</strong>.`,
          `Em caso de imprevisto, entre em contato com ${ctx.tenantName} para reagendar.`,
        ]),
      });
    }

    if (ctx.professionalEmail) {
      this.fire({
        to: ctx.professionalEmail,
        subject: `Novo agendamento — ${ctx.patientName}`,
        html: layout(`Novo agendamento em ${ctx.tenantName}.`, [
          `<strong>${ctx.patientName}</strong> agendou <strong>${ctx.serviceName}</strong> (${ctx.durationMinutes} min).`,
          `<strong>${when}</strong>.`,
        ]),
      });
    }
  }

  /** Convite para o profissional acessar o painel próprio. */
  professionalInvited(ctx: {
    to: string;
    professionalName: string;
    tenantName: string;
    loginUrl: string;
  }): void {
    this.fire({
      to: ctx.to,
      subject: `Você foi convidado para o painel de ${ctx.tenantName}`,
      html: layout(`Olá, ${ctx.professionalName}.`, [
        `Você agora tem acesso ao painel de ${ctx.tenantName} para ver sua agenda.`,
        `Entre em <a href="${ctx.loginUrl}">${ctx.loginUrl}</a> com o email <strong>${ctx.to}</strong> — use "Link mágico" para entrar sem senha, ou Google se for o mesmo email.`,
      ]),
    });
  }

  /** Convite para o paciente acessar a própria área (ver/reagendar/cancelar consultas). */
  patientInvited(ctx: {
    to: string;
    patientName: string;
    tenantName: string;
    loginUrl: string;
  }): void {
    this.fire({
      to: ctx.to,
      subject: `Você foi convidado para acompanhar suas consultas em ${ctx.tenantName}`,
      html: layout(`Olá, ${ctx.patientName}.`, [
        `Você agora pode ver, reagendar e cancelar suas consultas em ${ctx.tenantName}.`,
        `Entre em <a href="${ctx.loginUrl}">${ctx.loginUrl}</a> com o email <strong>${ctx.to}</strong> — use "Link mágico" para entrar sem senha, ou Google se for o mesmo email.`,
      ]),
    });
  }

  /** Aviso de cancelamento para o paciente. */
  appointmentCanceled(ctx: AppointmentEmailContext): void {
    if (!ctx.patientEmail) return;
    const when = formatDateTimePtBr(ctx.date, ctx.utcOffsetMinutes ?? DEFAULT_UTC_OFFSET_MINUTES);
    this.fire({
      to: ctx.patientEmail,
      subject: `Consulta cancelada — ${ctx.tenantName}`,
      html: layout(`Sua consulta foi cancelada, ${ctx.patientName}.`, [
        `${ctx.serviceName} com ${ctx.professionalName}, que seria ${when}.`,
        `Se preferir outro horário, agende novamente com ${ctx.tenantName}.`,
      ]),
    });
  }

  private fire(message: { to: string; subject: string; html: string }): void {
    void this.email
      .send(message)
      .then(() => {
        this.logger.log(`Email enviado para ${message.to}: "${message.subject}"`);
      })
      .catch((err: unknown) => {
        this.logger.error(`Falha ao enviar email para ${message.to}: ${String(err)}`);
      });
  }
}
