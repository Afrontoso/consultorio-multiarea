'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { getFirebaseAuth, googleProvider } from '../../lib/firebase';
import { api, ApiError } from '../../lib/api';
import type { Me } from '../../lib/painel-types';
import { ProfessionalsSection } from './professionals-section';
import { ServicesSection } from './services-section';

type Tab = 'professionals' | 'services';

export default function PainelPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [me, setMe] = useState<Me | null>(null);
  const [noTenant, setNoTenant] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('professionals');

  useEffect(() => {
    const unsub = onAuthStateChanged(getFirebaseAuth(), (u) => {
      setUser(u);
      setLoadingAuth(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) {
      setMe(null);
      setNoTenant(false);
      return;
    }
    setError(null);
    api<Me>('/me')
      .then(setMe)
      .catch((e) => {
        if (e instanceof ApiError && e.status === 404) setNoTenant(true);
        else setError((e as Error).message);
      });
  }, [user]);

  async function loginWithGoogle() {
    setError(null);
    try {
      await signInWithPopup(getFirebaseAuth(), googleProvider);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <main className="min-h-screen">
      <header className="border-b border-[color:var(--color-rule)]">
        <div className="mx-auto max-w-[1100px] px-6 md:px-10 py-5 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="font-serif italic text-2xl tracking-tight text-[color:var(--color-ink)]"
          >
            Consultório
          </Link>
          {me && (
            <div className="flex items-center gap-5 min-w-0">
              <a href={`/c/${me.tenant.slug}`} className="text-xs link-editorial truncate">
                ver página pública →
              </a>
              <button
                onClick={() => signOut(getFirebaseAuth())}
                className="text-xs link-editorial shrink-0"
              >
                sair
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-[1100px] px-6 md:px-10 py-12 md:py-16">
        {loadingAuth ? (
          <p className="font-serif italic text-[color:var(--color-ink-soft)]">
            Folheando caderno…
          </p>
        ) : !user ? (
          <div className="max-w-md py-12">
            <p className="section-number">§ Painel</p>
            <h1 className="font-serif text-4xl md:text-5xl mt-3 leading-[1.05] tracking-[-0.02em]">
              Entre para abrir o caderno.
            </h1>
            <button onClick={loginWithGoogle} className="btn-ink mt-8">
              Entrar com Google
            </button>
            {error && (
              <p className="mt-5 text-sm text-[color:var(--color-clay-deep)]">{error}</p>
            )}
          </div>
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

            <nav className="mt-10 flex gap-6 border-b border-[color:var(--color-rule)]">
              {(
                [
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
              {tab === 'professionals' ? <ProfessionalsSection me={me} /> : <ServicesSection />}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
