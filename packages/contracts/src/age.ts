/** Maioridade civil no Brasil. */
export const MAJORITY_AGE = 18;

/**
 * Idade completa (em anos) na data de referência, calculada por componentes
 * UTC para não sofrer drift de fuso (birthDate costuma vir como data-only à
 * meia-noite UTC).
 */
export function ageAt(birthDate: Date, at: Date = new Date()): number {
  let age = at.getUTCFullYear() - birthDate.getUTCFullYear();
  const monthDiff = at.getUTCMonth() - birthDate.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && at.getUTCDate() < birthDate.getUTCDate())) {
    age -= 1;
  }
  return age;
}

/**
 * `true` se, na data de referência, a pessoa ainda não completou 18 anos.
 * Quem faz aniversário exatamente na data de referência já é maior.
 */
export function isMinor(birthDate: Date, at: Date = new Date()): boolean {
  return ageAt(birthDate, at) < MAJORITY_AGE;
}
