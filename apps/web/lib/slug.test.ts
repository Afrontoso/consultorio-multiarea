import { describe, expect, it } from 'vitest';
import { slugify } from './slug';

describe('slugify', () => {
  it('lowercases input', () => {
    expect(slugify('HELLO')).toBe('hello');
  });

  it('strips Portuguese accents', () => {
    expect(slugify('Consultório da Ana')).toBe('consultorio-da-ana');
    expect(slugify('nutrição')).toBe('nutricao');
    expect(slugify('ação')).toBe('acao');
  });

  it('replaces whitespace and punctuation with a single hyphen', () => {
    expect(slugify('Ana  Paula!!  PSI')).toBe('ana-paula-psi');
  });

  it('trims leading and trailing hyphens', () => {
    expect(slugify('---abc---')).toBe('abc');
  });

  it('drops characters outside a-z0-9', () => {
    expect(slugify('você@teste#2026')).toBe('voce-teste-2026');
  });

  it('returns empty string for input with no alphanumerics', () => {
    expect(slugify('***')).toBe('');
    expect(slugify('   ')).toBe('');
  });

  it('caps length at 40 characters', () => {
    const long = 'a'.repeat(100);
    expect(slugify(long).length).toBe(40);
  });
});
