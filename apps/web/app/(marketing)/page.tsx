export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <div className="max-w-2xl space-y-6">
        <span className="inline-block rounded-full border px-3 py-1 text-xs text-muted-foreground">
          Beta — grátis para os primeiros consultórios
        </span>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
          Agenda online para o seu consultório, sem planilha e sem complicação.
        </h1>
        <p className="text-lg text-[hsl(var(--muted-foreground))]">
          Psicologia, fisioterapia, nutrição, estética, terapias e personal. Pacientes agendam
          sozinhos, você cuida do atendimento.
        </p>
        <div className="flex gap-3 justify-center">
          <a
            href="/onboarding"
            className="inline-flex items-center rounded-md bg-[hsl(var(--color-brand))] text-white px-5 py-3 font-medium hover:opacity-90"
          >
            Criar consultório grátis
          </a>
          <a
            href="#como-funciona"
            className="inline-flex items-center rounded-md border px-5 py-3 font-medium hover:bg-[hsl(var(--muted))]"
          >
            Como funciona
          </a>
        </div>
      </div>
    </main>
  );
}
