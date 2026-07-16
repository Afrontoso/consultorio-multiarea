import { describe, expect, it } from 'vitest';
import {
  centavosToNumber,
  formatBRL,
  formatMoneyBR,
  moneyDigits,
  numberToCentavos,
} from './money';

describe('moneyDigits', () => {
  it('remove máscara, zeros à esquerda e limita ao teto', () => {
    expect(moneyDigits('R$ 1.234,56')).toBe('123456');
    expect(moneyDigits('007')).toBe('7');
    expect(moneyDigits('999999999999')).toBe('9999999');
    expect(moneyDigits('abc')).toBe('');
  });
});

describe('formatMoneyBR', () => {
  it('formata deslocando da direita (estilo app de banco)', () => {
    expect(formatMoneyBR('')).toBe('');
    expect(formatMoneyBR('5')).toBe('0,05');
    expect(formatMoneyBR('180')).toBe('1,80');
    expect(formatMoneyBR('18000')).toBe('180,00');
    expect(formatMoneyBR('1234567')).toBe('12.345,67');
  });
});

describe('conversões', () => {
  it('centavos → number em reais', () => {
    expect(centavosToNumber('18000')).toBe(180);
    expect(centavosToNumber('18050')).toBe(180.5);
    expect(centavosToNumber('')).toBe(0);
  });

  it('number → centavos (edição), ida e volta', () => {
    expect(numberToCentavos(180)).toBe('18000');
    expect(numberToCentavos(180.5)).toBe('18050');
    expect(centavosToNumber(numberToCentavos(99999.99))).toBe(99999.99);
  });
});

describe('formatBRL', () => {
  it('formata para exibição', () => {
    // toLocaleString usa espaço não separável entre R$ e o valor
    expect(formatBRL(180).replace(/\u00a0/g, ' ')).toBe('R$ 180,00');
  });
});
