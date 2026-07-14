'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '../../lib/api';
import type { Professional, WorkingHourRange } from '../../lib/painel-types';
import { WEEKDAY_LONG, hhmmToMinutes, minutesToHHMM } from '../../lib/agenda';

// Faixas em edição: horas como "HH:MM" para casar com <input type="time">.
interface EditableRange {
  weekday: number;
  start: string;
  end: string;
}

function toEditable(ranges: WorkingHourRange[]): EditableRange[] {
  return ranges.map((r) => ({
    weekday: r.weekday,
    start: minutesToHHMM(r.startMinute),
    end: minutesToHHMM(r.endMinute),
  }));
}

// Segunda a domingo, como um caderno de semana.
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export function WorkingHoursView({ professionals }: { professionals: Professional[] }) {
  const [professionalId, setProfessionalId] = useState('');
  const [ranges, setRanges] = useState<EditableRange[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!professionalId) return;
    let stale = false;
    api<WorkingHourRange[]>(`/professionals/${professionalId}/working-hours`)
      .then((res) => {
        if (!stale) setRanges(toEditable(res));
      })
      .catch((e) => {
        if (!stale) setError(e instanceof ApiError ? e.message : (e as Error).message);
      });
    return () => {
      stale = true;
    };
  }, [professionalId]);

  function addRange(weekday: number) {
    setSaved(false);
    setRanges((prev) => [...(prev ?? []), { weekday, start: '09:00', end: '18:00' }]);
  }

  function updateRange(index: number, patch: Partial<EditableRange>) {
    setSaved(false);
    setRanges((prev) => prev!.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function removeRange(index: number) {
    setSaved(false);
    setRanges((prev) => prev!.filter((_, i) => i !== index));
  }

  async function handleSave() {
    if (!ranges) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const payload = ranges.map((r) => ({
        weekday: r.weekday,
        startMinute: hhmmToMinutes(r.start),
        endMinute: hhmmToMinutes(r.end),
      }));
      const result = await api<WorkingHourRange[]>(
        `/professionals/${professionalId}/working-hours`,
        { method: 'PUT', body: JSON.stringify({ ranges: payload }) },
      );
      setRanges(toEditable(result));
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="text-sm text-[color:var(--color-ink-soft)] max-w-[52ch]">
        Os horários de trabalho definem quais slots aparecem na página pública de agendamento.
        Sem faixas em um dia, o dia não abre para pacientes.
      </p>

      <select
        value={professionalId}
        onChange={(e) => {
          setRanges(null);
          setError(null);
          setSaved(false);
          setProfessionalId(e.target.value);
        }}
        className="select-editorial mt-6 text-sm"
      >
        <option value="">Escolher profissional…</option>
        {professionals.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>

      {error && <p className="mt-4 text-sm text-[color:var(--color-clay-deep)]">{error}</p>}

      {professionalId &&
        (ranges === null ? (
          <p className="mt-8 font-serif italic text-[color:var(--color-ink-soft)]">Carregando…</p>
        ) : (
          <div className="mt-8 max-w-xl">
            <ul className="divide-y divide-[color:var(--color-rule)] border-t border-b border-[color:var(--color-rule)]">
              {WEEKDAY_ORDER.map((weekday) => {
                const dayRanges = ranges
                  .map((r, index) => ({ ...r, index }))
                  .filter((r) => r.weekday === weekday);
                return (
                  <li key={weekday} className="py-4">
                    <div className="flex items-baseline justify-between gap-4">
                      <p className="font-medium text-sm">{WEEKDAY_LONG[weekday]}</p>
                      <button
                        onClick={() => addRange(weekday)}
                        className="text-xs link-editorial"
                      >
                        + faixa
                      </button>
                    </div>
                    {dayRanges.length === 0 ? (
                      <p className="text-sm italic text-[color:var(--color-ink-soft)] mt-1">
                        fechado
                      </p>
                    ) : (
                      <div className="mt-2 space-y-2">
                        {dayRanges.map((r) => (
                          <div key={r.index} className="flex items-center gap-2">
                            <input
                              type="time"
                              value={r.start}
                              onChange={(e) => updateRange(r.index, { start: e.target.value })}
                              className="input-editorial text-sm py-1 w-28"
                            />
                            <span className="text-sm text-[color:var(--color-ink-soft)]">até</span>
                            <input
                              type="time"
                              value={r.end}
                              onChange={(e) => updateRange(r.index, { end: e.target.value })}
                              className="input-editorial text-sm py-1 w-28"
                            />
                            <button
                              onClick={() => removeRange(r.index)}
                              className="text-xs text-[color:var(--color-clay-deep)] link-editorial"
                            >
                              remover
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>

            <div className="mt-6 flex items-center gap-4">
              <button onClick={handleSave} disabled={busy} className="btn-clay">
                {busy ? 'Salvando…' : 'Salvar horários'}
              </button>
              {saved && (
                <span className="text-sm text-[color:var(--color-moss)]">Salvo ✓</span>
              )}
            </div>
          </div>
        ))}
    </div>
  );
}
