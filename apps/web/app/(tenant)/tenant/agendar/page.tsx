import { headers } from 'next/headers';
import { BookingFlow } from './booking-flow';

export default async function AgendarPage() {
  const h = await headers();
  const slug = h.get('x-tenant-slug') ?? 'consultorio';

  return (
    <main className="min-h-screen">
      <header className="border-b border-[color:var(--color-rule)]">
        <div className="mx-auto max-w-[1100px] px-6 md:px-10 py-5 flex items-center justify-between">
          <a href={`/c/${slug}`} className="font-serif italic text-xl text-[color:var(--color-ink)]">
            Consultório
          </a>
          <span className="kicker">/c/{slug}</span>
        </div>
      </header>

      <section className="mx-auto max-w-[720px] px-6 md:px-10 py-14 md:py-20">
        <BookingFlow slug={slug} />
      </section>
    </main>
  );
}
