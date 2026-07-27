'use client';

import { useCallback, useEffect, useState } from 'react';
import { onAuthStateChanged, sendEmailVerification, type User } from 'firebase/auth';
import { getFirebaseAuth } from './firebase';
import { api, ApiError } from './api';
import type { Me } from './painel-types';

export interface AuthState {
  user: User | null;
  /** `true` enquanto o Firebase ainda não resolveu a sessão. */
  loading: boolean;
  /** Email confirmado? A API recusa tokens de email não verificado. */
  emailVerified: boolean;
  /** Reconsulta o Firebase — usado depois que a pessoa abre o link do email. */
  recheckEmail: () => Promise<void>;
  /** Reenvia o email de confirmação. */
  resendVerification: () => Promise<void>;
}

/**
 * Sessão do Firebase como estado de React. Compartilhado por todas as telas
 * autenticadas (painel, profissional, paciente, plataforma) — antes cada uma
 * repetia este efeito.
 */
export function useAuthUser(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  // Espelha user.emailVerified em estado próprio: `reload()` atualiza o objeto
  // do Firebase sem disparar onAuthStateChanged, então o React não re-renderiza
  // sozinho quando a pessoa confirma o email em outra aba.
  const [emailVerified, setEmailVerified] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(getFirebaseAuth(), (u) => {
      setUser(u);
      setEmailVerified(u?.emailVerified ?? false);
      setLoading(false);
    });
  }, []);

  const recheckEmail = useCallback(async () => {
    const current = getFirebaseAuth().currentUser;
    if (!current) return;
    await current.reload();
    setEmailVerified(current.emailVerified);
  }, []);

  const resendVerification = useCallback(async () => {
    const current = getFirebaseAuth().currentUser;
    if (current) await sendEmailVerification(current);
  }, []);

  return { user, loading, emailVerified, recheckEmail, resendVerification };
}

export interface MeState {
  me: Me | null;
  /** 404 do /me: autenticado, mas sem consultório/convite para este email. */
  missing: boolean;
  error: string | null;
}

const NO_ME: MeState = { me: null, missing: false, error: null };

/** Carrega o /me do usuário autenticado. Passe `null` para não buscar nada. */
export function useMe(user: User | null): MeState {
  const [loaded, setLoaded] = useState<(MeState & { uid: string }) | null>(null);

  useEffect(() => {
    if (!user) return;
    const uid = user.uid;
    let stale = false;
    const settle = (result: MeState) => {
      if (!stale) setLoaded({ ...result, uid });
    };
    api<Me>('/me')
      .then((me) => settle({ ...NO_ME, me }))
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.status === 404) settle({ ...NO_ME, missing: true });
        else settle({ ...NO_ME, error: (e as Error).message });
      });
    return () => {
      stale = true;
    };
  }, [user]);

  // Derivado do uid: o resultado só vale para a sessão que o carregou. Sair ou
  // trocar de conta volta ao estado vazio sem efeito de limpeza — e sem o
  // risco de exibir por um instante os dados de quem estava logado antes.
  return user && loaded?.uid === user.uid ? loaded : NO_ME;
}
