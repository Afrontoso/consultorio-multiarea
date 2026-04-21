import { describe, expect, it } from 'vitest';
import { CreateProfessionalSchema } from './professional';

const valid = {
  name: 'Dra. Ana',
  email: 'ana@example.com',
  phone: '+5511999990000',
  color: '#3b82f6',
};

describe('CreateProfessionalSchema', () => {
  it('accepts a valid payload and defaults color/serviceIds', () => {
    const parsed = CreateProfessionalSchema.parse({ name: 'Ana', email: 'a@b.co' });
    expect(parsed.color).toBe('#3b82f6');
    expect(parsed.serviceIds).toEqual([]);
  });

  it('rejects bad color', () => {
    expect(() => CreateProfessionalSchema.parse({ ...valid, color: 'red' })).toThrow();
  });

  it('rejects invalid email', () => {
    expect(() => CreateProfessionalSchema.parse({ ...valid, email: 'nope' })).toThrow();
  });

  it('rejects bio over limit', () => {
    const bio = 'x'.repeat(2001);
    expect(() => CreateProfessionalSchema.parse({ ...valid, bio })).toThrow();
  });
});
