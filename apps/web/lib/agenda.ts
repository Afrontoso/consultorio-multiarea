// Helpers de data/hora da agenda do painel. Tudo em horário local do browser —
// o dono do consultório opera no mesmo fuso do consultório.

export const WEEKDAY_SHORT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
export const WEEKDAY_LONG = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

/** Meia-noite local do dia de `d`. */
export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Segunda-feira 00:00 local da semana de `d`. */
export function startOfWeek(d: Date): Date {
  const day = startOfDay(d);
  const shift = (day.getDay() + 6) % 7; // 0=segunda … 6=domingo
  return addDays(day, -shift);
}

export function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

/** Chave YYYY-MM-DD do dia local. */
export function dayKey(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** Minutos desde 00:00 → "HH:MM". */
export function minutesToHHMM(minutes: number): string {
  const h = String(Math.floor(minutes / 60)).padStart(2, '0');
  const m = String(minutes % 60).padStart(2, '0');
  return `${h}:${m}`;
}

/** "HH:MM" → minutos desde 00:00. NaN para entrada inválida. */
export function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  if (h === undefined || m === undefined || Number.isNaN(h) || Number.isNaN(m)) return NaN;
  return h * 60 + m;
}

/** ISO UTC → valor de <input type="datetime-local"> no fuso local. */
export function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}T${h}:${min}`;
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function formatDayLong(d: Date): string {
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
}
