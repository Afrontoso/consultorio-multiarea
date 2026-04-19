import { headers } from 'next/headers';

export default async function TenantHomePage() {
  const h = await headers();
  const slug = h.get('x-tenant-slug');

  return (
    <main className="min-h-screen px-6 py-12 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold">Consultório: {slug}</h1>
      <p className="mt-2 text-[hsl(var(--muted-foreground))]">
        Esta é a página pública do consultório. A partir daqui o paciente agenda a consulta.
      </p>
      <a
        href={`/c/${slug}/agendar`}
        className="mt-6 inline-flex items-center rounded-md bg-[hsl(var(--color-brand))] text-white px-5 py-3 font-medium"
      >
        Agendar consulta
      </a>
    </main>
  );
}
