import { describe, expect, it } from 'vitest';
import {
  AppointmentStatusSchema,
  CreateAppointmentSchema,
  PublicCreateAppointmentSchema,
} from './appointment';

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

describe('PublicCreateAppointmentSchema', () => {
  const minorBirthDate = new Date(Date.now() - 10 * 365 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const publicValid = {
    date: '2026-05-01T14:00:00Z',
    professionalId: cuid,
    serviceId: cuid,
    patient: { name: 'Maria da Silva', phone: '11999990000', birthDate: '1990-05-12' },
    consent: true,
  };

  it('accepts payload with consent', () => {
    expect(PublicCreateAppointmentSchema.parse(publicValid).consent).toBe(true);
  });

  it('rejects when consent is missing', () => {
    const { consent: _omit, ...withoutConsent } = publicValid;
    expect(() => PublicCreateAppointmentSchema.parse(withoutConsent)).toThrow();
  });

  it('rejects when consent is false', () => {
    expect(() =>
      PublicCreateAppointmentSchema.parse({ ...publicValid, consent: false }),
    ).toThrow();
  });

  it('rejects when patient birthDate is missing', () => {
    const { birthDate: _omit, ...patientNoBirth } = publicValid.patient;
    expect(() =>
      PublicCreateAppointmentSchema.parse({ ...publicValid, patient: patientNoBirth }),
    ).toThrow();
  });

  it('rejects minor patient without guardian', () => {
    expect(() =>
      PublicCreateAppointmentSchema.parse({
        ...publicValid,
        patient: { ...publicValid.patient, birthDate: minorBirthDate },
      }),
    ).toThrow();
  });

  it('accepts minor patient with one guardian', () => {
    const parsed = PublicCreateAppointmentSchema.parse({
      ...publicValid,
      patient: {
        ...publicValid.patient,
        birthDate: minorBirthDate,
        guardians: [{ name: 'Maria Mãe', phone: '11988887777' }],
      },
    });
    expect(parsed.patient.guardians?.[0]?.name).toBe('Maria Mãe');
  });
});
