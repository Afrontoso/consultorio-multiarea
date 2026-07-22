'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '../../lib/api';
import type { PatientDetail, PatientItem } from '../../lib/painel-types';
import { formatTime } from '../../lib/agenda';
import { formatPhoneBR, phoneDigits } from '../../lib/phone';

const STATUS_LABEL: Record<string, string> = {
  CONFIRMED: 'confirmada',
  PENDING: 'pendente',
  CANCELED: 'cancelada',
  COMPLETED: 'concluída',
  NO_SHOW: 'faltou',
};

const emptyForm = { name: '', phone: '', email: '', birthDate: '', notes: '' };

function formPayload(form: typeof emptyForm) {
  return {
    name: form.name,
    phone: form.phone,
    ...(form.email && { email: form.email }),
    ...(form.birthDate && { birthDate: form.birthDate }),
    ...(form.notes && { notes: form.notes }),
  };
}

export function PatientsSection() {
  const [items, setItems] = useState<PatientItem[] | null>(null);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<PatientItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [invited, setInvited] = useState<string[]>([]);

  useEffect(() => {
    let stale = false;
    const params = search ? `?search=${encodeURIComponent(search)}` : '';
    api<PatientItem[]>(`/patients${params}`)
      .then((res) => {
        if (!stale) setItems(res);
      })
      .catch((e) => {
        if (!stale) setError(e instanceof ApiError ? e.message : (e as Error).message);
      });
    return () => {
      stale = true;
    };
  }, [search, reloadKey]);

  function startCreate() {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
    setError(null);
  }

  function startEdit(p: PatientItem) {
    setEditing(p);
    setForm({
      name: p.name,
      phone: p.phone,
      email: p.email ?? '',
      birthDate: p.birthDate ? p.birthDate.slice(0, 10) : '',
      notes: p.notes ?? '',
    });
    setShowForm(true);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (editing) {
        await api(`/patients/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify(formPayload(form)),
        });
      } else {
        await api('/patients', { method: 'POST', body: JSON.stringify(formPayload(form)) });
      }
      setShowForm(false);
      setEditing(null);
      setForm(emptyForm);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleInvite(p: PatientItem) {
    setError(null);
    setInvitingId(p.id);
    try {
      await api(`/patients/${p.id}/invite`, { method: 'POST' });
      setInvited((prev) => [...prev, p.id]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (err as Error).message);
    } finally {
      setInvitingId(null);
    }
  }

  async function handleDelete(p: PatientItem) {
    if (!window.confirm(`Excluir a ficha de ${p.name}? Os dados saem da listagem.`)) return;
    setError(null);
    try {
      await api(`/patients/${p.id}`, { method: 'DELETE' });
      if (selectedId === p.id) setSelectedId(null);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (err as Error).message);
    }
  }

  if (selectedId) {
    return (
      <PatientDetailView
        id={selectedId}
        onBack={() => setSelectedId(null)}
        onEdit={(p) => {
          setSelectedId(null);
          startEdit(p);
        }}
      />
    );
  }

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="section-number">§ Pacientes</p>
          <h2 className="font-serif text-3xl md:text-4xl mt-2 tracking-[-0.02em]">
            Quem passa pelo consultório
          </h2>
        </div>
        {!showForm && (
          <button onClick={startCreate} className="btn-ink whitespace-nowrap shrink-0">
            + Adicionar
          </button>
        )}
      </div>

      {error && !showForm && (
        <p className="mt-4 text-sm text-[color:var(--color-clay-deep)]">{error}</p>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mt-8 border border-[color:var(--color-rule)] p-6 md:p-8 space-y-6 max-w-xl"
        >
          <p className="kicker">{editing ? `Editando ${editing.name}` : 'Novo paciente'}</p>
          <div className="grid grid-cols-2 gap-6">
            <label className="block">
              <span className="kicker">Nome</span>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                minLength={2}
                maxLength={120}
                placeholder="Maria da Silva"
                className="input-editorial mt-2"
                autoFocus
              />
            </label>
            <label className="block">
              <span className="kicker">Telefone</span>
              <input
                type="tel"
                value={formatPhoneBR(form.phone)}
                onChange={(e) => setForm({ ...form, phone: phoneDigits(e.target.value) })}
                required
                minLength={14}
                maxLength={16}
                placeholder="(11) 99999-0000"
                className="input-editorial mt-2"
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <label className="block">
              <span className="kicker">Email (opcional)</span>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                maxLength={254}
                className="input-editorial mt-2"
              />
            </label>
            <label className="block">
              <span className="kicker">Nascimento (opcional)</span>
              <input
                type="date"
                value={form.birthDate}
                onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
                className="input-editorial mt-2"
              />
            </label>
          </div>
          <label className="block">
            <span className="kicker">Anotações (opcional)</span>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              maxLength={2000}
              rows={3}
              placeholder="Preferências, contexto, cuidados…"
              className="input-editorial mt-2"
            />
          </label>

          {error && <p className="text-sm text-[color:var(--color-clay-deep)]">{error}</p>}

          <div className="flex items-center gap-3 pt-2">
            <button type="submit" disabled={busy} className="btn-clay">
              {busy ? 'Salvando…' : editing ? 'Salvar alterações' : 'Adicionar paciente'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditing(null);
                setError(null);
              }}
              className="btn-ghost"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por nome ou telefone…"
        className="input-editorial mt-8 max-w-sm"
      />

      <div className="mt-6">
        {items === null ? (
          <p className="font-serif italic text-[color:var(--color-ink-soft)]">Carregando…</p>
        ) : items.length === 0 ? (
          <p className="font-serif italic text-[color:var(--color-ink-soft)]">
            {search
              ? 'Ninguém encontrado com essa busca.'
              : 'Nenhum paciente ainda. Eles aparecem aqui quando agendam pela página pública — ou cadastre o primeiro.'}
          </p>
        ) : (
          <ul className="divide-y divide-[color:var(--color-rule)] border-t border-b border-[color:var(--color-rule)]">
            {items.map((p) => (
              <li key={p.id} className="py-4 flex items-baseline gap-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{p.name}</p>
                  <p className="text-sm text-[color:var(--color-ink-soft)] truncate">
                    ☎ {formatPhoneBR(p.phone)}
                    {p.email && ` · ${p.email}`}
                  </p>
                </div>
                {p.user ? (
                  <span className="text-xs text-[color:var(--color-moss)]">tem acesso</span>
                ) : invited.includes(p.id) ? (
                  <span className="text-xs text-[color:var(--color-moss)]">convite enviado</span>
                ) : (
                  <button
                    onClick={() => handleInvite(p)}
                    disabled={invitingId === p.id || !p.email}
                    title={!p.email ? 'Cadastre um email para convidar' : undefined}
                    className="text-xs link-editorial disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {invitingId === p.id ? 'convidando…' : 'convidar'}
                  </button>
                )}
                <button onClick={() => setSelectedId(p.id)} className="text-xs link-editorial">
                  ficha
                </button>
                <button onClick={() => startEdit(p)} className="text-xs link-editorial">
                  editar
                </button>
                <button
                  onClick={() => handleDelete(p)}
                  className="text-xs text-[color:var(--color-clay-deep)] link-editorial"
                >
                  excluir
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function PatientDetailView({
  id,
  onBack,
  onEdit,
}: {
  id: string;
  onBack: () => void;
  onEdit: (p: PatientItem) => void;
}) {
  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stale = false;
    api<PatientDetail>(`/patients/${id}`)
      .then((res) => {
        if (!stale) setPatient(res);
      })
      .catch((e) => {
        if (!stale) setError(e instanceof ApiError ? e.message : (e as Error).message);
      });
    return () => {
      stale = true;
    };
  }, [id]);

  if (error) {
    return (
      <section>
        <button onClick={onBack} className="text-xs link-editorial">
          ← voltar
        </button>
        <p className="mt-4 text-sm text-[color:var(--color-clay-deep)]">{error}</p>
      </section>
    );
  }

  if (!patient) {
    return <p className="font-serif italic text-[color:var(--color-ink-soft)]">Carregando…</p>;
  }

  return (
    <section>
      <button onClick={onBack} className="text-xs link-editorial">
        ← voltar aos pacientes
      </button>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="section-number">§ Ficha</p>
          <h2 className="font-serif text-3xl md:text-4xl mt-2 tracking-[-0.02em]">
            {patient.name}
          </h2>
        </div>
        <button onClick={() => onEdit(patient)} className="btn-ghost">
          Editar ficha
        </button>
      </div>

      <dl className="mt-8 border-t border-b border-[color:var(--color-rule)] divide-y divide-[color:var(--color-rule)] max-w-xl">
        <Row label="Telefone" value={formatPhoneBR(patient.phone)} />
        {patient.email && <Row label="Email" value={patient.email} />}
        {patient.birthDate && (
          <Row
            label="Nascimento"
            value={new Date(patient.birthDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
          />
        )}
        <Row
          label="Desde"
          value={new Date(patient.createdAt).toLocaleDateString('pt-BR')}
        />
      </dl>

      {patient.notes && (
        <div className="mt-8 max-w-xl">
          <p className="kicker">Anotações</p>
          <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap text-[color:var(--color-ink-soft)]">
            {patient.notes}
          </p>
        </div>
      )}

      <div className="mt-10 max-w-xl">
        <p className="kicker">Histórico de consultas ({patient.appointments.length})</p>
        {patient.appointments.length === 0 ? (
          <p className="mt-3 font-serif italic text-[color:var(--color-ink-soft)]">
            Nenhuma consulta ainda.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-[color:var(--color-rule)] border-t border-b border-[color:var(--color-rule)]">
            {patient.appointments.map((a) => {
              const canceled = a.status === 'CANCELED';
              return (
                <li key={a.id} className={`py-3 flex items-center gap-3 ${canceled ? 'opacity-50' : ''}`}>
                  <span
                    aria-hidden
                    className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: a.professional.color }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium ${canceled ? 'line-through' : ''}`}>
                      {new Date(a.date).toLocaleDateString('pt-BR')} · {formatTime(a.date)} ·{' '}
                      {a.service.name}
                    </p>
                    <p className="text-xs text-[color:var(--color-ink-soft)]">
                      {a.professional.name} · {STATUS_LABEL[a.status] ?? a.status}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-3 flex items-baseline gap-4">
      <dt className="kicker w-32 shrink-0">{label}</dt>
      <dd className="font-medium text-sm">{value}</dd>
    </div>
  );
}
