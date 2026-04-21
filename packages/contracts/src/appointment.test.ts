import { describe, expect, it } from 'vitest';
import { AppointmentStatusSchema, CreateAppointmentSchema } from './appointment';

const cuid = 'c' + 'x'.repeat(24);

const valid = {
  date: '2026-05-01T14:00:00Z',
  professionalId: cuid,
  patientId: cuid,
  serviceId: cuid,
};

describe('AppointmentStatusSchema', () => {
  it.each(['CONFIRMED', 'PENDING', 'CANCELED', 'COMPLETED', 'NO_SHOW'])(
    'accepts %s',
    (v) => {
      expect(AppointmentStatusSchema.parse(v)).toBe(v);
    },
  );

  it('rejects unknown status', () => {
    expect(() => AppointmentStatusSchema.parse('DONE')).toThrow();
  });
});

describe('CreateAppointmentSchema', () => {
  it('accepts valid payload and coerces date', () => {
    const parsed = CreateAppointmentSchema.parse(valid);
    expect(parsed.date).toBeInstanceOf(Date);
  });

  it('rejects non-cuid ids', () => {
    expect(() =>
      CreateAppointmentSchema.parse({ ...valid, professionalId: 'abc' }),
    ).toThrow();
  });

  it('accepts recurrence enum values', () => {
    for (const r of ['WEEKLY', 'BIWEEKLY', 'MONTHLY']) {
      expect(CreateAppointmentSchema.parse({ ...valid, recurrence: r }).recurrence).toBe(r);
    }
  });

  it('rejects bad recurrence', () => {
    expect(() =>
      CreateAppointmentSchema.parse({ ...valid, recurrence: 'DAILY' }),
    ).toThrow();
  });
});
