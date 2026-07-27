'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { signOut } from 'firebase/auth';
import { getFirebaseAuth } from '../lib/firebase';

interface AppHeaderProps {
  /** Marca à esquerda. A plataforma usa "Consultório · plataforma". */
  brand?: string;
  /** A marca vira link para a home, exceto no painel da plataforma. */
  linkHome?: boolean;
  /** Mostra o "sair" (só faz sentido com sessão). */
  showSignOut: boolean;
  /** Extras à direita, antes do "sair" (ex.: ver página pública). */
  children?: ReactNode;
}

/** Cabeçalho comum das telas autenticadas. */
export function AppHeader({
  brand = 'Consultório',
  linkHome = true,
  showSignOut,
  children,
}: AppHeaderProps) {
  const brandClass =
    'font-serif italic text-2xl tracking-tight text-[color:var(--color-ink)]';
  return (
    <header className="border-b border-[color:var(--color-rule)]">
      <div className="mx-auto max-w-[1100px] px-6 md:px-10 py-5 flex items-center justify-between gap-4">
        {linkHome ? (
          <Link href="/" className={brandClass}>
            {brand}
          </Link>
        ) : (
          <span className={brandClass}>{brand}</span>
        )}
        {(children || showSignOut) && (
          <div className="flex items-center gap-5 min-w-0">
            {children}
            {showSignOut && (
              <button
                onClick={() => void signOut(getFirebaseAuth())}
                className="text-xs link-editorial shrink-0"
              >
                sair
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
