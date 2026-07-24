import { describe, expect, it } from 'vitest';
import { ageAt, isMinor } from './age';

describe('ageAt / isMinor', () => {
  const at = new Date('2026-07-22T12:00:00Z');

  it('completa 18 exatamente na data de referência → maior', () => {
    const birth = new Date('2008-07-22T00:00:00Z');
    expect(ageAt(birth, at)).toBe(18);
    expect(isMinor(birth, at)).toBe(false);
  });

  it('faz 18 no dia seguinte → ainda menor', () => {
    const birth = new Date('2008-07-23T00:00:00Z');
    expect(ageAt(birth, at)).toBe(17);
    expect(isMinor(birth, at)).toBe(true);
  });

  it('fez 18 no dia anterior → maior', () => {
    const birth = new Date('2008-07-21T00:00:00Z');
    expect(ageAt(birth, at)).toBe(18);
    expect(isMinor(birth, at)).toBe(false);
  });

  it('aniversário ainda não chegou no ano (mês posterior) → conta um a menos', () => {
    const birth = new Date('2008-12-01T00:00:00Z');
    expect(ageAt(birth, at)).toBe(17);
    expect(isMinor(birth, at)).toBe(true);
  });

  it('aniversário já passou no ano (mês anterior) → maior', () => {
    const birth = new Date('2008-01-10T00:00:00Z');
    expect(ageAt(birth, at)).toBe(18);
    expect(isMinor(birth, at)).toBe(false);
  });

  it('criança pequena → menor', () => {
    expect(isMinor(new Date('2020-05-10T00:00:00Z'), at)).toBe(true);
  });
});
