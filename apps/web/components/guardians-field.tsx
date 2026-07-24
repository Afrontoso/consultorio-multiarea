'use client';

import { formatPhoneBR, phoneDigits } from '../lib/phone';
import { GuardianRelationshipField } from './guardian-relationship-field';

export interface GuardianForm {
  name: string;
  phone: string;
  relationship: string;
}

export const emptyGuardian: GuardianForm = { name: '', phone: '', relationship: '' };

/**
 * Lista editável de responsáveis legais (painel). Sempre mostra ao menos uma
 * linha; o profissional pode adicionar mais com o botão ou remover as extras.
 */
export function GuardiansField({
  value,
  onChange,
}: {
  value: GuardianForm[];
  onChange: (value: GuardianForm[]) => void;
}) {
  const rows = value.length ? value : [emptyGuardian];

  const update = (index: number, patch: Partial<GuardianForm>) =>
    onChange(rows.map((g, i) => (i === index ? { ...g, ...patch } : g)));
  const add = () => onChange([...rows, { ...emptyGuardian }]);
  const remove = (index: number) => onChange(rows.filter((_, i) => i !== index));

  return (
    <fieldset className="border border-[color:var(--color-rule)] p-4 space-y-6">
      <legend className="kicker px-2">Responsável legal (paciente menor)</legend>
      {rows.map((guardian, i) => (
        <div key={i} className="space-y-4">
          {rows.length > 1 && (
            <div className="flex items-center justify-between">
              <span className="kicker">Responsável {i + 1}</span>
              <button
                type="button"
                onClick={() => remove(i)}
                className="text-xs link-editorial"
              >
                remover
              </button>
            </div>
          )}
          <div className="grid grid-cols-2 gap-6">
            <label className="block">
              <span className="kicker">Nome do responsável</span>
              <input
                value={guardian.name}
                onChange={(e) => update(i, { name: e.target.value })}
                required
                minLength={2}
                maxLength={120}
                className="input-editorial mt-2"
              />
            </label>
            <label className="block">
              <span className="kicker">Telefone do responsável</span>
              <input
                type="tel"
                value={formatPhoneBR(guardian.phone)}
                onChange={(e) => update(i, { phone: phoneDigits(e.target.value) })}
                required
                minLength={14}
                maxLength={16}
                placeholder="(11) 99999-0000"
                className="input-editorial mt-2"
              />
            </label>
          </div>
          <GuardianRelationshipField
            value={guardian.relationship}
            onChange={(relationship) => update(i, { relationship })}
          />
        </div>
      ))}
      <button type="button" onClick={add} className="btn-ghost text-sm">
        + adicionar responsável
      </button>
    </fieldset>
  );
}

/** Monta o payload de responsáveis: descarta linhas vazias e o parentesco vazio. */
export function guardiansPayload(rows: GuardianForm[]) {
  return rows
    .filter((g) => g.name.trim() || g.phone.trim())
    .map((g) => ({
      name: g.name.trim(),
      phone: g.phone,
      ...(g.relationship.trim() && { relationship: g.relationship.trim() }),
    }));
}
