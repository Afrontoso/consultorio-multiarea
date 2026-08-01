'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../lib/api';
import { useAuthUser, useMe } from '../../lib/use-auth';
import type { PlanUsage } from '../../lib/painel-types';
import { AgendaSection } from './agenda-section';
import { PatientsSection } from './patients-section';
import { ProfessionalsSection } from './professionals-section';
import { ServicesSection } from './services-section';
import { AppHeader } from '../../components/app-header';
import { AuthPanel } from '../../components/auth-panel';
import { VerifyEmailNotice } from '../../components/verify-email-notice';

type Tab = 'agenda' | 'patients' | 'professionals' | 'services';

export default function PainelPage() {
  const router = useRouter();
  const { user, loading: loadingAuth, emailVerified, recheckEmail, resendVerification } =
    useAuthUser();
  const { me, missing: noTenant, error } = useMe(emailVerified ? user : null);
  const [tab, setTab] = useState<Tab>('agenda');
  const [usage, setUsage] = useState<PlanUsage | null>(null);

  useEffect(() => {
    if (!user || !emailVerified) return;
    // Aviso de limite do plano — falha silenciosa não bloqueia o painel.
    api<PlanUsage>('/appointments/usage')
      .then(setUsage)
      .catch(() => setUsage(null));
  }, [user, emailVerified]);

  useEffect(() => {
    if (me?.user.role === 'PROFESSIONAL') {
      router.replace('/profissional');
    }
  }, [me, router]);

  // Aviso a partir de 80% do limite mensal (planos ilimitados usam sentinela alta).
  const nearLimit =
    usage !== null && usage.limit <= 100_000 && usage.used >= Math.ceil(usage.limit * 0.8);

  return (
    <main className="min-h-screen">
      <AppHeader showSignOut={user !== null}>
        {me && (
          <a href={`/c/${me.tenant.slug}`} className="text-xs link-editorial truncate">
            ver página pública →
          </a>
        )}
      </AppHeader>

      <div className="mx-auto max-w-[1100px] px-6 md:px-10 py-12 md:py-16">
        {loadingAuth ? (
          <p className="font-serif italic text-[color:var(--color-ink-soft)]">
            Folheando caderno…
          </p>
        ) : !user ? (
          <div className="max-w-md py-12">
            <p className="section-number">§ Painel</p>
            <AuthPanel
              heading={
                <h1 className="font-serif text-4xl md:text-5xl mt-3 leading-[1.05] tracking-[-0.02em]">
                  Entre para abrir o caderno.
                </h1>
              }
            />
          </div>
        ) : !emailVerified ? (
          <VerifyEmailNotice
            user={user}
            section="Painel"
            onRecheck={recheckEmail}
            onResend={resendVerification}
          />
        ) : noTenant ? (
          <div className="max-w-md py-12">
            <p className="section-number">§ Painel</p>
            <h1 className="font-serif text-4xl md:text-5xl mt-3 leading-[1.05] tracking-[-0.02em]">
              Você ainda não tem um consultório.
            </h1>
            <Link href="/onboarding" className="btn-clay mt-8 inline-flex">
              Abrir meu consultório →
            </Link>
          </div>
        ) : !me ? (
          error ? (
            <p className="text-sm text-[color:var(--color-clay-deep)]">{error}</p>
          ) : (
            <p className="font-serif italic text-[color:var(--color-ink-soft)]">
              Carregando…
            </p>
          )
        ) : me.user.role === 'PROFESSIONAL' ? (
          <p className="font-serif italic text-[color:var(--color-ink-soft)]">
            Indo para sua agenda…
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-baseline justify-between gap-4">
              <div>
                <p className="kicker">Painel de administração</p>
                <h1 className="font-serif text-4xl md:text-[52px] leading-[1.02] tracking-[-0.02em] mt-2">
                  {me.tenant.name}
                </h1>
              </div>
              <p className="text-xs text-[color:var(--color-ink-soft)]">
                Plano {me.tenant.plan.code}
                {me.tenant.status === 'TRIAL' && me.tenant.trialEndsAt && (
                  <>
                    {' '}
                    · trial até{' '}
                    {new Date(me.tenant.trialEndsAt).toLocaleDateString('pt-BR')}
                  </>
                )}
              </p>
            </div>

            {nearLimit && usage && (
              <div className="mt-8 border border-[color:var(--color-clay)] bg-[color:var(--color-paper)] px-5 py-4">
                <p className="text-sm">
                  <span className="font-medium">
                    {usage.used}/{usage.limit} agendamentos
                  </span>{' '}
                  usados neste mês no plano {usage.planCode}.
                  {usage.used >= usage.limit
                    ? ' Limite atingido — novos agendamentos serão recusados até o próximo mês ou upgrade de plano.'
                    : ' Perto do limite: considere fazer upgrade para não recusar pacientes.'}
                </p>
              </div>
            )}

            <nav className="mt-10 flex gap-6 border-b border-[color:var(--color-rule)]">
              {(
                [
                  ['agenda', 'Agenda'],
                  ['patients', 'Pacientes'],
                  ['professionals', 'Profissionais'],
                  ['services', 'Serviços'],
                ] as [Tab, string][]
              ).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`pb-3 text-sm tracking-wide -mb-px border-b-2 transition-colors ${
                    tab === key
                      ? 'border-[color:var(--color-clay)] text-[color:var(--color-ink)]'
                      : 'border-transparent text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-ink)]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </nav>

            <div className="mt-10">
              {tab === 'agenda' && <AgendaSection />}
              {tab === 'patients' && <PatientsSection />}
              {tab === 'professionals' && <ProfessionalsSection me={me} />}
              {tab === 'services' && <ServicesSection />}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
