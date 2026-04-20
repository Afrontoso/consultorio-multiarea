'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
  { value: 'TERAPIAS', label: 'Terapias' },
  { value: 'PERSONAL', label: 'Personal trainer' },
  { value: 'OUTROS', label: 'Outros' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [slug, setSlug] = useState('');
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
      setError('Faça login primeiro.');
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
      router.push(`/c/${tenant.slug}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : (e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingAuth) {
    return <main className="p-10 text-center text-[hsl(var(--muted-foreground))]">Carregando…</main>;
  }

  if (!user) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6">
        <div className="max-w-md w-full space-y-4 text-center">
          <h1 className="text-2xl font-semibold">Criar seu consultório</h1>
          <p className="text-[hsl(var(--muted-foreground))]">
            Entre com o Google para começar. Grátis até 30 agendamentos/mês.
          </p>
          <button
            onClick={loginWithGoogle}
            className="w-full rounded-md bg-[hsl(var(--color-brand))] text-white py-3 font-medium"
          >
            Entrar com Google
          </button>
          {error && <p className="text-red-600 text-sm">{error}</p>}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex justify-center px-6 py-12">
      <form onSubmit={handleSubmit} className="max-w-md w-full space-y-5">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">Criar consultório</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Logado como <strong>{user.email}</strong> ·{' '}
            <button
              type="button"
              onClick={() => signOut(getFirebaseAuth())}
              className="underline"
            >
              sair
            </button>
          </p>
        </header>

        <label className="block space-y-1">
          <span className="text-sm font-medium">Nome do consultório</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
            maxLength={120}
            className="w-full rounded-md border px-3 py-2"
            placeholder="Consultório da Ana"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium">Slug público</span>
          <div className="flex items-center gap-2">
            <span className="text-sm text-[hsl(var(--muted-foreground))]">/c/</span>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase())}
              required
              pattern="[a-z0-9-]{3,40}"
              className="flex-1 rounded-md border px-3 py-2"
              placeholder="ana-psi"
            />
          </div>
          <span className="text-xs text-[hsl(var(--muted-foreground))]">
            Seus pacientes vão acessar <code>/c/{slug || 'seu-slug'}/agendar</code>.
          </span>
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium">Especialidade</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as HealthCategory)}
            className="w-full rounded-md border px-3 py-2"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-[hsl(var(--color-brand))] text-white py-3 font-medium disabled:opacity-60"
        >
          {submitting ? 'Criando…' : 'Criar consultório'}
        </button>
      </form>
    </main>
  );
}
