'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthUser, useMe } from '../../lib/use-auth';
import { AppHeader } from '../../components/app-header';
import { AuthPanel } from '../../components/auth-panel';
import { VerifyEmailNotice } from '../../components/verify-email-notice';
import { PatientAgendaSection } from './patient-agenda-section';

export default function PacientePage() {
  const router = useRouter();
  const { user, loading: loadingAuth, emailVerified, recheckEmail, resendVerification } =
    useAuthUser();
  const { me, missing: noAccount, error } = useMe(emailVerified ? user : null);

  useEffect(() => {
    if (me && me.user.role !== 'PATIENT') {
      router.replace('/');
    }
  }, [me, router]);

  return (
    <main className="min-h-screen">
      <AppHeader showSignOut={user !== null} />

      <div className="mx-auto max-w-[1100px] px-6 md:px-10 py-12 md:py-16">
        {loadingAuth ? (
          <p className="font-serif italic text-[color:var(--color-ink-soft)]">Carregando…</p>
        ) : !user ? (
          <div className="max-w-md py-12">
            <p className="section-number">§ Minhas consultas</p>
            <AuthPanel
              heading={
                <h1 className="font-serif text-4xl md:text-5xl mt-3 leading-[1.05] tracking-[-0.02em]">
                  Entre para ver suas consultas.
                </h1>
              }
            />
          </div>
        ) : !emailVerified ? (
          <VerifyEmailNotice
            user={user}
            section="Minhas consultas"
            onRecheck={recheckEmail}
            onResend={resendVerification}
          />
        ) : noAccount ? (
          <div className="max-w-md py-12">
            <p className="section-number">§ Minhas consultas</p>
            <h1 className="font-serif text-4xl md:text-5xl mt-3 leading-[1.05] tracking-[-0.02em]">
              Nenhum convite encontrado para este email.
            </h1>
            <p className="mt-4 text-[color:var(--color-ink-soft)] leading-relaxed max-w-[44ch]">
              Peça para o consultório te convidar para acessar suas consultas por aqui.
            </p>
          </div>
        ) : !me ? (
          error ? (
            <p className="text-sm text-[color:var(--color-clay-deep)]">{error}</p>
          ) : (
            <p className="font-serif italic text-[color:var(--color-ink-soft)]">Carregando…</p>
          )
        ) : me.user.role !== 'PATIENT' ? (
          <p className="font-serif italic text-[color:var(--color-ink-soft)]">Redirecionando…</p>
        ) : (
          <>
            <div>
              <p className="kicker">Minhas consultas</p>
              <h1 className="font-serif text-4xl md:text-[52px] leading-[1.02] tracking-[-0.02em] mt-2">
                {me.tenant.name}
              </h1>
            </div>

            <div className="mt-10">
              <PatientAgendaSection tenantSlug={me.tenant.slug} />
            </div>
          </>
        )}
      </div>
    </main>
  );
}
