import { describe, expect, it } from 'vitest';
import { translateAuthError } from './auth-errors';

describe('translateAuthError', () => {
  it('traduz códigos conhecidos do Firebase Auth', () => {
    expect(translateAuthError({ code: 'auth/email-already-in-use' })).toBe(
      'Já existe uma conta com este email. Tente entrar.',
    );
    expect(translateAuthError({ code: 'auth/wrong-password' })).toBe(
      'Email ou senha incorretos.',
    );
    expect(translateAuthError({ code: 'auth/weak-password' })).toBe(
      'A senha precisa ter pelo menos 6 caracteres.',
    );
  });

  it('cai para a mensagem do Error quando o código é desconhecido', () => {
    expect(translateAuthError(new Error('algo específico quebrou'))).toBe(
      'algo específico quebrou',
    );
  });

  it('cai para mensagem genérica quando não há code nem message', () => {
    expect(translateAuthError('boom')).toBe('Não foi possível entrar. Tente novamente.');
    expect(translateAuthError(null)).toBe('Não foi possível entrar. Tente novamente.');
  });
});
