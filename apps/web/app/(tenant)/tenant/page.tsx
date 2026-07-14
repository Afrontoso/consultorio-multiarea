import { headers } from 'next/headers';
import { notFound } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333/v1';

interface PublicProfile {
  tenant: { slug: string; name: string; category: string };
  professionals: {
    id: string;
    name: string;
    bio: string | null;
    photoUrl: string | null;
    color: string;
  }[];
  services: {
    id: string;
    name: string;
    description: string | null;
    duration: number;
    price: number;
  }[];
}

const CATEGORY_LABEL: Record<string, string> = {
  PSICOLOGIA: 'Psicologia',
  FISIOTERAPIA: 'Fisioterapia',
  NUTRICAO: 'Nutrição',
  ODONTO: 'Odontologia',
  ESTETICA: 'Estética',
  TERAPIAS: 'Terapias',
  PERSONAL: 'Personal trainer',
  OUTROS: 'Saúde e bem-estar',
};

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

async function fetchProfile(slug: string): Promise<PublicProfile | null> {
  const res = await fetch(`${API_URL}/public/tenants/${slug}`, { cache: 'no-store' });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Falha ao carregar o consultório (${res.status})`);
  return (await res.json()) as PublicProfile;
}

function TenantHeader({ slug }: { slug: string }) {
  return (
    <header className="border-b border-[color:var(--color-rule)]">
      <div className="mx-auto max-w-[1100px] px-6 md:px-10 py-5 flex items-center justify-between">
        <span className="font-serif italic text-xl text-[color:var(--color-ink)]">
          Consultório
        </span>
        <span className="kicker">/c/{slug}</span>
      </div>
    </header>
  );
}

export default async function TenantHomePage() {
  const h = await headers();
  const slug = h.get('x-tenant-slug') ?? 'consultorio';
  const profile = await fetchProfile(slug);
  if (!profile) notFound();

  const { tenant, professionals, services } = profile;

  return (
    <main className="min-h-screen">
      <TenantHeader slug={slug} />

      <section className="mx-auto max-w-[1100px] px-6 md:px-10 py-20 md:py-28 stagger">
        <p className="section-number">§ {CATEGORY_LABEL[tenant.category] ?? 'Saúde'}</p>
        <h1 className="font-serif text-5xl md:text-[92px] leading-[0.98] tracking-[-0.02em] mt-4">
          <span className="italic text-[color:var(--color-moss)]">{tenant.name}</span>
        </h1>
        <hr className="rule my-8 max-w-[160px]" />
        <p className="drop-cap font-serif text-lg md:text-xl max-w-[48ch] leading-[1.6] text-[color:var(--color-ink-soft)]">
          Escolha o serviço, o profissional e o horário que funcionam para você. A confirmação
          é imediata.
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

        <div className="mt-24 grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-16 border-t border-[color:var(--color-rule)] pt-12">
          <div>
            <p className="kicker">Profissionais</p>
            {professionals.length === 0 ? (
              <p className="font-serif italic text-xl mt-4 text-[color:var(--color-ink-soft)]">
                em breve
              </p>
            ) : (
              <ul className="mt-6 divide-y divide-[color:var(--color-rule)]">
                {professionals.map((p) => (
                  <li key={p.id} className="py-5 flex items-center gap-4">
                    {p.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- foto externa do profissional, domínio não previsível
                      <img
                        src={p.photoUrl}
                        alt={p.name}
                        className="h-12 w-12 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <span
                        aria-hidden
                        className="h-12 w-12 rounded-full shrink-0 flex items-center justify-center font-serif italic text-lg text-[color:var(--color-paper)]"
                        style={{ backgroundColor: p.color }}
                      >
                        {p.name.charAt(0)}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="font-medium">{p.name}</p>
                      {p.bio && (
                        <p className="text-sm text-[color:var(--color-ink-soft)] line-clamp-2">
                          {p.bio}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <p className="kicker">Serviços</p>
            {services.length === 0 ? (
              <p className="font-serif italic text-xl mt-4 text-[color:var(--color-ink-soft)]">
                em breve
              </p>
            ) : (
              <ul className="mt-6 divide-y divide-[color:var(--color-rule)]">
                {services.map((s) => (
                  <li key={s.id} className="py-5 flex items-baseline gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{s.name}</p>
                      <p className="text-sm text-[color:var(--color-ink-soft)]">
                        {s.duration} min
                        {s.description ? ` · ${s.description}` : ''}
                      </p>
                    </div>
                    <span className="font-serif italic text-lg shrink-0">
                      {formatBRL(s.price)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
