// Cálculo puro de slots disponíveis para um dia. Todas as datas são UTC;
// as faixas de trabalho são minutos no fuso do consultório (utcOffsetMinutes,
// ex.: -180 para America/Sao_Paulo, que não tem mais horário de verão).

export const DEFAULT_UTC_OFFSET_MINUTES = -180;

export interface BusyInterval {
  start: Date;
  end: Date;
}

export interface ComputeSlotsArgs {
  /** Dia no fuso do consultório, formato YYYY-MM-DD. */
  date: string;
  utcOffsetMinutes: number;
  durationMinutes: number;
  /** Faixas de trabalho do profissional no weekday desse dia. */
  ranges: { startMinute: number; endMinute: number }[];
  /** Agendamentos + bloqueios existentes (UTC). */
  busy: BusyInterval[];
  /** Slots que começam antes de `now` são descartados. */
  now?: Date;
}

/** Dia da semana (0=domingo) da data local YYYY-MM-DD. */
export function weekdayOf(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!)).getUTCDay();
}

/** Converte minuto local do dia `date` para instante UTC. */
function localMinuteToUtc(date: string, minute: number, utcOffsetMinutes: number): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!) + (minute - utcOffsetMinutes) * 60_000);
}

function overlaps(aStart: Date, aEnd: Date, b: BusyInterval): boolean {
  return aStart < b.end && aEnd > b.start;
}

/**
 * Slots começam alinhados ao início de cada faixa, avançando de `durationMinutes`
 * em `durationMinutes` (sessões emendadas, padrão de consultório).
 */
export function computeSlots(args: ComputeSlotsArgs): Date[] {
  const { date, utcOffsetMinutes, durationMinutes, ranges, busy, now } = args;
  if (durationMinutes <= 0) return [];

  const slots: Date[] = [];
  for (const range of ranges) {
    for (
      let minute = range.startMinute;
      minute + durationMinutes <= range.endMinute;
      minute += durationMinutes
    ) {
      const start = localMinuteToUtc(date, minute, utcOffsetMinutes);
      const end = new Date(start.getTime() + durationMinutes * 60_000);
      if (now && start < now) continue;
      if (busy.some((b) => overlaps(start, end, b))) continue;
      slots.push(start);
    }
  }
  return slots.sort((a, b) => a.getTime() - b.getTime());
}
