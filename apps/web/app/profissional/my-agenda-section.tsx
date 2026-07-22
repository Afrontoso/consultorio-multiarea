'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '../../lib/api';
import type { AppointmentItem } from '../../lib/painel-types';
import {
  WEEKDAY_SHORT,
  addDays,
  dayKey,
  formatDayLong,
  formatTime,
  startOfDay,
  startOfWeek,
} from '../../lib/agenda';
import { formatPhoneBR } from '../../lib/phone';

type Mode = 'semana' | 'dia';

const MODE_LABEL: Record<Mode, string> = { semana: 'semana', dia: 'dia' };

const STATUS_LABEL: Record<string, string> = {
  CONFIRMED: 'confirmada',
  PENDING: 'pendente',
  CANCELED: 'cancelada',
  COMPLETED: 'concluída',
  NO_SHOW: 'faltou',
};

export function MyAgendaSection() {
  const [mode, setMode] = useState<Mode>('semana');
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));
  const [items, setItems] = useState<AppointmentItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const from = mode === 'semana' ? startOfWeek(anchor) : anchor;
  const to = mode === 'semana' ? addDays(startOfWeek(anchor), 7) : addDays(anchor, 1);

  useEffect(() => {
    let stale = false;
    const params = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() });
    api<AppointmentItem[]>(`/me/appointments?${params}`)
      .then((res) => {
        if (!stale) setItems(res);
      })
      .catch((e) => {
        if (!stale) setError(e instanceof ApiError ? e.message : (e as Error).message);
      });
    return () => {
      stale = true;
    };
    // from/to derivam de mode+anchor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, anchor, reloadKey]);

  const reload = () => setReloadKey((k) => k + 1);
  const dayCount = Math.round((to.getTime() - from.getTime()) / 86_400_000);
  const days = Array.from({ length: dayCount }, (_, i) => addDays(from, i));
  const todayKey = dayKey(new Date());

  function navigate(direction: -1 | 1) {
    setItems(null);
    setAnchor(addDays(anchor, direction * (mode === 'semana' ? 7 : 1)));
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="btn-ghost px-3 py-1.5 text-sm">
            ←
          </button>
          <button
            onClick={() => {
              setItems(null);
              setAnchor(startOfDay(new Date()));
            }}
            className="btn-ghost px-3 py-1.5 text-sm"
          >
            hoje
          </button>
          <button onClick={() => navigate(1)} className="btn-ghost px-3 py-1.5 text-sm">
            →
          </button>
          <span className="ml-3 font-serif italic text-lg">
            {mode === 'semana'
              ? `${from.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} – ${addDays(from, 6).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`
              : formatDayLong(from)}
          </span>
        </div>

        <div className="flex shrink-0 border border-[color:var(--color-rule)] rounded-full overflow-hidden">
          {(['semana', 'dia'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => {
                setItems(null);
                setMode(m);
              }}
              className={`text-sm px-3 py-1.5 transition-colors ${
                mode === m
                  ? 'bg-[color:var(--color-ink)] text-[color:var(--color-paper)]'
                  : 'text-[color:var(--color-ink-soft)]'
              }`}
            >
              {MODE_LABEL[m]}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-[color:var(--color-clay-deep)]">{error}</p>}

      {items === null ? (
        <p className="mt-8 font-serif italic text-[color:var(--color-ink-soft)]">Carregando…</p>
      ) : (
        <div
          className={`mt-8 grid gap-px bg-[color:var(--color-rule)] border border-[color:var(--color-rule)] ${
            mode === 'semana' ? 'grid-cols-1 md:grid-cols-7' : 'grid-cols-1'
          }`}
        >
          {days.map((day) => {
            const key = dayKey(day);
            const dayItems = items
              .filter((a) => dayKey(new Date(a.date)) === key)
              .sort((a, b) => a.date.localeCompare(b.date));
            return (
              <div
                key={key}
                className="bg-[color:var(--color-paper)] min-h-28 p-2 md:p-3"
              >
                <p
                  className={`kicker ${key === todayKey ? 'text-[color:var(--color-clay-deep)]' : ''}`}
                >
                  {WEEKDAY_SHORT[day.getDay()]} {day.getDate()}
                  {key === todayKey && ' · hoje'}
                </p>
                <div className="mt-2 space-y-2">
                  {dayItems.length === 0 ? (
                    <p className="text-xs text-[color:var(--color-ink-soft)] italic">—</p>
                  ) : (
                    dayItems.map((a) => (
                      <AppointmentCard key={a.id} appointment={a} onChanged={reload} />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AppointmentCard({
  appointment: a,
  onChanged,
}: {
  appointment: AppointmentItem;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canceled = a.status === 'CANCELED';
  const completed = a.status === 'COMPLETED';

  async function markCompleted() {
    setBusy(true);
    setError(null);
    try {
      await api(`/me/appointments/${a.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'COMPLETED' }),
      });
      onChanged();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={`border-l-4 bg-[color:var(--color-paper-soft)] text-left ${canceled ? 'opacity-50' : ''}`}
      style={{ borderLeftColor: a.professional.color }}
    >
      <button onClick={() => setOpen(!open)} className="w-full text-left p-2">
        <p className="text-xs font-medium">
          {formatTime(a.date)} · {a.patient.name}
        </p>
        <p className={`text-xs text-[color:var(--color-ink-soft)] ${canceled ? 'line-through' : ''}`}>
          {a.service.name}
        </p>
        {a.status !== 'CONFIRMED' && (
          <p className="text-[10px] uppercase tracking-wider mt-1 text-[color:var(--color-clay-deep)]">
            {STATUS_LABEL[a.status] ?? a.status}
          </p>
        )}
      </button>

      {open && (
        <div className="px-2 pb-2 space-y-2">
          <p className="text-xs text-[color:var(--color-ink-soft)]">
            ☎ {formatPhoneBR(a.patient.phone)}
          </p>
          {!canceled && !completed && (
            <button onClick={markCompleted} disabled={busy} className="text-xs link-editorial">
              {busy ? 'salvando…' : 'marcar como realizada'}
            </button>
          )}
          {error && <p className="text-xs text-[color:var(--color-clay-deep)]">{error}</p>}
        </div>
      )}
    </div>
  );
}
