import { describe, expect, it } from 'vitest';
import { CreatePatientSchema } from './patient';

const valid = { name: 'João', phone: '+5511999990000' };

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
});
