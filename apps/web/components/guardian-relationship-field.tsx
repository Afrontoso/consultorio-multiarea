'use client';

import { useState } from 'react';

// Parentescos mais comuns. "Outro" no fim revela um campo de texto livre.
const PRESETS = ['Mãe', 'Pai', 'Avó', 'Avô', 'Tio(a)', 'Irmão(ã)', 'Tutor(a) legal'];
const OTHER = 'Outro';

/**
 * Campo de parentesco do responsável: um select com os parentescos comuns e,
 * ao escolher "Outro", um campo de texto para descrever. O valor final (string
 * livre) é sempre entregue via `onChange` — o componente não muda o contrato.
 */
export function GuardianRelationshipField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  // "Outro" quando há um valor que não está na lista de presets.
  const [isOther, setIsOther] = useState(() => value !== '' && !PRESETS.includes(value));
  const selectValue = isOther ? OTHER : value;

  return (
    <label className="block">
      <span className="kicker">Parentesco (opcional)</span>
      <select
        value={selectValue}
        onChange={(e) => {
          if (e.target.value === OTHER) {
            setIsOther(true);
            onChange('');
          } else {
            setIsOther(false);
            onChange(e.target.value);
          }
        }}
        className="input-editorial mt-2"
      >
        <option value="">Selecione…</option>
        {PRESETS.map((preset) => (
          <option key={preset} value={preset}>
            {preset}
          </option>
        ))}
        <option value={OTHER}>{OTHER}</option>
      </select>
      {isOther && (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={60}
          placeholder="Qual o parentesco?"
          className="input-editorial mt-2"
          autoFocus
        />
      )}
    </label>
  );
}
