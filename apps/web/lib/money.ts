// Dinheiro em BRL. Nos formulários o estado guarda centavos como string de
// dígitos (como app de banco: digitar desloca da direita para a esquerda);
// a API fala number em reais com 2 casas.

const MAX_DIGITS = 7; // Decimal(10,2) do serviço: teto 99.999,99

/** Extrai os centavos digitados ("R$ 1.234,56" → "123456"). */
export function moneyDigits(value: string): string {
  return value.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, MAX_DIGITS);
}

/** "18000" (centavos) → "180,00"; "" → "". */
export function formatMoneyBR(digits: string): string {
  const d = digits.replace(/\D/g, '');
  if (d.length === 0) return '';
  const cents = d.padStart(3, '0');
  const reais = cents.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${reais},${cents.slice(-2)}`;
}

/** Centavos digitados → number em reais para a API. */
export function centavosToNumber(digits: string): number {
  const d = digits.replace(/\D/g, '');
  return d ? parseInt(d, 10) / 100 : 0;
}

/** Number em reais → centavos como string, para preencher edição. */
export function numberToCentavos(value: number): string {
  return String(Math.round(value * 100));
}

/** Exibição: 180 → "R$ 180,00". */
export function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
