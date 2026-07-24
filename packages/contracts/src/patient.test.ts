import { describe, expect, it } from 'vitest';
import { CreatePatientSchema } from './patient';

// Adulto: birthDate obrigatório, sem responsável.
const valid = { name: 'João', phone: '+5511999990000', birthDate: '1990-05-12' };

// Menor de idade (referência: data corrente). ~10 anos.
const minorBirthDate = new Date(Date.now() - 10 * 365 * 24 * 60 * 60 * 1000)
  .toISOString()
  .slice(0, 10);

describe('CreatePatientSchema', () => {
  it('accepts minimal valid payload', () => {
    const parsed = CreatePatientSchema.parse(valid);
    expect(parsed.name).toBe('João');
  });

  it('normaliza o + fora: telefone canônico é só dígitos', () => {
    expect(CreatePatientSchema.parse(valid).phone).toBe('5511999990000');
  });

  it('normaliza entrada com máscara para só dígitos', () => {
    expect(CreatePatientSchema.parse({ ...valid, phone: '(11) 99999-0000' }).phone).toBe(
      '11999990000',
    );
  });

  it('rejects phone too short (mesmo depois de normalizar)', () => {
    expect(() => CreatePatientSchema.parse({ ...valid, phone: '123' })).toThrow();
    expect(() => CreatePatientSchema.parse({ ...valid, phone: '(11) 9999-000' })).toThrow();
  });

  it('rejects malformed email when present', () => {
    expect(() => CreatePatientSchema.parse({ ...valid, email: 'invalid' })).toThrow();
  });

  it('coerces birthDate from ISO string', () => {
    const parsed = CreatePatientSchema.parse({ ...valid, birthDate: '1990-05-12' });
    expect(parsed.birthDate).toBeInstanceOf(Date);
  });

  it('exige birthDate', () => {
    const { birthDate: _omit, ...withoutBirth } = valid;
    expect(() => CreatePatientSchema.parse(withoutBirth)).toThrow();
  });

  describe('responsáveis legais (menor)', () => {
    it('menor sem responsável → rejeita', () => {
      expect(() => CreatePatientSchema.parse({ ...valid, birthDate: minorBirthDate })).toThrow();
    });

    it('menor com lista de responsáveis vazia → rejeita', () => {
      expect(() =>
        CreatePatientSchema.parse({ ...valid, birthDate: minorBirthDate, guardians: [] }),
      ).toThrow();
    });

    it('responsável sem telefone → rejeita (GuardianSchema)', () => {
      expect(() =>
        CreatePatientSchema.parse({
          ...valid,
          birthDate: minorBirthDate,
          guardians: [{ name: 'Maria Mãe' }],
        }),
      ).toThrow();
    });

    it('menor com um responsável completo → aceita', () => {
      const parsed = CreatePatientSchema.parse({
        ...valid,
        birthDate: minorBirthDate,
        guardians: [{ name: 'Maria Mãe', phone: '11988887777', relationship: 'mãe' }],
      });
      expect(parsed.guardians?.[0]?.name).toBe('Maria Mãe');
      expect(parsed.guardians?.[0]?.phone).toBe('11988887777');
    });

    it('menor com vários responsáveis → aceita', () => {
      const parsed = CreatePatientSchema.parse({
        ...valid,
        birthDate: minorBirthDate,
        guardians: [
          { name: 'Maria Mãe', phone: '11988887777' },
          { name: 'João Pai', phone: '11977776666', relationship: 'pai' },
        ],
      });
      expect(parsed.guardians).toHaveLength(2);
    });

    it('adulto não precisa de responsável', () => {
      expect(() => CreatePatientSchema.parse(valid)).not.toThrow();
    });
  });
});
