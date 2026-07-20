/** Códigos de erro do Firebase Auth traduzidos para mensagens em PT-BR. */
const MESSAGES: Record<string, string> = {
  'auth/email-already-in-use': 'Já existe uma conta com este email. Tente entrar.',
  'auth/invalid-credential': 'Email ou senha incorretos.',
  'auth/wrong-password': 'Email ou senha incorretos.',
  'auth/user-not-found': 'Não encontramos conta com este email.',
  'auth/weak-password': 'A senha precisa ter pelo menos 6 caracteres.',
  'auth/invalid-email': 'Email inválido.',
  'auth/missing-email': 'Informe um email.',
  'auth/too-many-requests': 'Muitas tentativas. Aguarde um pouco e tente de novo.',
  'auth/popup-closed-by-user': 'Login cancelado.',
  'auth/network-request-failed': 'Falha de conexão. Verifique sua internet e tente de novo.',
};

/** Extrai um código `auth/...` de um erro do Firebase, se houver. */
function authErrorCode(err: unknown): string | undefined {
  const code = (err as { code?: unknown } | null)?.code;
  return typeof code === 'string' ? code : undefined;
}

export function translateAuthError(err: unknown): string {
  const code = authErrorCode(err);
  if (code && MESSAGES[code]) return MESSAGES[code];
  return err instanceof Error ? err.message : 'Não foi possível entrar. Tente novamente.';
}
