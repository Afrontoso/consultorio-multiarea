'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '../../lib/api';
import type { AppointmentItem } from '../../lib/painel-types';
import { WEEKDAY_SHORT, addDays, dayKey, formatDayLong, formatTime, startOfDay } from '../../lib/agenda';

const STATUS_LABEL: Record<string, string> = {
  CONFIRMED: 'confirmada',
  PENDING: 'pendente',
  CANCELED: 'cancelada',
  COMPLETED: 'concluída',
  NO_SHOW: 'faltou',
};

const DAYS_AHEAD = 14;

export function PatientAgendaSection({ tenantSlug }: { tenantSlug: string }) {
  const [items, setItems] = useState<AppointmentItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let stale = false;
    api<AppointmentItem[]>('/me/appointments')
      .then((res) => {
        if (!stale) setItems(res);
      })
      .catch((e) => {
        if (!stale) setError(e instanceof ApiError ? e.message : (e as Error).message);
      });
    return () => {
      stale = true;
    };
  }, [reloadKey]);

  const reload = () => setReloadKey((k) => k + 1);

  if (error) {
    return <p className="text-sm text-[color:var(--color-clay-deep)]">{error}</p>;
  }
  if (items === null) {
    return (
      <p className="font-serif italic text-[color:var(--color-ink-soft)]">Carregando…</p>
    );
  }

  const now = new Date().getTime();
  const upcoming = items
    .filter((a) => new Date(a.date).getTime() >= now)
    .sort((a, b) => a.date.localeCompare(b.date));
  const history = items
    .filter((a) => new Date(a.date).getTime() < now)
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-14">
      <section>
        <p className="section-number">§ Próximas consultas</p>
        <h2 className="font-serif text-3xl md:text-4xl mt-2 tracking-[-0.02em]">
          O que vem por aí
        </h2>
        <div className="mt-8">
          {upcoming.length === 0 ? (
            <p className="font-serif italic text-[color:var(--color-ink-soft)]">
              Nenhuma consulta agendada.
            </p>
          ) : (
            <ul className="divide-y divide-[color:var(--color-rule)] border-t border-b border-[color:var(--color-rule)]">
              {upcoming.map((a) => (
                <UpcomingRow
                  key={a.id}
                  appointment={a}
                  tenantSlug={tenantSlug}
                  onChanged={reload}
                />
              ))}
            </ul>
          )}
        </div>
      </section>

      <section>
        <p className="section-number">§ Histórico</p>
        <h2 className="font-serif text-3xl md:text-4xl mt-2 tracking-[-0.02em]">
          Consultas passadas
        </h2>
        <div className="mt-8">
          {history.length === 0 ? (
            <p className="font-serif italic text-[color:var(--color-ink-soft)]">
              Nenhuma consulta ainda.
            </p>
          ) : (
            <ul className="divide-y divide-[color:var(--color-rule)] border-t border-b border-[color:var(--color-rule)]">
              {history.map((a) => (
                <li
                  key={a.id}
                  className={`py-4 flex items-center gap-4 ${a.status === 'CANCELED' ? 'opacity-50' : ''}`}
                >
                  <span
                    aria-hidden
                    className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: a.professional.color }}
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm font-medium ${a.status === 'CANCELED' ? 'line-through' : ''}`}
                    >
                      {new Date(a.date).toLocaleDateString('pt-BR')} · {formatTime(a.date)} ·{' '}
                      {a.service.name}
                    </p>
                    <p className="text-xs text-[color:var(--color-ink-soft)]">
                      {a.professional.name} · {STATUS_LABEL[a.status] ?? a.status}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function UpcomingRow({
  appointment: a,
  tenantSlug,
  onChanged,
}: {
  appointment: AppointmentItem;
  tenantSlug: string;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rescheduling, setRescheduling] = useState(false);
  const canceled = a.status === 'CANCELED';
  const actionable = a.status === 'CONFIRMED' || a.status === 'PENDING';

  async function handleCancel() {
    if (!window.confirm('Cancelar esta consulta?')) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/me/appointments/${a.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'CANCELED' }),
      });
      onChanged();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className={`py-4 ${canceled ? 'opacity-50' : ''}`}>
      <div className="flex items-center gap-4">
        <span
          aria-hidden
          className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
          style={{ backgroundColor: a.professional.color }}
        />
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-medium capitalize ${canceled ? 'line-through' : ''}`}>
            {formatDayLong(new Date(a.date))} · {formatTime(a.date)} · {a.service.name}
          </p>
          <p className="text-xs text-[color:var(--color-ink-soft)]">
            {a.professional.name}
            {a.status !== 'CONFIRMED' && ` · ${STATUS_LABEL[a.status] ?? a.status}`}
          </p>
        </div>
        {actionable && (
          <div className="flex gap-3 shrink-0">
            <button onClick={() => setRescheduling((v) => !v)} className="text-xs link-editorial">
              {rescheduling ? 'fechar' : 'reagendar'}
            </button>
            <button
              onClick={() => void handleCancel()}
              disabled={busy}
              className="text-xs text-[color:var(--color-clay-deep)] link-editorial"
            >
              {busy ? 'cancelando…' : 'cancelar'}
            </button>
          </div>
        )}
      </div>

      {error && <p className="mt-2 text-xs text-[color:var(--color-clay-deep)]">{error}</p>}

      {rescheduling && (
        <RescheduleForm
          appointment={a}
          tenantSlug={tenantSlug}
          onDone={() => {
            setRescheduling(false);
            onChanged();
          }}
          onError={setError}
        />
      )}
    </li>
  );
}

function RescheduleForm({
  appointment,
  tenantSlug,
  onDone,
  onError,
}: {
  appointment: AppointmentItem;
  tenantSlug: string;
  onDone: () => void;
  onError: (msg: string) => void;
}) {
  const [day, setDay] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[] | null>(null);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const days = Array.from({ length: DAYS_AHEAD }, (_, i) =>
    dayKey(addDays(startOfDay(new Date()), i)),
  );

  useEffect(() => {
    if (!day) return;
    let stale = false;
    api<{ slots: string[] }>(
      `/public/tenants/${tenantSlug}/availability?professionalId=${appointment.professional.id}&serviceId=${appointment.service.id}&date=${day}`,
      { authed: false },
    )
      .then((res) => {
        if (!stale) setSlots(res.slots);
      })
      .catch((e) => {
        if (stale) return;
        setSlotsError(e instanceof ApiError ? e.message : 'Erro ao buscar horários.');
        setSlots([]);
      });
    return () => {
      stale = true;
    };
  }, [day, tenantSlug, appointment.professional.id, appointment.service.id]);

  async function confirmSlot(slot: string) {
    setSubmitting(true);
    try {
      await api(`/me/appointments/${appointment.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ date: slot }),
      });
      onDone();
    } catch (e) {
      onError(e instanceof ApiError ? e.message : 'Não foi possível reagendar.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-4 pl-6 border-l-2 border-[color:var(--color-rule)]">
      <div className="flex flex-wrap gap-2">
        {days.map((d) => {
          const [y, m, dd] = d.split('-').map(Number);
          const dateObj = new Date(y!, m! - 1, dd!);
          const active = d === day;
          return (
            <button
              key={d}
              onClick={() => {
                setDay(d);
                setSlots(null);
                setSlotsError(null);
              }}
              className={`text-xs px-3 py-1.5 border rounded-full transition-colors capitalize ${
                active
                  ? 'bg-[color:var(--color-ink)] text-[color:var(--color-paper)] border-[color:var(--color-ink)]'
                  : 'border-[color:var(--color-rule)] text-[color:var(--color-ink-soft)] hover:border-[color:var(--color-ink)]'
              }`}
            >
              {WEEKDAY_SHORT[dateObj.getDay()]} {dateObj.getDate()}
            </button>
          );
        })}
      </div>

      {slotsError && <p className="mt-4 text-xs text-[color:var(--color-clay-deep)]">{slotsError}</p>}

      {day && (
        <div className="mt-4">
          {slots === null ? (
            <p className="text-xs font-serif italic text-[color:var(--color-ink-soft)]">
              Buscando horários…
            </p>
          ) : slots.length === 0 ? (
            !slotsError && (
              <p className="text-xs font-serif italic text-[color:var(--color-ink-soft)]">
                Sem horários livres neste dia.
              </p>
            )
          ) : (
            <div className="flex flex-wrap gap-2">
              {slots.map((s) => (
                <button
                  key={s}
                  onClick={() => void confirmSlot(s)}
                  disabled={submitting}
                  className="text-xs px-3 py-1.5 border border-[color:var(--color-rule)] hover:border-[color:var(--color-ink)] transition-colors disabled:opacity-40"
                >
                  {formatTime(s)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
