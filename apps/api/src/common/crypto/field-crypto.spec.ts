import { decryptField, encryptField, encryptOptional, decryptOptional } from './field-crypto';

describe('field-crypto', () => {
  it('faz round-trip (cifra e decifra de volta ao original)', () => {
    const plain = 'Paciente relatou insônia; sensível.';
    const cipher = encryptField(plain);
    expect(cipher).not.toBe(plain);
    expect(decryptField(cipher)).toBe(plain);
  });

  it('produz o formato versionado v1:iv:tag:ct', () => {
    const cipher = encryptField('x');
    const parts = cipher.split(':');
    expect(parts[0]).toBe('v1');
    expect(parts).toHaveLength(4);
  });

  it('gera ciphertext diferente a cada chamada (IV aleatório)', () => {
    expect(encryptField('mesmo texto')).not.toBe(encryptField('mesmo texto'));
  });

  it('trata valor legado (sem prefixo v1:) como texto claro', () => {
    expect(decryptField('1997-09-06T00:00:00.000Z')).toBe('1997-09-06T00:00:00.000Z');
  });

  it('rejeita ciphertext v1: malformado', () => {
    expect(() => decryptField('v1:apenas:tres')).toThrow();
  });

  it('encryptOptional/decryptOptional passam null adiante', () => {
    expect(encryptOptional(null)).toBeNull();
    expect(encryptOptional(undefined)).toBeNull();
    expect(decryptOptional(null)).toBeNull();
    const c = encryptOptional('abc');
    expect(decryptOptional(c)).toBe('abc');
  });

  it('falha rápido quando a chave está ausente', async () => {
    const original = process.env.FIELD_ENCRYPTION_KEY;
    jest.resetModules();
    delete process.env.FIELD_ENCRYPTION_KEY;
    // reimporta o módulo já sem a chave em cache
    const fresh = await import('./field-crypto');
    expect(() => fresh.encryptField('x')).toThrow(/FIELD_ENCRYPTION_KEY/);
    process.env.FIELD_ENCRYPTION_KEY = original;
  });
});
