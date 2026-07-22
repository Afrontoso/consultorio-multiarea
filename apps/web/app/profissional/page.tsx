'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { getFirebaseAuth } from '../../lib/firebase';
import { api, ApiError } from '../../lib/api';
import type { Me } from '../../lib/painel-types';
import { AuthPanel } from '../../components/auth-panel';
import { MyAgendaSection } from './my-agenda-section';
import { MyBlocksSection } from './my-blocks-section';

type Tab = 'agenda' | 'bloqueios';

export default function ProfissionalPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [me, setMe] = useState<Me | null>(null);
  const [noTenant, setNoTenant] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('agenda');

  useEffect(() => {
    const unsub = onAuthStateChanged(getFirebaseAuth(), (u) => {
      setUser(u);
      setLoadingAuth(false);
      setError(null);
      if (!u) {
        setMe(null);
        setNoTenant(false);
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) return;
    api<Me>('/me')
      .then(setMe)
      .catch((e) => {
        if (e instanceof ApiError && e.status === 404) setNoTenant(true);
        else setError((e as Error).message);
      });
  }, [user]);

  useEffect(() => {
    if (me && me.user.role !== 'PROFESSIONAL') {
      router.replace('/painel');
    }
  }, [me, router]);

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
          {user && (
            <button
              onClick={() => signOut(getFirebaseAuth())}
              className="text-xs link-editorial shrink-0"
            >
              sair
            </button>
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
            <p className="section-number">§ Minha agenda</p>
            <AuthPanel
              heading={
                <h1 className="font-serif text-4xl md:text-5xl mt-3 leading-[1.05] tracking-[-0.02em]">
                  Entre para ver sua agenda.
                </h1>
              }
            />
          </div>
        ) : noTenant ? (
          <div className="max-w-md py-12">
            <p className="section-number">§ Minha agenda</p>
            <h1 className="font-serif text-4xl md:text-5xl mt-3 leading-[1.05] tracking-[-0.02em]">
              Nenhum convite encontrado para este email.
            </h1>
            <p className="mt-4 text-[color:var(--color-ink-soft)] leading-relaxed max-w-[44ch]">
              Peça para o dono do consultório te convidar pelo painel de administração.
            </p>
          </div>
        ) : !me ? (
          error ? (
            <p className="text-sm text-[color:var(--color-clay-deep)]">{error}</p>
          ) : (
            <p className="font-serif italic text-[color:var(--color-ink-soft)]">Carregando…</p>
          )
        ) : me.user.role !== 'PROFESSIONAL' ? (
          <p className="font-serif italic text-[color:var(--color-ink-soft)]">
            Indo para o painel…
          </p>
        ) : (
          <>
            <div>
              <p className="kicker">Minha agenda</p>
              <h1 className="font-serif text-4xl md:text-[52px] leading-[1.02] tracking-[-0.02em] mt-2">
                {me.tenant.name}
              </h1>
            </div>

            <nav className="mt-10 flex gap-6 border-b border-[color:var(--color-rule)]">
              {(
                [
                  ['agenda', 'Agenda'],
                  ['bloqueios', 'Bloqueios'],
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
              {tab === 'agenda' && <MyAgendaSection />}
              {tab === 'bloqueios' && <MyBlocksSection />}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
