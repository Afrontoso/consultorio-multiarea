import {
  NotificationsService,
  formatDateTimePtBr,
  type AppointmentEmailContext,
} from './notifications.service';
import type { EmailMessage } from './email.provider';

const ctx: AppointmentEmailContext = {
  tenantName: 'Clínica Teste',
  serviceName: 'Sessão',
  durationMinutes: 50,
  professionalName: 'Ana',
  professionalEmail: 'ana@example.com',
  patientName: 'Maria',
  patientEmail: 'maria@example.com',
  date: new Date('2026-07-23T17:00:00Z'),
  utcOffsetMinutes: -180,
};

function flush() {
  return new Promise((resolve) => setImmediate(resolve));
}

describe('formatDateTimePtBr', () => {
  it('formata no fuso do consultório (UTC-3)', () => {
    expect(formatDateTimePtBr(new Date('2026-07-23T17:00:00Z'), -180)).toBe(
      'quinta-feira, 23/07/2026 às 14:00',
    );
  });
});

describe('NotificationsService', () => {
  let sent: EmailMessage[];
  let service: NotificationsService;

  beforeEach(() => {
    sent = [];
    service = new NotificationsService({
      send: async (m: EmailMessage) => {
        sent.push(m);
      },
    });
  });

  it('confirmação envia para paciente e profissional', async () => {
    service.appointmentConfirmed(ctx);
    await flush();

    expect(sent.map((m) => m.to).sort()).toEqual(['ana@example.com', 'maria@example.com']);
    const toPatient = sent.find((m) => m.to === 'maria@example.com')!;
    expect(toPatient.subject).toContain('Clínica Teste');
    expect(toPatient.html).toContain('Sessão');
    expect(toPatient.html).toContain('quinta-feira, 23/07/2026 às 14:00');
  });

  it('sem email do paciente, confirma só para o profissional', async () => {
    service.appointmentConfirmed({ ...ctx, patientEmail: null });
    await flush();

    expect(sent.map((m) => m.to)).toEqual(['ana@example.com']);
  });

  it('cancelamento envia só para o paciente', async () => {
    service.appointmentCanceled(ctx);
    await flush();

    expect(sent.map((m) => m.to)).toEqual(['maria@example.com']);
    expect(sent[0]!.subject).toContain('cancelada');
  });

  it('falha do provider não propaga (fire-and-forget)', async () => {
    const failing = new NotificationsService({
      send: async () => {
        throw new Error('boom');
      },
    });
    expect(() => failing.appointmentConfirmed(ctx)).not.toThrow();
    await flush();
  });
});
