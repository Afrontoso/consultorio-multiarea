'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '../../lib/api';
import type { Me, Professional } from '../../lib/painel-types';
import { formatPhoneBR, phoneDigits } from '../../lib/phone';

const COLORS = ['#3b82f6', '#2e4431', '#c16d4a', '#7c3aed', '#0d9488', '#b45309'];

const emptyForm = { name: '', email: '', phone: '', bio: '', color: COLORS[0] };

export function ProfessionalsSection({ me }: { me: Me }) {
  const [items, setItems] = useState<Professional[] | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [invited, setInvited] = useState<string[]>([]);

  useEffect(() => {
    api<Professional[]>('/professionals')
      .then(setItems)
      .catch((e) => setError((e as Error).message));
  }, []);

  const atLimit =
    !editingId && items !== null && items.length >= me.tenant.plan.maxProfessionals;

  function startEdit(p: Professional) {
    setEditingId(p.id);
    setForm({
      name: p.name,
      email: p.email,
      phone: p.phone ?? '',
      bio: p.bio ?? '',
      color: p.color,
    });
    setShowForm(true);
    setError(null);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const payload = {
      name: form.name,
      email: form.email,
      phone: form.phone || undefined,
      bio: form.bio || undefined,
      color: form.color,
    };
    try {
      if (editingId) {
        const updated = await api<Professional>(`/professionals/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        setItems((prev) => prev!.map((p) => (p.id === editingId ? updated : p)));
      } else {
        const created = await api<Professional>('/professionals', {
          method: 'POST',
          body: JSON.stringify({ ...payload, serviceIds: [] }),
        });
        setItems((prev) => [...(prev ?? []), created]);
      }
      closeForm();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(p: Professional) {
    if (!window.confirm(`Excluir ${p.name}?`)) return;
    setError(null);
    try {
      await api(`/professionals/${p.id}`, { method: 'DELETE' });
      setItems((prev) => prev!.filter((x) => x.id !== p.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (err as Error).message);
    }
  }

  async function handleInvite(p: Professional) {
    setError(null);
    setInvitingId(p.id);
    try {
      await api(`/professionals/${p.id}/invite`, { method: 'POST' });
      setInvited((prev) => [...prev, p.id]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (err as Error).message);
    } finally {
      setInvitingId(null);
    }
  }

  return (
    <section>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="section-number">§ Profissionais</p>
          <h2 className="font-serif text-3xl md:text-4xl mt-2 tracking-[-0.02em]">
            Quem atende
          </h2>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            disabled={atLimit}
            className="btn-ink"
            title={atLimit ? 'Limite do plano atingido' : undefined}
          >
            + Adicionar
          </button>
        )}
      </div>

      {atLimit && (
        <p className="mt-4 text-sm text-[color:var(--color-ink-soft)] border-l-2 border-[color:var(--color-clay)] pl-3">
          Seu plano {me.tenant.plan.code} permite {me.tenant.plan.maxProfessionals}{' '}
          profissional(is). Faça upgrade para adicionar mais.
        </p>
      )}

      {error && !showForm && (
        <p className="mt-4 text-sm text-[color:var(--color-clay-deep)]">{error}</p>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mt-8 border border-[color:var(--color-rule)] p-6 md:p-8 space-y-6 max-w-xl"
        >
          <p className="kicker">{editingId ? 'Editando profissional' : 'Novo profissional'}</p>
          <label className="block">
            <span className="kicker">Nome</span>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              minLength={2}
              maxLength={120}
              placeholder="Dra. Ana Souza"
              className="input-editorial mt-2"
              autoFocus
            />
          </label>
          <label className="block">
            <span className="kicker">Email</span>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              placeholder="ana@exemplo.com"
              className="input-editorial mt-2"
            />
          </label>
          <label className="block">
            <span className="kicker">Telefone (opcional)</span>
            <input
              type="tel"
              value={formatPhoneBR(form.phone)}
              onChange={(e) => setForm({ ...form, phone: phoneDigits(e.target.value) })}
              maxLength={16}
              placeholder="(11) 99999-0000"
              className="input-editorial mt-2"
            />
          </label>
          <label className="block">
            <span className="kicker">Mini-bio (opcional)</span>
            <textarea
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              maxLength={2000}
              rows={3}
              placeholder="CRP 06/12345 · Terapia cognitivo-comportamental"
              className="input-editorial mt-2"
            />
          </label>
          <div>
            <span className="kicker">Cor na agenda</span>
            <div className="mt-3 flex gap-3">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, color: c })}
                  aria-label={`Cor ${c}`}
                  className="h-8 w-8 rounded-full border-2"
                  style={{
                    background: c,
                    borderColor: form.color === c ? 'var(--color-ink)' : 'transparent',
                  }}
                />
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-[color:var(--color-clay-deep)]">{error}</p>}

          <div className="flex items-center gap-3 pt-2">
            <button type="submit" disabled={busy} className="btn-clay">
              {busy ? 'Salvando…' : editingId ? 'Salvar alterações' : 'Adicionar profissional'}
            </button>
            <button type="button" onClick={closeForm} className="btn-ghost">
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="mt-8">
        {items === null ? (
          <p className="font-serif italic text-[color:var(--color-ink-soft)]">Carregando…</p>
        ) : items.length === 0 ? (
          <p className="font-serif italic text-[color:var(--color-ink-soft)]">
            Nenhum profissional ainda. Adicione o primeiro — pode ser você.
          </p>
        ) : (
          <ul className="divide-y divide-[color:var(--color-rule)] border-t border-b border-[color:var(--color-rule)]">
            {items.map((p) => (
              <li key={p.id} className="py-5 flex items-center gap-4">
                <span
                  className="h-10 w-10 rounded-full shrink-0 flex items-center justify-center text-sm font-medium text-[color:var(--color-paper)]"
                  style={{ background: p.color }}
                >
                  {p.name
                    .split(' ')
                    .slice(0, 2)
                    .map((w) => w[0])
                    .join('')
                    .toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{p.name}</p>
                  <p className="text-sm text-[color:var(--color-ink-soft)] truncate">
                    {p.email}
                    {p.services.length > 0 &&
                      ` · ${p.services.map((s) => s.name).join(', ')}`}
                  </p>
                </div>
                {p.user ? (
                  <span className="text-xs text-[color:var(--color-moss)]">tem acesso</span>
                ) : invited.includes(p.id) ? (
                  <span className="text-xs text-[color:var(--color-moss)]">convite enviado</span>
                ) : (
                  <button
                    onClick={() => handleInvite(p)}
                    disabled={invitingId === p.id}
                    className="text-xs link-editorial"
                  >
                    {invitingId === p.id ? 'convidando…' : 'convidar'}
                  </button>
                )}
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
