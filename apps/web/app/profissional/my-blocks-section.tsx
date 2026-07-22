'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '../../lib/api';
import type { ScheduleBlockItem } from '../../lib/painel-types';
import { formatTime } from '../../lib/agenda';

const emptyForm = { startsAt: '', endsAt: '', reason: '' };

function formatRange(b: ScheduleBlockItem) {
  const start = new Date(b.startsAt);
  const end = new Date(b.endsAt);
  const sameDay = start.toDateString() === end.toDateString();
  const day = (d: Date) =>
    d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
  return sameDay
    ? `${day(start)} · ${formatTime(b.startsAt)} – ${formatTime(b.endsAt)}`
    : `${day(start)} ${formatTime(b.startsAt)} → ${day(end)} ${formatTime(b.endsAt)}`;
}

export function MyBlocksSection() {
  const [blocks, setBlocks] = useState<ScheduleBlockItem[] | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let stale = false;
    api<ScheduleBlockItem[]>('/me/blocks')
      .then((res) => {
        if (!stale) setBlocks(res);
      })
      .catch((e) => {
        if (!stale) setError(e instanceof ApiError ? e.message : (e as Error).message);
      });
    return () => {
      stale = true;
    };
  }, [reloadKey]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api('/me/blocks', {
        method: 'POST',
        body: JSON.stringify({
          startsAt: new Date(form.startsAt).toISOString(),
          endsAt: new Date(form.endsAt).toISOString(),
          ...(form.reason && { reason: form.reason }),
        }),
      });
      setForm(emptyForm);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(block: ScheduleBlockItem) {
    if (!window.confirm('Remover este bloqueio?')) return;
    setError(null);
    try {
      await api(`/me/blocks/${block.id}`, { method: 'DELETE' });
      setBlocks((prev) => prev!.filter((b) => b.id !== block.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (err as Error).message);
    }
  }

  return (
    <div>
      <p className="text-sm text-[color:var(--color-ink-soft)] max-w-[52ch]">
        Bloqueios tiram períodos da sua agenda pública — férias, congressos, compromissos. Só os
        bloqueios futuros são listados.
      </p>

      {error && <p className="mt-4 text-sm text-[color:var(--color-clay-deep)]">{error}</p>}

      <form
        onSubmit={handleCreate}
        className="mt-8 border border-[color:var(--color-rule)] p-6 space-y-4 max-w-xl"
      >
        <p className="kicker">Novo bloqueio</p>
        <div className="grid grid-cols-2 gap-6">
          <label className="block">
            <span className="kicker">Início</span>
            <input
              type="datetime-local"
              value={form.startsAt}
              onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
              required
              className="input-editorial mt-2"
            />
          </label>
          <label className="block">
            <span className="kicker">Fim</span>
            <input
              type="datetime-local"
              value={form.endsAt}
              onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
              required
              className="input-editorial mt-2"
            />
          </label>
        </div>
        <label className="block">
          <span className="kicker">Motivo (opcional)</span>
          <input
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            maxLength={200}
            placeholder="Férias, congresso…"
            className="input-editorial mt-2"
          />
        </label>
        <button type="submit" disabled={busy} className="btn-ink">
          {busy ? 'Bloqueando…' : 'Bloquear período'}
        </button>
      </form>

      <div className="mt-8">
        {blocks === null ? (
          <p className="font-serif italic text-[color:var(--color-ink-soft)]">Carregando…</p>
        ) : blocks.length === 0 ? (
          <p className="font-serif italic text-[color:var(--color-ink-soft)]">
            Nenhum bloqueio futuro.
          </p>
        ) : (
          <ul className="divide-y divide-[color:var(--color-rule)] border-t border-b border-[color:var(--color-rule)] max-w-xl">
            {blocks.map((b) => (
              <li key={b.id} className="py-4 flex items-baseline gap-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm">{formatRange(b)}</p>
                  {b.reason && (
                    <p className="text-sm text-[color:var(--color-ink-soft)]">{b.reason}</p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(b)}
                  className="text-xs text-[color:var(--color-clay-deep)] link-editorial"
                >
                  remover
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
