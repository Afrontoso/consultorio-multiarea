import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/**
 * Criptografia de campos sensíveis do paciente (LGPD): `notes` e `birthDate`.
 *
 * AES-256-GCM em nível de aplicação — a chave vive no ambiente da API
 * (`FIELD_ENCRYPTION_KEY`), fora do banco. Assim, o vazamento apenas do dump
 * do Postgres não revela o conteúdo. Preferido ao `pgcrypto` porque o Prisma
 * não invoca `pgp_sym_encrypt`/`pgp_sym_decrypt` no query builder (exigiria
 * SQL cru em toda leitura/escrita).
 *
 * Formato do ciphertext: `v1:<iv_b64>:<tag_b64>:<ct_b64>`. O prefixo de versão
 * abre espaço para rotação de chave/algoritmo no futuro.
 */

const VERSION = 'v1';
const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12; // recomendado para GCM
const KEY_BYTES = 32; // AES-256

let cachedKey: Buffer | null = null;

/** Lê e valida a chave uma vez. Falha rápido se ausente ou com tamanho errado. */
function getKey(): Buffer {
  if (cachedKey) return cachedKey;
  const raw = process.env.FIELD_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      'FIELD_ENCRYPTION_KEY ausente — necessária para cifrar campos sensíveis do paciente (LGPD).',
    );
  }
  const key = Buffer.from(raw, 'base64');
  if (key.length !== KEY_BYTES) {
    throw new Error(
      `FIELD_ENCRYPTION_KEY inválida: esperados ${KEY_BYTES} bytes em base64, obtidos ${key.length}. Gere com: openssl rand -base64 32`,
    );
  }
  cachedKey = key;
  return key;
}

/** Cifra um texto claro. Retorna o formato versionado `v1:iv:tag:ct`. */
export function encryptField(plaintext: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${VERSION}:${iv.toString('base64')}:${tag.toString('base64')}:${ct.toString('base64')}`;
}

/**
 * Decifra um valor. Tolera valores legados não-cifrados (sem o prefixo `v1:`),
 * retornando-os crus — isso permite ler linhas gravadas antes da criptografia
 * até que sejam reescritas (e então cifradas).
 */
export function decryptField(value: string): string {
  if (!value.startsWith(`${VERSION}:`)) return value; // legado em texto claro
  const parts = value.split(':');
  if (parts.length !== 4) {
    throw new Error('Ciphertext malformado: esperado formato v1:iv:tag:ct.');
  }
  const [, ivB64, tagB64, ctB64] = parts as [string, string, string, string];
  const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  const pt = Buffer.concat([
    decipher.update(Buffer.from(ctB64, 'base64')),
    decipher.final(),
  ]);
  return pt.toString('utf8');
}

/** Cifra se houver valor; passa `null`/`undefined` adiante intactos. */
export function encryptOptional(value: string | null | undefined): string | null {
  return value == null ? null : encryptField(value);
}

/** Decifra se houver valor; passa `null` adiante. */
export function decryptOptional(value: string | null | undefined): string | null {
  return value == null ? null : decryptField(value);
}
