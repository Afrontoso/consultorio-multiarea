import { describe, expect, it } from 'vitest';
import {
  addDays,
  addMonths,
  dayKey,
  hhmmToMinutes,
  minutesToHHMM,
  monthGridRange,
  startOfMonth,
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

describe('startOfMonth / addMonths', () => {
  it('retorna o dia 1 e navega entre meses', () => {
    expect(dayKey(startOfMonth(new Date(2026, 6, 19)))).toBe('2026-07-01');
    expect(dayKey(addMonths(new Date(2026, 6, 19), 1))).toBe('2026-08-01');
    expect(dayKey(addMonths(new Date(2026, 0, 31), -1))).toBe('2025-12-01');
  });
});

describe('monthGridRange', () => {
  it('cobre o mês inteiro em semanas completas (segunda a domingo)', () => {
    // Julho/2026: dia 1 é quarta; dia 31 é sexta.
    const { start, end } = monthGridRange(new Date(2026, 6, 19));
    expect(dayKey(start)).toBe('2026-06-29');
    expect(dayKey(end)).toBe('2026-08-03');
    const days = (end.getTime() - start.getTime()) / 86_400_000;
    expect(days % 7).toBe(0);
  });

  it('mês que começa na segunda não ganha semana extra', () => {
    // Junho/2026 começa numa segunda-feira.
    const { start, end } = monthGridRange(new Date(2026, 5, 10));
    expect(dayKey(start)).toBe('2026-06-01');
    expect(dayKey(end)).toBe('2026-07-06');
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
