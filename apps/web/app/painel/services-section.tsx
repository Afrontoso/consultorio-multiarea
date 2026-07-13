'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '../../lib/api';
import type { Professional, Service } from '../../lib/painel-types';

const emptyForm = { name: '', description: '', duration: '50', price: '', professionalIds: [] as string[] };

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function ServicesSection() {
  const [items, setItems] = useState<Service[] | null>(null);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Service[]>('/services')
      .then(setItems)
      .catch((e) => setError((e as Error).message));
    api<Professional[]>('/professionals')
      .then(setProfessionals)
      .catch(() => {});
  }, []);

  function startEdit(s: Service) {
    setEditingId(s.id);
    setForm({
      name: s.name,
      description: s.description ?? '',
      duration: String(s.duration),
      price: String(s.price),
      professionalIds: s.professionals.map((p) => p.id),
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

  function toggleProfessional(id: string) {
    setForm((f) => ({
      ...f,
      professionalIds: f.professionalIds.includes(id)
        ? f.professionalIds.filter((x) => x !== id)
        : [...f.professionalIds, id],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const payload = {
      name: form.name,
      description: form.description || undefined,
      duration: Number(form.duration),
      price: Number(form.price.replace(',', '.')),
      professionalIds: form.professionalIds,
    };
    try {
      if (editingId) {
        const updated = await api<Service>(`/services/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        setItems((prev) => prev!.map((s) => (s.id === editingId ? updated : s)));
      } else {
        const created = await api<Service>('/services', {
          method: 'POST',
          body: JSON.stringify(payload),
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

  async function handleDelete(s: Service) {
    if (!window.confirm(`Excluir ${s.name}?`)) return;
    setError(null);
    try {
      await api(`/services/${s.id}`, { method: 'DELETE' });
      setItems((prev) => prev!.filter((x) => x.id !== s.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (err as Error).message);
    }
  }

  return (
    <section>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="section-number">§ Serviços</p>
          <h2 className="font-serif text-3xl md:text-4xl mt-2 tracking-[-0.02em]">
            O que você oferece
          </h2>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="btn-ink">
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
          <p className="kicker">{editingId ? 'Editando serviço' : 'Novo serviço'}</p>
          <label className="block">
            <span className="kicker">Nome</span>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              minLength={2}
              maxLength={120}
              placeholder="Sessão de psicoterapia"
              className="input-editorial mt-2"
              autoFocus
            />
          </label>
          <div className="grid grid-cols-2 gap-6">
            <label className="block">
              <span className="kicker">Duração (min)</span>
              <input
                type="number"
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: e.target.value })}
                required
                min={5}
                max={480}
                step={5}
                className="input-editorial mt-2"
              />
            </label>
            <label className="block">
              <span className="kicker">Preço (R$)</span>
              <input
                inputMode="decimal"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                required
                placeholder="180,00"
                className="input-editorial mt-2"
              />
            </label>
          </div>
          <label className="block">
            <span className="kicker">Descrição (opcional)</span>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              maxLength={2000}
              rows={2}
              placeholder="Atendimento individual, presencial ou online"
              className="input-editorial mt-2"
            />
          </label>

          {professionals.length > 0 && (
            <div>
              <span className="kicker">Quem realiza</span>
              <div className="mt-3 flex flex-wrap gap-2">
                {professionals.map((p) => {
                  const active = form.professionalIds.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => toggleProfessional(p.id)}
                      className={`text-sm px-3 py-1.5 border rounded-full transition-colors ${
                        active
                          ? 'bg-[color:var(--color-ink)] text-[color:var(--color-paper)] border-[color:var(--color-ink)]'
                          : 'border-[color:var(--color-rule)] text-[color:var(--color-ink-soft)] hover:border-[color:var(--color-ink)]'
                      }`}
                    >
                      {p.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {error && <p className="text-sm text-[color:var(--color-clay-deep)]">{error}</p>}

          <div className="flex items-center gap-3 pt-2">
            <button type="submit" disabled={busy} className="btn-clay">
              {busy ? 'Salvando…' : editingId ? 'Salvar alterações' : 'Adicionar serviço'}
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
            Nenhum serviço ainda. Cadastre o primeiro — nome, duração e preço bastam.
          </p>
        ) : (
          <ul className="divide-y divide-[color:var(--color-rule)] border-t border-b border-[color:var(--color-rule)]">
            {items.map((s) => (
              <li key={s.id} className="py-5 flex items-baseline gap-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{s.name}</p>
                  <p className="text-sm text-[color:var(--color-ink-soft)] truncate">
                    {s.duration} min · {formatBRL(s.price)}
                    {s.professionals.length > 0 &&
                      ` · ${s.professionals.map((p) => p.name).join(', ')}`}
                  </p>
                </div>
                <button onClick={() => startEdit(s)} className="text-xs link-editorial">
                  editar
                </button>
                <button
                  onClick={() => handleDelete(s)}
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
