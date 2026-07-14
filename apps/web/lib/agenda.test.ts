import { describe, expect, it } from 'vitest';
import {
  addDays,
  dayKey,
  hhmmToMinutes,
  minutesToHHMM,
  startOfWeek,
  toDatetimeLocal,
} from './agenda';

describe('startOfWeek', () => {
  it('retorna a segunda-feira da semana', () => {
    // 2026-07-14 é uma terça
    expect(dayKey(startOfWeek(new Date(2026, 6, 14)))).toBe('2026-07-13');
  });

  it('segunda-feira permanece nela mesma', () => {
    expect(dayKey(startOfWeek(new Date(2026, 6, 13)))).toBe('2026-07-13');
  });

  it('domingo pertence à semana iniciada na segunda anterior', () => {
    expect(dayKey(startOfWeek(new Date(2026, 6, 19)))).toBe('2026-07-13');
  });
});

describe('addDays / dayKey', () => {
  it('atravessa fim de mês', () => {
    expect(dayKey(addDays(new Date(2026, 6, 30), 3))).toBe('2026-08-02');
  });
});

describe('minutos ↔ HH:MM', () => {
  it('converte ida e volta', () => {
    expect(minutesToHHMM(540)).toBe('09:00');
    expect(minutesToHHMM(725)).toBe('12:05');
    expect(hhmmToMinutes('09:00')).toBe(540);
    expect(hhmmToMinutes('23:59')).toBe(1439);
  });

  it('entrada inválida vira NaN', () => {
    expect(hhmmToMinutes('')).toBeNaN();
    expect(hhmmToMinutes('abc')).toBeNaN();
  });
});

describe('toDatetimeLocal', () => {
  it('formata no fuso local com minutos preservados', () => {
    const iso = new Date(2026, 6, 20, 9, 30).toISOString();
    expect(toDatetimeLocal(iso)).toBe('2026-07-20T09:30');
  });
});
