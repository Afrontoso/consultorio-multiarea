import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Consultório — agendamento online',
  description:
    'Agendamento online para consultórios multi-área: psicologia, fisioterapia, nutrição, estética e mais.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
