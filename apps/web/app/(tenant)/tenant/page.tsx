import { headers } from 'next/headers';

export default async function TenantHomePage() {
  const h = await headers();
  const slug = h.get('x-tenant-slug') ?? 'consultorio';

  return (
    <main className="min-h-screen">
      <header className="border-b border-[color:var(--color-rule)]">
        <div className="mx-auto max-w-[1100px] px-6 md:px-10 py-5 flex items-center justify-between">
          <span className="font-serif italic text-xl text-[color:var(--color-ink)]">
            Consultório
          </span>
          <span className="kicker">/c/{slug}</span>
        </div>
      </header>

      <section className="mx-auto max-w-[1100px] px-6 md:px-10 py-20 md:py-28 stagger">
        <p className="section-number">§ Página pública</p>
        <h1 className="font-serif text-5xl md:text-[92px] leading-[0.98] tracking-[-0.02em] mt-4">
          <span className="italic text-[color:var(--color-moss)]">{slug}</span>
        </h1>
        <hr className="rule my-8 max-w-[160px]" />
        <p className="drop-cap font-serif text-lg md:text-xl max-w-[48ch] leading-[1.6] text-[color:var(--color-ink-soft)]">
          Esta é a vitrine da sua agenda. A partir daqui seus pacientes escolhem serviço,
          profissional e horário. Personalização (logo, cor, biografia) vem nos próximos
          capítulos do roadmap.
        </p>

        <div className="mt-14 flex flex-wrap items-center gap-4">
          <a href={`/c/${slug}/agendar`} className="btn-clay">
            Agendar consulta
            <span aria-hidden>→</span>
          </a>
          <a href="/painel" className="btn-ghost">
            Entrar no painel
          </a>
        </div>

        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-0 border-t border-[color:var(--color-rule)]">
          {[
            ['Profissionais', 'em breve'],
            ['Serviços', 'em breve'],
            ['Horários', 'em breve'],
          ].map(([t, v], i) => (
            <div
              key={t}
              className={`py-6 ${i !== 0 ? 'md:border-l md:pl-8' : 'md:pr-8'} border-[color:var(--color-rule)]`}
            >
              <p className="kicker">{t}</p>
              <p className="font-serif italic text-2xl mt-2 text-[color:var(--color-ink-soft)]">
                {v}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
