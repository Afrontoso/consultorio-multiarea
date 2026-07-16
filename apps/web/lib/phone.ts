// Máscara de telefone BR. O estado guarda só dígitos (formato canônico da API);
// a máscara é aplicada apenas na exibição.

/** Extrai os dígitos do valor digitado, limitado a DDD + 9 dígitos. */
export function phoneDigits(value: string): string {
  return value.replace(/\D/g, '').slice(0, 11);
}

/** "11999990000" → "(11) 99999-0000"; parciais são formatados progressivamente. */
export function formatPhoneBR(digits: string): string {
  const d = digits.replace(/\D/g, '').slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  const ddd = d.slice(0, 2);
  const rest = d.slice(2);
  if (rest.length <= 4) return `(${ddd}) ${rest}`;
  return `(${ddd}) ${rest.slice(0, rest.length - 4)}-${rest.slice(-4)}`;
}
