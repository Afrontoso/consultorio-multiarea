import { describe, expect, it } from 'vitest';
import { formatPhoneBR, phoneDigits } from './phone';

describe('phoneDigits', () => {
  it('remove máscara e limita a 11 dígitos', () => {
    expect(phoneDigits('(11) 99999-0000')).toBe('11999990000');
    expect(phoneDigits('11 99999 0000 99')).toBe('11999990000');
    expect(phoneDigits('abc')).toBe('');
  });
});

describe('formatPhoneBR', () => {
  it('formata celular (11 dígitos) e fixo (10 dígitos)', () => {
    expect(formatPhoneBR('11999990000')).toBe('(11) 99999-0000');
    expect(formatPhoneBR('1133334444')).toBe('(11) 3333-4444');
  });

  it('formata progressivamente enquanto digita', () => {
    expect(formatPhoneBR('')).toBe('');
    expect(formatPhoneBR('1')).toBe('(1');
    expect(formatPhoneBR('11')).toBe('(11');
    expect(formatPhoneBR('119')).toBe('(11) 9');
    expect(formatPhoneBR('119999')).toBe('(11) 9999');
    // o hífen ancora nos últimos 4 dígitos
    expect(formatPhoneBR('1199999')).toBe('(11) 9-9999');
    expect(formatPhoneBR('1199999000')).toBe('(11) 9999-9000');
  });

  it('ida e volta preserva os dígitos', () => {
    expect(phoneDigits(formatPhoneBR('11999990000'))).toBe('11999990000');
  });
});
