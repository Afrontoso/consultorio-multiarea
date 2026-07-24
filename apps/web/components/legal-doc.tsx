import type { ReactNode } from 'react';
import Link from 'next/link';
import { TERMS_VERSION } from '@consultorio/contracts';

/**
 * Layout compartilhado dos documentos legais (Termos de Uso e Política de
 * Privacidade). Exibe um banner de rascunho e a versão vigente dos termos,
 * que é a mesma gravada no consentimento do paciente.
 */
export function LegalDoc({
  kicker,
  title,
  updatedAt,
  children,
}: {
  kicker: string;
  title: string;
  updatedAt: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen">
      <header className="border-b border-[color:var(--color-rule)]">
        <div className="mx-auto max-w-[760px] px-6 md:px-10 py-5 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="font-serif italic text-2xl tracking-tight text-[color:var(--color-ink)]"
          >
            Consultório
          </Link>
          <div className="flex items-center gap-5 text-xs">
            <Link href="/termos" className="link-editorial">
              Termos
            </Link>
            <Link href="/privacidade" className="link-editorial">
              Privacidade
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[760px] px-6 md:px-10 py-12 md:py-16">
        <div
          role="note"
          className="mb-10 rounded-md border border-[color:var(--color-clay-deep)] px-4 py-3 text-sm text-[color:var(--color-clay-deep)]"
        >
          ⚠ Rascunho — este texto é um modelo inicial e precisa de revisão jurídica antes
          do uso com clientes reais.
        </div>

        <p className="section-number">§ {kicker}</p>
        <h1 className="font-serif text-4xl md:text-5xl mt-3 leading-[1.05] tracking-[-0.02em]">
          {title}
        </h1>
        <p className="mt-4 text-sm text-[color:var(--color-ink-soft)]">
          Versão {TERMS_VERSION} · atualizado em {updatedAt}
        </p>

        <div className="legal-body mt-10 space-y-8">{children}</div>

        <footer className="mt-16 pt-6 border-t border-[color:var(--color-rule)] text-xs text-[color:var(--color-ink-soft)]">
          Versão {TERMS_VERSION}. Ao usar o Consultório você adere a esta versão dos documentos.
        </footer>
      </div>
    </main>
  );
}

/** Seção padrão de um documento legal: título + conteúdo. */
export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="font-serif text-2xl tracking-tight text-[color:var(--color-ink)]">{title}</h2>
      <div className="mt-3 space-y-3 leading-relaxed text-[color:var(--color-ink-soft)]">
        {children}
      </div>
    </section>
  );
}
