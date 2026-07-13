import { computeSlots, weekdayOf, DEFAULT_UTC_OFFSET_MINUTES } from './slots';

// Helpers: 2026-07-13 é uma segunda-feira.
const MONDAY = '2026-07-13';
const OFFSET = DEFAULT_UTC_OFFSET_MINUTES; // -180 (UTC-3)

function utc(dateTime: string): Date {
  return new Date(dateTime);
}

describe('weekdayOf', () => {
  it('retorna o dia da semana da data local', () => {
    expect(weekdayOf('2026-07-12')).toBe(0); // domingo
    expect(weekdayOf(MONDAY)).toBe(1); // segunda
    expect(weekdayOf('2026-07-18')).toBe(6); // sábado
  });
});

describe('computeSlots', () => {
  it('gera slots emendados dentro da faixa, convertidos para UTC', () => {
    // 09:00–12:00 local (UTC-3) = 12:00–15:00 UTC, sessões de 60min
    const slots = computeSlots({
      date: MONDAY,
      utcOffsetMinutes: OFFSET,
      durationMinutes: 60,
      ranges: [{ startMinute: 9 * 60, endMinute: 12 * 60 }],
      busy: [],
    });
    expect(slots.map((s) => s.toISOString())).toEqual([
      '2026-07-13T12:00:00.000Z',
      '2026-07-13T13:00:00.000Z',
      '2026-07-13T14:00:00.000Z',
    ]);
  });

  it('não gera slot que ultrapassa o fim da faixa', () => {
    // 09:00–10:30 com sessões de 60min → só cabe 09:00
    const slots = computeSlots({
      date: MONDAY,
      utcOffsetMinutes: OFFSET,
      durationMinutes: 60,
      ranges: [{ startMinute: 540, endMinute: 630 }],
      busy: [],
    });
    expect(slots).toHaveLength(1);
    expect(slots[0]!.toISOString()).toBe('2026-07-13T12:00:00.000Z');
  });

  it('remove slots que colidem com agendamentos existentes (sobreposição parcial)', () => {
    // Ocupado 09:30–10:30 local (12:30–13:30 UTC) derruba os slots de 09:00 e 10:00
    const slots = computeSlots({
      date: MONDAY,
      utcOffsetMinutes: OFFSET,
      durationMinutes: 60,
      ranges: [{ startMinute: 540, endMinute: 720 }],
      busy: [{ start: utc('2026-07-13T12:30:00Z'), end: utc('2026-07-13T13:30:00Z') }],
    });
    expect(slots.map((s) => s.toISOString())).toEqual(['2026-07-13T14:00:00.000Z']);
  });

  it('encosta sem conflitar: ocupado terminando exatamente quando o slot começa', () => {
    const slots = computeSlots({
      date: MONDAY,
      utcOffsetMinutes: OFFSET,
      durationMinutes: 60,
      ranges: [{ startMinute: 540, endMinute: 660 }],
      busy: [{ start: utc('2026-07-13T11:00:00Z'), end: utc('2026-07-13T12:00:00Z') }],
    });
    // Ocupado termina 12:00 UTC; slot 12:00–13:00 UTC não conflita
    expect(slots.map((s) => s.toISOString())).toEqual([
      '2026-07-13T12:00:00.000Z',
      '2026-07-13T13:00:00.000Z',
    ]);
  });

  it('descarta slots no passado', () => {
    const slots = computeSlots({
      date: MONDAY,
      utcOffsetMinutes: OFFSET,
      durationMinutes: 60,
      ranges: [{ startMinute: 540, endMinute: 720 }],
      busy: [],
      now: utc('2026-07-13T13:30:00Z'), // 10:30 local
    });
    expect(slots.map((s) => s.toISOString())).toEqual(['2026-07-13T14:00:00.000Z']);
  });

  it('suporta múltiplas faixas no mesmo dia (manhã e tarde)', () => {
    const slots = computeSlots({
      date: MONDAY,
      utcOffsetMinutes: OFFSET,
      durationMinutes: 50,
      ranges: [
        { startMinute: 9 * 60, endMinute: 10 * 60 + 40 }, // 09:00–10:40 → 2 slots de 50
        { startMinute: 14 * 60, endMinute: 14 * 60 + 50 }, // 14:00–14:50 → 1 slot
      ],
      busy: [],
    });
    expect(slots).toHaveLength(3);
  });

  it('faixa cruzando a virada UTC do dia mantém a data local', () => {
    // 22:00–23:00 local (UTC-3) = 01:00–02:00 UTC do dia seguinte
    const slots = computeSlots({
      date: MONDAY,
      utcOffsetMinutes: OFFSET,
      durationMinutes: 60,
      ranges: [{ startMinute: 22 * 60, endMinute: 23 * 60 }],
      busy: [],
    });
    expect(slots.map((s) => s.toISOString())).toEqual(['2026-07-14T01:00:00.000Z']);
  });

  it('retorna vazio sem faixas de trabalho (dia de folga)', () => {
    expect(
      computeSlots({
        date: MONDAY,
        utcOffsetMinutes: OFFSET,
        durationMinutes: 60,
        ranges: [],
        busy: [],
      }),
    ).toEqual([]);
  });
});
