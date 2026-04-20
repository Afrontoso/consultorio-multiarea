'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { CreateTenantSchema, type HealthCategory } from '@consultorio/contracts';
import { getFirebaseAuth, googleProvider } from '../../lib/firebase';
import { api, ApiError } from '../../lib/api';

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

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40);
}

export default function OnboardingPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<HealthCategory>('PSICOLOGIA');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(getFirebaseAuth(), (u) => {
      setUser(u);
      setLoadingAuth(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!slugTouched && name) setSlug(slugify(name));
  }, [name, slugTouched]);

  async function loginWithGoogle() {
    setError(null);
    try {
      await signInWithPopup(getFirebaseAuth(), googleProvider);
    } catch (e) {
      setError((e as Error).message);
    }
  }

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
              <h2 className="font-serif text-4xl md:text-5xl mt-3 leading-[1.05] tracking-[-0.02em]">
                Primeiro, quem é você?
              </h2>
              <p className="mt-4 text-[color:var(--color-ink-soft)] leading-relaxed">
                Usamos sua conta Google só pra guardar sua sessão. Nada é publicado, nada é
                compartilhado.
              </p>
              <button onClick={loginWithGoogle} className="btn-ink mt-8">
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
                Entrar com Google
              </button>
              {error && (
                <p className="mt-5 text-sm text-[color:var(--color-clay-deep)]">{error}</p>
              )}
              <p className="mt-10 text-xs text-[color:var(--color-ink-soft)] max-w-sm">
                Ao continuar você concorda com os termos e a política de privacidade. LGPD,
                sem letrinhas miúdas.
              </p>
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
                        setSlug(slugify(e.target.value));
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
