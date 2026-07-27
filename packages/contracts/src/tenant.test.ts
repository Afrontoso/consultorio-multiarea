import { describe, expect, it } from 'vitest';
import { CreateTenantSchema, HealthCategorySchema } from './tenant';

describe('HealthCategorySchema', () => {
  it('accepts every declared category', () => {
    const values = [
      'PSICOLOGIA',
      'FISIOTERAPIA',
      'NUTRICAO',
      'ODONTO',
      'ESTETICA',
      'TERAPIAS',
      'PERSONAL',
      'OUTROS',
    ];
    for (const v of values) expect(HealthCategorySchema.parse(v)).toBe(v);
  });

  it('rejects unknown category', () => {
    expect(() => HealthCategorySchema.parse('PSICO')).toThrow();
  });
});

describe('CreateTenantSchema', () => {
  const valid = {
    slug: 'ana-psi',
    name: 'Consultório da Ana',
    category: 'PSICOLOGIA',
  };

  it('accepts a well-formed payload', () => {
    const parsed = CreateTenantSchema.parse(valid);
    expect(parsed.slug).toBe('ana-psi');
  });

  it.each([
    ['uppercase letters', { ...valid, slug: 'Ana-Psi' }],
    ['spaces', { ...valid, slug: 'ana psi' }],
    ['special characters', { ...valid, slug: 'ana_psi' }],
    ['too short', { ...valid, slug: 'ab' }],
    ['too long', { ...valid, slug: 'a'.repeat(41) }],
  ])('rejects slug with %s', (_label, payload) => {
    expect(() => CreateTenantSchema.parse(payload)).toThrow();
  });

  it('rejects short name', () => {
    expect(() => CreateTenantSchema.parse({ ...valid, name: 'A' })).toThrow();
  });

  it('ignora dono informado no corpo (a API usa o email do token)', () => {
    const parsed = CreateTenantSchema.parse({ ...valid, ownerEmail: 'atacante@example.com' });
    expect(parsed).not.toHaveProperty('ownerEmail');
  });

  it('rejects unknown category', () => {
    expect(() => CreateTenantSchema.parse({ ...valid, category: 'MAGIA' })).toThrow();
  });
});
