'use client';

import { useState } from 'react';
import type { User } from 'firebase/auth';

interface VerifyEmailNoticeProps {
  user: User;
  section: string;
  onRecheck: () => Promise<void>;
  onResend: () => Promise<void>;
}

/**
 * Tela de espera para quem criou conta por email/senha e ainda não confirmou o
 * endereço. A API recusa esses tokens (só o email verificado prova posse da
 * caixa postal), então não adianta deixar seguir — melhor explicar e dar o
 * caminho: reenviar o link ou reconferir depois de abri-lo.
 */
export function VerifyEmailNotice({
  user,
  section,
  onRecheck,
  onResend,
}: VerifyEmailNoticeProps) {
  const [busy, setBusy] = useState<'recheck' | 'resend' | null>(null);
  const [resent, setResent] = useState(false);
  const [stillUnverified, setStillUnverified] = useState(false);

  async function recheck() {
    setBusy('recheck');
    setStillUnverified(false);
    try {
      await onRecheck();
      // Se tivesse confirmado, a página já teria trocado de estado.
      setStillUnverified(true);
    } finally {
      setBusy(null);
    }
  }

  async function resend() {
    setBusy('resend');
    try {
      await onResend();
      setResent(true);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="max-w-md py-12">
      <p className="section-number">§ {section}</p>
      <h1 className="font-serif text-4xl md:text-5xl mt-3 leading-[1.05] tracking-[-0.02em]">
        Confirme seu email.
      </h1>
      <p className="mt-4 text-[color:var(--color-ink-soft)] leading-relaxed max-w-[44ch]">
        Enviamos um link de confirmação para <strong>{user.email}</strong>. Abra-o e volte aqui
        — só depois disso sua conta pode acessar os dados do consultório.
      </p>
      <div className="mt-8 flex flex-wrap items-center gap-5">
        <button onClick={() => void recheck()} disabled={busy !== null} className="btn-clay">
          {busy === 'recheck' ? 'Conferindo…' : 'Já confirmei'}
        </button>
        <button
          onClick={() => void resend()}
          disabled={busy !== null}
          className="text-xs link-editorial"
        >
          {busy === 'resend' ? 'Enviando…' : 'reenviar o link'}
        </button>
      </div>
      {resent && (
        <p className="mt-5 text-sm text-[color:var(--color-ink-soft)]">
          Link reenviado. Confira também a caixa de spam.
        </p>
      )}
      {stillUnverified && (
        <p className="mt-5 text-sm text-[color:var(--color-clay-deep)]">
          Ainda não consta como confirmado. Abra o link do email e tente de novo.
        </p>
      )}
    </div>
  );
}
