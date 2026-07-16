'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '../../lib/api';
import type { AppointmentItem, Professional } from '../../lib/painel-types';
import {
  WEEKDAY_SHORT,
  addDays,
  dayKey,
  formatDayLong,
  formatTime,
  startOfDay,
  startOfWeek,
  toDatetimeLocal,
} from '../../lib/agenda';
import { formatPhoneBR, phoneDigits } from '../../lib/phone';
import { BlocksView } from './blocks-view';
import { WorkingHoursView } from './working-hours-view';

type SubView = 'calendario' | 'bloqueios' | 'horarios';
type Mode = 'semana' | 'dia';

const STATUS_LABEL: Record<string, string> = {
  CONFIRMED: 'confirmada',
  PENDING: 'pendente',
  CANCELED: 'cancelada',
  COMPLETED: 'concluída',
  NO_SHOW: 'faltou',
};

export function AgendaSection() {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [subView, setSubView] = useState<SubView>('calendario');

  useEffect(() => {
    api<Professional[]>('/professionals')
      .then(setProfessionals)
      .catch(() => {});
  }, []);

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="section-number">§ Agenda</p>
          <h2 className="font-serif text-3xl md:text-4xl mt-2 tracking-[-0.02em]">
            O caderno de horários
          </h2>
        </div>
        <div className="flex gap-2">
          {(
            [
              ['calendario', 'Agenda'],
              ['bloqueios', 'Bloqueios'],
              ['horarios', 'Horários de trabalho'],
            ] as [SubView, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setSubView(key)}
              className={`text-sm px-3 py-1.5 border rounded-full transition-colors ${
                subView === key
                  ? 'bg-[color:var(--color-ink)] text-[color:var(--color-paper)] border-[color:var(--color-ink)]'
                  : 'border-[color:var(--color-rule)] text-[color:var(--color-ink-soft)] hover:border-[color:var(--color-ink)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8">
        {subView === 'calendario' && <CalendarView professionals={professionals} />}
        {subView === 'bloqueios' && <BlocksView professionals={professionals} />}
        {subView === 'horarios' && <WorkingHoursView professionals={professionals} />}
      </div>
    </section>
  );
}

function CalendarView({ professionals }: { professionals: Professional[] }) {
  const [mode, setMode] = useState<Mode>('semana');
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));
  const [professionalId, setProfessionalId] = useState('');
  const [items, setItems] = useState<AppointmentItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const from = mode === 'semana' ? startOfWeek(anchor) : anchor;
  const to = addDays(from, mode === 'semana' ? 7 : 1);

  useEffect(() => {
    let stale = false;
    const params = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() });
    if (professionalId) params.set('professionalId', professionalId);
    api<AppointmentItem[]>(`/appointments?${params}`)
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
  }, [mode, anchor, professionalId, reloadKey]);

  const reload = () => setReloadKey((k) => k + 1);
  const days = Array.from({ length: mode === 'semana' ? 7 : 1 }, (_, i) => addDays(from, i));
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

        <div className="flex items-center gap-3">
          <select
            value={professionalId}
            onChange={(e) => {
              setItems(null);
              setProfessionalId(e.target.value);
            }}
            className="select-editorial text-sm"
          >
            <option value="">Todos os profissionais</option>
            {professionals.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
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
                {m}
              </button>
            ))}
          </div>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="btn-ink whitespace-nowrap shrink-0"
            >
              + Agendar
            </button>
          )}
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-[color:var(--color-clay-deep)]">{error}</p>}

      {showForm && (
        <CreateAppointmentForm
          professionals={professionals}
          onClose={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false);
            reload();
          }}
        />
      )}

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
              <div key={key} className="bg-[color:var(--color-paper)] min-h-28 p-2 md:p-3">
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
  const [newDate, setNewDate] = useState(() => toDatetimeLocal(a.date));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canceled = a.status === 'CANCELED';

  async function patch(body: { date?: string; status?: string }) {
    setBusy(true);
    setError(null);
    try {
      await api(`/appointments/${a.id}`, { method: 'PATCH', body: JSON.stringify(body) });
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
          {a.service.name} · {a.professional.name}
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
          {!canceled && (
            <>
              <div className="space-y-1">
                <input
                  type="datetime-local"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="input-editorial text-xs py-1 w-full"
                />
                <button
                  onClick={() => patch({ date: new Date(newDate).toISOString() })}
                  disabled={busy || !newDate}
                  className="text-xs link-editorial"
                >
                  remarcar
                </button>
              </div>
              <button
                onClick={() => {
                  if (window.confirm(`Cancelar a consulta de ${a.patient.name}?`)) {
                    void patch({ status: 'CANCELED' });
                  }
                }}
                disabled={busy}
                className="text-xs text-[color:var(--color-clay-deep)] link-editorial"
              >
                cancelar consulta
              </button>
            </>
          )}
          {error && <p className="text-xs text-[color:var(--color-clay-deep)]">{error}</p>}
        </div>
      )}
    </div>
  );
}

const emptyForm = {
  professionalId: '',
  serviceId: '',
  datetime: '',
  patientName: '',
  patientPhone: '',
  patientEmail: '',
  notes: '',
};

function CreateAppointmentForm({
  professionals,
  onClose,
  onCreated,
}: {
  professionals: Professional[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const professional = professionals.find((p) => p.id === form.professionalId);
  const services = professional?.services ?? [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api('/appointments', {
        method: 'POST',
        body: JSON.stringify({
          date: new Date(form.datetime).toISOString(),
          professionalId: form.professionalId,
          serviceId: form.serviceId,
          patient: {
            name: form.patientName,
            phone: form.patientPhone,
            ...(form.patientEmail && { email: form.patientEmail }),
          },
          ...(form.notes && { notes: form.notes }),
        }),
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-8 border border-[color:var(--color-rule)] p-6 md:p-8 space-y-6 max-w-xl"
    >
      <p className="kicker">Novo agendamento</p>

      <div className="grid grid-cols-2 gap-6">
        <label className="block">
          <span className="kicker">Profissional</span>
          <select
            value={form.professionalId}
            onChange={(e) => setForm({ ...form, professionalId: e.target.value, serviceId: '' })}
            required
            className="select-editorial mt-2 w-full"
          >
            <option value="">Escolher…</option>
            {professionals.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="kicker">Serviço</span>
          <select
            value={form.serviceId}
            onChange={(e) => setForm({ ...form, serviceId: e.target.value })}
            required
            disabled={!professional}
            className="select-editorial mt-2 w-full"
          >
            <option value="">{professional ? 'Escolher…' : 'Escolha o profissional'}</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block">
        <span className="kicker">Data e hora</span>
        <input
          type="datetime-local"
          value={form.datetime}
          onChange={(e) => setForm({ ...form, datetime: e.target.value })}
          required
          className="input-editorial mt-2"
        />
      </label>

      <div className="grid grid-cols-2 gap-6">
        <label className="block">
          <span className="kicker">Paciente</span>
          <input
            value={form.patientName}
            onChange={(e) => setForm({ ...form, patientName: e.target.value })}
            required
            minLength={2}
            maxLength={120}
            placeholder="Maria da Silva"
            className="input-editorial mt-2"
          />
        </label>
        <label className="block">
          <span className="kicker">Telefone</span>
          <input
            type="tel"
            value={formatPhoneBR(form.patientPhone)}
            onChange={(e) => setForm({ ...form, patientPhone: phoneDigits(e.target.value) })}
            required
            minLength={14}
            maxLength={16}
            placeholder="(11) 99999-0000"
            className="input-editorial mt-2"
          />
        </label>
      </div>
      <p className="text-xs text-[color:var(--color-ink-soft)]">
        Se o telefone já for de um paciente cadastrado, a consulta entra na ficha dele.
      </p>

      <label className="block">
        <span className="kicker">Email (opcional)</span>
        <input
          type="email"
          value={form.patientEmail}
          onChange={(e) => setForm({ ...form, patientEmail: e.target.value })}
          maxLength={254}
          className="input-editorial mt-2"
        />
      </label>

      <label className="block">
        <span className="kicker">Observações (opcional)</span>
        <textarea
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          maxLength={2000}
          rows={2}
          className="input-editorial mt-2"
        />
      </label>

      {error && <p className="text-sm text-[color:var(--color-clay-deep)]">{error}</p>}

      <div className="flex items-center gap-3 pt-2">
        <button type="submit" disabled={busy} className="btn-clay">
          {busy ? 'Agendando…' : 'Agendar'}
        </button>
        <button type="button" onClick={onClose} className="btn-ghost">
          Cancelar
        </button>
      </div>
    </form>
  );
}
