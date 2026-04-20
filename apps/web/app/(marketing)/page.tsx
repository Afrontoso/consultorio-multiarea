import Link from 'next/link';

const CATEGORIES = [
  'Psicologia',
  'Fisioterapia',
  'Nutrição',
  'Odontologia',
  'Estética',
  'Terapias integrativas',
  'Personal trainer',
];

const FEATURES = [
  {
    n: '01',
    title: 'Agenda que respeita o silêncio',
    body: 'Encaixes, reagendamentos e bloqueios num lugar só. Nada de planilha, nada de conversa perdida no WhatsApp.',
  },
  {
    n: '02',
    title: 'Paciente marca sozinho',
    body: 'Página pública com seus horários, serviços e preços. Compartilhe o link e receba agendamentos enquanto atende.',
  },
  {
    n: '03',
    title: 'Lembretes que funcionam',
    body: 'Confirmação por email sai no ato. WhatsApp no plano Pro reduz faltas em até 40% — quieto, simples, sem robô.',
  },
];

const STEPS = [
  ['Crie', 'em três minutos; sem cartão.'],
  ['Convide', 'profissionais e publique serviços.'],
  ['Compartilhe', 'o link da sua agenda e pronto.'],
];

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      {/* Masthead */}
      <header className="border-b border-[color:var(--color-rule)]">
        <div className="mx-auto max-w-[1280px] px-6 md:px-10 py-5 flex items-center justify-between gap-6">
          <div className="flex items-baseline gap-3 font-serif">
            <span className="text-2xl md:text-[28px] italic tracking-tight">Consultório</span>
            <span className="kicker hidden sm:inline">Nº 01 · Abril de 2026</span>
          </div>
          <nav className="flex items-center gap-6 text-sm">
            <Link href="#trabalho" className="link-editorial hidden md:inline">
              Como funciona
            </Link>
            <Link href="#planos" className="link-editorial hidden md:inline">
              Planos
            </Link>
            <Link href="/onboarding" className="btn-ghost">
              Entrar
            </Link>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section className="mx-auto max-w-[1280px] px-6 md:px-10 pt-16 md:pt-24 pb-20">
        <div className="grid grid-cols-12 gap-6 md:gap-10 items-end stagger">
          <div className="col-span-12 md:col-span-8">
            <p className="kicker mb-6">Agenda feita à mão para clínicas brasileiras</p>
            <h1 className="font-serif text-[clamp(2.6rem,8.5vw,7.4rem)] leading-[0.94] tracking-[-0.02em]">
              Um espaço{' '}
              <em className="italic text-[color:var(--color-moss)]">calmo</em>
              <br />
              para quem{' '}
              <span className="relative inline-block">
                cuida
                <svg
                  aria-hidden
                  viewBox="0 0 320 20"
                  className="absolute left-0 right-0 -bottom-3 w-full h-5"
                >
                  <path
                    d="M3 14 C 90 2, 220 22, 316 8"
                    stroke="var(--color-clay)"
                    strokeWidth="3"
                    fill="none"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              .
            </h1>
          </div>
          <div className="col-span-12 md:col-span-4 md:pl-8 md:border-l md:border-[color:var(--color-rule)]">
            <p className="font-serif italic text-lg md:text-xl text-[color:var(--color-ink-soft)] leading-snug">
              Agendamento online para psicólogas, fisioterapeutas, nutricionistas, dentistas,
              esteticistas e terapeutas que preferem atender a digitar.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/onboarding" className="btn-clay">
                Criar consultório
                <span aria-hidden>→</span>
              </Link>
              <Link href="#trabalho" className="btn-ghost">
                Ver como funciona
              </Link>
            </div>
            <p className="mt-5 text-xs text-[color:var(--color-ink-soft)]">
              Grátis até 30 agendamentos por mês. Sem cartão.
            </p>
          </div>
        </div>
      </section>

      {/* Categories ticker */}
      <section className="border-y border-[color:var(--color-rule)] bg-[color:var(--color-paper-soft)]">
        <div className="ticker py-5 overflow-hidden">
          <div className="ticker-track whitespace-nowrap">
            {[...CATEGORIES, ...CATEGORIES].map((c, i) => (
              <span
                key={i}
                className="font-serif italic text-2xl md:text-3xl text-[color:var(--color-ink)]"
              >
                {c} <span className="text-[color:var(--color-clay)]">✦</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="trabalho" className="mx-auto max-w-[1280px] px-6 md:px-10 py-24 md:py-32">
        <div className="grid grid-cols-12 gap-6 md:gap-10 mb-14 items-end">
          <div className="col-span-12 md:col-span-3">
            <p className="section-number">§ 01</p>
            <p className="kicker mt-2">O que você recebe</p>
          </div>
          <h2 className="col-span-12 md:col-span-9 font-serif text-4xl md:text-6xl tracking-[-0.02em]">
            Três peças que trabalham juntas{' '}
            <em className="text-[color:var(--color-moss)]">em silêncio</em>.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
          {FEATURES.map((f, i) => (
            <article
              key={f.n}
              className={`relative px-0 md:px-8 py-8 ${
                i !== 0 ? 'md:border-l border-[color:var(--color-rule)]' : ''
              }`}
            >
              <span className="section-number">{f.n}</span>
              <h3 className="font-serif text-2xl md:text-3xl mt-4 mb-4 leading-tight tracking-[-0.015em]">
                {f.title}
              </h3>
              <p className="drop-cap text-[15px] leading-[1.65] text-[color:var(--color-ink-soft)]">
                {f.body}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* STEPS */}
      <section className="border-t border-[color:var(--color-rule)]">
        <div className="mx-auto max-w-[1280px] px-6 md:px-10 py-24 md:py-32 grid grid-cols-12 gap-6 md:gap-10">
          <div className="col-span-12 md:col-span-4">
            <p className="section-number">§ 02</p>
            <p className="kicker mt-2">Três passos</p>
            <h2 className="font-serif text-4xl md:text-5xl mt-5 tracking-[-0.02em] leading-[1.03]">
              Tão <em className="text-[color:var(--color-clay)]">direto</em> quanto
              escrever um bilhete.
            </h2>
            <p className="mt-5 text-[color:var(--color-ink-soft)] leading-relaxed max-w-sm">
              Sem onboarding interminável. Sem vídeo obrigatório de 40 minutos. Sem ligar
              pro comercial.
            </p>
          </div>
          <ol className="col-span-12 md:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-8">
            {STEPS.map(([verb, rest], i) => (
              <li key={verb} className="relative">
                <div className="font-serif italic text-[80px] md:text-[110px] leading-none text-[color:var(--color-moss)]">
                  {String(i + 1).padStart(2, '0')}
                </div>
                <hr className="rule mt-2 mb-5" />
                <p className="font-serif text-2xl md:text-3xl tracking-[-0.01em]">
                  <em className="text-[color:var(--color-clay)] not-italic font-medium">
                    {verb}
                  </em>{' '}
                  <span className="text-[color:var(--color-ink-soft)]">{rest}</span>
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* QUOTE */}
      <section className="bg-[color:var(--color-moss)] text-[color:var(--color-paper)]">
        <div className="mx-auto max-w-[1280px] px-6 md:px-10 py-24 md:py-32 grid grid-cols-12 gap-6 md:gap-10">
          <p className="col-span-12 md:col-span-2 kicker text-[color:var(--color-sage)]">
            § 03 · Pulo do gato
          </p>
          <figure className="col-span-12 md:col-span-10">
            <blockquote className="font-serif text-3xl md:text-[52px] leading-[1.12] tracking-[-0.02em]">
              <span className="text-[color:var(--color-clay)] font-serif italic text-6xl md:text-7xl align-top mr-2">
                “
              </span>
              A única coisa que mudou foi a quantidade de{' '}
              <em>domingos livres</em>. Agora consigo fazer o almoço sem pensar na
              agenda de segunda.
            </blockquote>
            <figcaption className="mt-10 flex items-center gap-4 text-sm text-[color:var(--color-sage)]">
              <span className="w-10 h-[1px] bg-[color:var(--color-sage)]" />
              <span>
                <strong className="font-medium text-[color:var(--color-paper)]">
                  Juliana M.
                </strong>{' '}
                · psicóloga · São Paulo
              </span>
            </figcaption>
          </figure>
        </div>
      </section>

      {/* CTA */}
      <section id="planos" className="mx-auto max-w-[1280px] px-6 md:px-10 py-24 md:py-32">
        <div className="grid grid-cols-12 gap-6 md:gap-10 items-end">
          <div className="col-span-12 md:col-span-7">
            <p className="section-number">§ 04</p>
            <h2 className="font-serif text-5xl md:text-7xl mt-3 leading-[1.0] tracking-[-0.02em]">
              Comece hoje.
              <br />
              <em className="text-[color:var(--color-clay)]">Pague</em> quando fizer sentido.
            </h2>
          </div>
          <div className="col-span-12 md:col-span-5">
            <p className="text-[color:var(--color-ink-soft)] leading-relaxed mb-6">
              Grátis até 30 agendamentos/mês, para sempre. Planos pagos começam em{' '}
              <strong className="text-[color:var(--color-ink)]">R$ 39/mês</strong> e incluem
              agenda ilimitada, branding próprio e domínio custom.
            </p>
            <Link href="/onboarding" className="btn-clay">
              Criar meu consultório
              <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[color:var(--color-rule)]">
        <div className="mx-auto max-w-[1280px] px-6 md:px-10 py-10 flex flex-col md:flex-row items-start md:items-center gap-4 justify-between text-sm text-[color:var(--color-ink-soft)]">
          <div className="flex items-center gap-3">
            <span className="seal">c · m</span>
            <span className="font-serif italic text-lg">Consultório — Brasil, 2026</span>
          </div>
          <div className="flex gap-6">
            <a href="mailto:ola@consultorio.app" className="link-editorial">
              ola@consultorio.app
            </a>
            <Link href="/onboarding" className="link-editorial">
              Começar agora
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
