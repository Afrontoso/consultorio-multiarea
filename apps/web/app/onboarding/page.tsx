'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { CreateTenantSchema, type HealthCategory } from '@consultorio/contracts';
import { getFirebaseAuth } from '../../lib/firebase';
import { api, ApiError } from '../../lib/api';
import type { Me } from '../../lib/painel-types';
import { slugify } from '../../lib/slug';
import { AuthPanel } from '../../components/auth-panel';

const CATEGORIES: { value: HealthCategory; label: string }[] = [
  { value: 'PSICOLOGIA', label: 'Psicologia' },
  { value: 'FISIOTERAPIA', label: 'Fisioterapia' },
  { value: 'NUTRICAO', label: 'Nutrição' },
  { value: 'ODONTO', label: 'Odontologia' },
  { value: 'ESTETICA', label: 'Estética' },
  { value: 'TERAPIAS', label: 'Terapias integrativas' },
  { value: 'PERSONAL', label: 'Personal trainer' },
  { value: 'OUTROS', label: 'Outros' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  // Consultório existente do usuário logado: 'checking' até o /me responder.
  const [existing, setExisting] = useState<'checking' | 'none' | Me>('checking');

  const [manualSlug, setManualSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<HealthCategory>('PSICOLOGIA');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(getFirebaseAuth(), (u) => {
      setUser(u);
      setLoadingAuth(false);
      setExisting('checking');
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) return;
    let stale = false;
    api<Me>('/me')
      .then((me) => {
        if (!stale) setExisting(me);
      })
      .catch(() => {
        // 404 = sem consultório; outros erros caem no formulário mesmo
        // (o submit reporta o problema real).
        if (!stale) setExisting('none');
      });
    return () => {
      stale = true;
    };
  }, [user]);

  // Derivado no render: acompanha o nome até o usuário editar o campo.
  const slug = slugTouched ? manualSlug : slugify(name);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.email) {
      setError('Entre com Google primeiro.');
      return;
    }
    const parsed = CreateTenantSchema.safeParse({
      slug,
      name,
      category,
      ownerEmail: user.email,
      ownerName: user.displayName ?? user.email,
    });
    if (!parsed.success) {
      setError(parsed.error.errors.map((x) => x.message).join('; '));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const tenant = await api<{ slug: string }>('/tenants', {
        method: 'POST',
        body: JSON.stringify(parsed.data),
      });
      router.push(`/c/${tenant.slug}` as never);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen">
      <header className="border-b border-[color:var(--color-rule)]">
        <div className="mx-auto max-w-[1280px] px-6 md:px-10 py-5 flex items-center justify-between">
          <Link
            href="/"
            className="font-serif italic text-2xl tracking-tight text-[color:var(--color-ink)]"
          >
            ← Consultório
          </Link>
          <span className="kicker hidden sm:inline">Capítulo primeiro — abertura</span>
        </div>
      </header>

      <div className="mx-auto max-w-[1280px] px-6 md:px-10 py-16 md:py-24 grid grid-cols-12 gap-6 md:gap-12 stagger">
        {/* Left: literary column */}
        <aside className="col-span-12 md:col-span-5 md:pr-8 md:border-r md:border-[color:var(--color-rule)]">
          <p className="section-number">§ Prefácio</p>
          <h1 className="font-serif text-5xl md:text-[64px] leading-[1.02] tracking-[-0.02em] mt-3">
            Todo consultório
            <br />
            começa num{' '}
            <em className="text-[color:var(--color-moss)]">caderno</em>.
          </h1>
          <hr className="rule my-8 max-w-[120px]" />
          <p className="drop-cap font-serif text-lg leading-[1.6] text-[color:var(--color-ink-soft)] max-w-[36ch]">
            O seu começa aqui. Três campos, dois minutos, zero planilha. Depois disso a
            agenda é sua — você diz quem atende, quando, por quanto. A gente só guarda os
            horários e confirma os pacientes.
          </p>
          <div className="mt-10 flex items-start gap-4">
            <span className="seal">2026</span>
            <p className="text-sm text-[color:var(--color-ink-soft)] leading-relaxed max-w-[26ch]">
              <strong className="text-[color:var(--color-ink)] font-medium">Grátis</strong>{' '}
              até 30 agendamentos por mês. Sem cartão. Sem trial.
            </p>
          </div>
        </aside>

        {/* Right: form column */}
        <section className="col-span-12 md:col-span-7 md:pl-4">
          {loadingAuth ? (
            <p className="font-serif italic text-[color:var(--color-ink-soft)]">
              Folheando caderno…
            </p>
          ) : !user ? (
            <div className="max-w-md">
              <p className="section-number">§ 1</p>
              <AuthPanel
                heading={
                  <h2 className="font-serif text-4xl md:text-5xl mt-3 leading-[1.05] tracking-[-0.02em]">
                    Primeiro, quem é você?
                  </h2>
                }
                description={
                  <p className="mt-4 text-[color:var(--color-ink-soft)] leading-relaxed">
                    Entre com Google, email e senha, ou peça um link de acesso por email.
                  </p>
                }
                footer={
                  <p className="mt-10 text-xs text-[color:var(--color-ink-soft)] max-w-sm">
                    Ao continuar você concorda com os termos e a política de privacidade.
                    LGPD, sem letrinhas miúdas.
                  </p>
                }
              />
            </div>
          ) : existing === 'checking' ? (
            <p className="font-serif italic text-[color:var(--color-ink-soft)]">
              Conferindo seu caderno…
            </p>
          ) : existing !== 'none' ? (
            <div className="max-w-md">
              <p className="section-number">§ Já registrado</p>
              <h2 className="font-serif text-4xl md:text-5xl mt-3 leading-[1.05] tracking-[-0.02em]">
                Você já tem o{' '}
                <em className="text-[color:var(--color-moss)]">{existing.tenant.name}</em>.
              </h2>
              <p className="mt-4 text-[color:var(--color-ink-soft)] leading-relaxed max-w-[44ch]">
                Cada conta administra um consultório. Para abrir outro, entre com uma conta
                Google diferente.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link href="/painel" className="btn-clay">
                  Ir para o painel →
                </Link>
                <a href={`/c/${existing.tenant.slug}`} className="btn-ghost">
                  Ver página pública
                </a>
              </div>
              <button
                onClick={() => signOut(getFirebaseAuth())}
                className="text-xs link-editorial mt-8 block"
              >
                trocar conta ({user.email})
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="max-w-xl">
              <div className="flex items-center justify-between mb-10">
                <p className="kicker">
                  Logada como{' '}
                  <strong className="text-[color:var(--color-ink)]">{user.email}</strong>
                </p>
                <button
                  type="button"
                  onClick={() => signOut(getFirebaseAuth())}
                  className="text-xs link-editorial"
                >
                  trocar conta
                </button>
              </div>

              <div className="space-y-10">
                <label className="block">
                  <span className="kicker">01 · Nome do consultório</span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    minLength={2}
                    maxLength={120}
                    placeholder="Consultório da Ana"
                    className="input-editorial mt-2"
                    autoFocus
                  />
                </label>

                <label className="block">
                  <span className="kicker">02 · Endereço público</span>
                  <div className="mt-2 flex items-baseline gap-2 border-b border-[color:var(--color-rule)] focus-within:border-[color:var(--color-clay)]">
                    <span className="font-serif italic text-[color:var(--color-ink-soft)] text-lg">
                      consultorio.app/c/
                    </span>
                    <input
                      value={slug}
                      onChange={(e) => {
                        setManualSlug(slugify(e.target.value));
                        setSlugTouched(true);
                      }}
                      required
                      pattern="[a-z0-9-]{3,40}"
                      placeholder="ana-psi"
                      className="flex-1 bg-transparent border-0 focus:outline-none font-serif text-lg py-[10px] focus:ring-0"
                    />
                  </div>
                  <span className="text-xs text-[color:var(--color-ink-soft)] mt-1.5 inline-block">
                    3 a 40 caracteres. Letras minúsculas, números e hífen.
                  </span>
                </label>

                <label className="block">
                  <span className="kicker">03 · Qual a especialidade principal?</span>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as HealthCategory)}
                    className="select-editorial mt-2"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {error && (
                <p className="mt-8 text-sm text-[color:var(--color-clay-deep)] border-l-2 border-[color:var(--color-clay)] pl-3">
                  {error}
                </p>
              )}

              <div className="mt-12 flex items-center gap-4">
                <button type="submit" disabled={submitting} className="btn-clay">
                  {submitting ? 'Abrindo as portas…' : 'Abrir consultório'}
                  {!submitting && <span aria-hidden>→</span>}
                </button>
                <p className="text-xs text-[color:var(--color-ink-soft)] max-w-[24ch]">
                  Você pode mudar tudo depois. Nada é definitivo.
                </p>
              </div>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
