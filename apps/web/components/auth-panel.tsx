'use client';

import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import {
  createUserWithEmailAndPassword,
  isSignInWithEmailLink,
  sendEmailVerification,
  sendPasswordResetEmail,
  sendSignInLinkToEmail,
  signInWithEmailAndPassword,
  signInWithEmailLink,
  signInWithPopup,
} from 'firebase/auth';
import { getFirebaseAuth, googleProvider, MAGIC_LINK_EMAIL_KEY } from '../lib/firebase';
import { translateAuthError } from '../lib/auth-errors';

type EmailMode = 'entrar' | 'criar' | 'magic';
type Mode = EmailMode | 'recuperar';

const EMAIL_MODES: EmailMode[] = ['entrar', 'criar', 'magic'];
const EMAIL_MODE_LABEL: Record<EmailMode, string> = {
  entrar: 'Entrar',
  criar: 'Criar conta',
  magic: 'Link mágico',
};

interface AuthPanelProps {
  /** Título da seção (ex.: <h1>/<h2> com o texto de boas-vindas da tela). */
  heading: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
}

/**
 * Bloco de login reutilizável (onboarding e painel): Google, email/senha
 * (criar conta + entrar + recuperar senha) e link mágico. O backend não
 * muda — qualquer um dos métodos entrega o mesmo idToken do Firebase ao
 * FirebaseAuthGuard.
 */
export function AuthPanel({ heading, description, footer }: AuthPanelProps) {
  const [mode, setMode] = useState<Mode>('entrar');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  // AuthPanel só monta no cliente (a página-pai só o renderiza depois que o
  // próprio onAuthStateChanged resolve), então ler window aqui é seguro e
  // evita o "flash" do formulário antes do useEffect completar o link.
  const [completingMagicLink, setCompletingMagicLink] = useState(() =>
    isSignInWithEmailLink(getFirebaseAuth(), window.location.href),
  );

  // Se a URL atual é um link mágico do Firebase, completa o login com ela.
  // setState só dentro dos callbacks da promise — nunca síncrono no corpo
  // do efeito.
  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!isSignInWithEmailLink(auth, window.location.href)) return;
    const email =
      window.localStorage.getItem(MAGIC_LINK_EMAIL_KEY) ??
      window.prompt('Confirme o email usado para pedir o link de acesso:') ??
      '';
    signInWithEmailLink(auth, email, window.location.href)
      .then(() => {
        window.localStorage.removeItem(MAGIC_LINK_EMAIL_KEY);
        window.history.replaceState({}, '', window.location.pathname);
      })
      .catch((e: unknown) => setError(translateAuthError(e)))
      .finally(() => setCompletingMagicLink(false));
  }, []);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setSent(false);
    setPassword('');
  }

  async function loginWithGoogle() {
    setError(null);
    try {
      await signInWithPopup(getFirebaseAuth(), googleProvider);
    } catch (e) {
      setError(translateAuthError(e));
    }
  }

  async function handleEmailPassword(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const auth = getFirebaseAuth();
      if (mode === 'criar') {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        // Conta por senha nasce com o email não verificado, e a API recusa
        // esses tokens — manda a confirmação já na criação.
        await sendEmailVerification(cred.user);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (e) {
      setError(translateAuthError(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleMagicLink(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await sendSignInLinkToEmail(getFirebaseAuth(), email, {
        url: window.location.origin + window.location.pathname,
        handleCodeInApp: true,
      });
      window.localStorage.setItem(MAGIC_LINK_EMAIL_KEY, email);
      setSent(true);
    } catch (e) {
      setError(translateAuthError(e));
    } finally {
      setBusy(false);
    }
  }

  async function handlePasswordReset(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await sendPasswordResetEmail(getFirebaseAuth(), email);
      setSent(true);
    } catch (e) {
      setError(translateAuthError(e));
    } finally {
      setBusy(false);
    }
  }

  if (completingMagicLink) {
    return (
      <p className="font-serif italic text-[color:var(--color-ink-soft)]">
        Concluindo seu login…
      </p>
    );
  }

  return (
    <>
      {heading}
      {description}

      <button onClick={() => void loginWithGoogle()} className="btn-ink mt-8">
        <GoogleIcon />
        Entrar com Google
      </button>

      <div className="mt-8 flex items-center gap-3 text-xs text-[color:var(--color-ink-soft)]">
        <span className="h-px flex-1 bg-[color:var(--color-rule)]" />
        ou com email
        <span className="h-px flex-1 bg-[color:var(--color-rule)]" />
      </div>

      <div className="mt-6 flex gap-2">
        {EMAIL_MODES.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => switchMode(m)}
            className={`text-sm px-3 py-1.5 border rounded-full transition-colors ${
              mode === m
                ? 'bg-[color:var(--color-ink)] text-[color:var(--color-paper)] border-[color:var(--color-ink)]'
                : 'border-[color:var(--color-rule)] text-[color:var(--color-ink-soft)] hover:border-[color:var(--color-ink)]'
            }`}
          >
            {EMAIL_MODE_LABEL[m]}
          </button>
        ))}
      </div>

      {mode === 'recuperar' ? (
        sent ? (
          <p className="mt-6 text-sm text-[color:var(--color-ink-soft)]">
            Enviamos um link de redefinição para <strong>{email}</strong>. Confira sua caixa de
            entrada.
          </p>
        ) : (
          <form onSubmit={(e) => void handlePasswordReset(e)} className="mt-6 space-y-4">
            <label className="block">
              <span className="kicker">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input-editorial mt-2"
                autoFocus
              />
            </label>
            <div className="flex items-center gap-5">
              <button type="submit" disabled={busy} className="btn-clay">
                {busy ? 'Enviando…' : 'Enviar link de redefinição'}
              </button>
              <button
                type="button"
                onClick={() => switchMode('entrar')}
                className="text-xs link-editorial"
              >
                ← voltar
              </button>
            </div>
          </form>
        )
      ) : mode === 'magic' ? (
        sent ? (
          <p className="mt-6 text-sm text-[color:var(--color-ink-soft)]">
            Enviamos um link de acesso para <strong>{email}</strong>. Abra-o neste mesmo
            navegador para entrar.
          </p>
        ) : (
          <form onSubmit={(e) => void handleMagicLink(e)} className="mt-6 space-y-4">
            <label className="block">
              <span className="kicker">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input-editorial mt-2"
                autoFocus
              />
            </label>
            <button type="submit" disabled={busy} className="btn-clay">
              {busy ? 'Enviando…' : 'Enviar link de acesso'}
            </button>
          </form>
        )
      ) : (
        <form onSubmit={(e) => void handleEmailPassword(e)} className="mt-6 space-y-4">
          <label className="block">
            <span className="kicker">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="input-editorial mt-2"
              autoFocus
            />
          </label>
          <label className="block">
            <span className="kicker">Senha</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={mode === 'criar' ? 'new-password' : 'current-password'}
              className="input-editorial mt-2"
            />
          </label>
          <div className="flex items-center justify-between gap-5">
            <button type="submit" disabled={busy} className="btn-clay">
              {busy ? 'Aguarde…' : mode === 'criar' ? 'Criar conta' : 'Entrar'}
            </button>
            {mode === 'entrar' && (
              <button
                type="button"
                onClick={() => switchMode('recuperar')}
                className="text-xs link-editorial"
              >
                esqueci minha senha
              </button>
            )}
          </div>
        </form>
      )}

      {error && <p className="mt-5 text-sm text-[color:var(--color-clay-deep)]">{error}</p>}

      {footer}
    </>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path
        fill="#fff"
        d="M17.64 9.2c0-.64-.06-1.25-.17-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.71v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.61z"
      />
      <path
        fill="#fff"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.71H.96v2.33A9 9 0 0 0 9 18z"
        opacity="0.85"
      />
      <path
        fill="#fff"
        d="M3.97 10.71A5.4 5.4 0 0 1 3.68 9c0-.59.1-1.17.29-1.71V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.04l3.01-2.33z"
        opacity="0.7"
      />
      <path
        fill="#fff"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.47.89 11.43 0 9 0A9 9 0 0 0 .96 4.96l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"
        opacity="0.55"
      />
    </svg>
  );
}
