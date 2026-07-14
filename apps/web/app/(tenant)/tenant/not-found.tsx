import { headers } from 'next/headers';

// Boundary do notFound() da vitrine: slug inexistente ou tenant suspenso/cancelado.
export default async function TenantNotFound() {
  const h = await headers();
  const slug = h.get('x-tenant-slug') ?? '';

  return (
    <main className="min-h-screen">
      <header className="border-b border-[color:var(--color-rule)]">
        <div className="mx-auto max-w-[1100px] px-6 md:px-10 py-5 flex items-center justify-between">
          <span className="font-serif italic text-xl text-[color:var(--color-ink)]">
            Consultório
          </span>
          {slug && <span className="kicker">/c/{slug}</span>}
        </div>
      </header>

      <section className="mx-auto max-w-[1100px] px-6 md:px-10 py-20 md:py-28 stagger">
        <p className="section-number">§ Não encontrado</p>
        <h1 className="font-serif text-5xl md:text-7xl leading-[0.98] tracking-[-0.02em] mt-4">
          Este consultório{' '}
          <span className="italic text-[color:var(--color-clay-deep)]">não existe</span>
        </h1>
        <hr className="rule my-8 max-w-[160px]" />
        <p className="font-serif text-lg md:text-xl max-w-[48ch] leading-[1.6] text-[color:var(--color-ink-soft)]">
          Confira o endereço com quem enviou o link — ou, se o consultório é seu, publique-o
          criando uma conta.
        </p>
        <a href="/onboarding" className="btn-ghost mt-10 inline-flex">
          Criar meu consultório
        </a>
      </section>
    </main>
  );
}
