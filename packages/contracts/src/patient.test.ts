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

  describe('responsável legal (menor)', () => {
    it('menor sem responsável → rejeita', () => {
      expect(() => CreatePatientSchema.parse({ ...valid, birthDate: minorBirthDate })).toThrow();
    });

    it('menor sem telefone do responsável → rejeita', () => {
      expect(() =>
        CreatePatientSchema.parse({
          ...valid,
          birthDate: minorBirthDate,
          guardianName: 'Maria Mãe',
        }),
      ).toThrow();
    });

    it('menor com nome + telefone do responsável → aceita', () => {
      const parsed = CreatePatientSchema.parse({
        ...valid,
        birthDate: minorBirthDate,
        guardianName: 'Maria Mãe',
        guardianPhone: '11988887777',
      });
      expect(parsed.guardianName).toBe('Maria Mãe');
      expect(parsed.guardianPhone).toBe('11988887777');
    });

    it('adulto não precisa de responsável', () => {
      expect(() => CreatePatientSchema.parse(valid)).not.toThrow();
    });
  });
});
