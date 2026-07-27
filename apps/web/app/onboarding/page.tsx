'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signOut } from 'firebase/auth';
import { CreateTenantSchema, type HealthCategory } from '@consultorio/contracts';
import { getFirebaseAuth } from '../../lib/firebase';
import { api, ApiError } from '../../lib/api';
import { useAuthUser, useMe } from '../../lib/use-auth';
import type { Me } from '../../lib/painel-types';
import { slugify } from '../../lib/slug';
import { formatPhoneBR, phoneDigits } from '../../lib/phone';
import { centavosToNumber, formatMoneyBR, moneyDigits } from '../../lib/money';
import { WEEKDAY_LONG, hhmmToMinutes } from '../../lib/agenda';
import { AuthPanel } from '../../components/auth-panel';
import { VerifyEmailNotice } from '../../components/verify-email-notice';

const CATEGORIES: { value: HealthCategory; label: string }[] = [
  { value: 'PSICOLOGIA', label: 'Psicologia' },
  { value: 'FISIOTERAPIA', label: 'Fisioterapia' },
  { value: 'NUTRICAO', label: 'Nutrição' },
  { value: 'ODONTO', label: 'Odontologia' },
  { value: 'ESTETICA', label: 'Estética' },
  { value: 'TERAPIAS', label: 'Terapias integrativas' },
  { value: 'PERSONAL', label: 'Personal trainer' },
  { value: 'OUTROS', label: 'Outros' },
];

const PRO_COLORS = ['#3b82f6', '#2e4431', '#c16d4a', '#7c3aed', '#0d9488', '#b45309'];

// Segunda a domingo, como um caderno de semana.
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

const STEP_TITLES: Record<number, string> = {
  1: 'O consultório',
  2: 'O primeiro profissional',
  3: 'O primeiro serviço',
  4: 'Horários de atendimento',
  5: 'Publicar',
};

interface EditableRange {
  weekday: number;
  start: string;
  end: string;
}

function StepProgress({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-4 mb-8">
      <p className="kicker">
        Passo {step} de 5 · {STEP_TITLES[step]}
      </p>
      <div className="flex-1 flex gap-1.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <span
            key={s}
            className="h-[3px] flex-1"
            style={{
              background: s <= step ? 'var(--color-clay)' : 'var(--color-rule)',
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading: loadingAuth, emailVerified, recheckEmail, resendVerification } =
    useAuthUser();
  // Consultório existente do usuário logado: 'checking' até o /me responder.
  // 404 (sem consultório) e erro de rede caem os dois em 'none' — quem submete
  // recebe o problema real do servidor.
  const { me, missing, error: meError } = useMe(emailVerified ? user : null);
  const existing: 'checking' | 'none' | Me = me ?? (missing || meError ? 'none' : 'checking');

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Passo 1 — consultório
  const [manualSlug, setManualSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<HealthCategory>('PSICOLOGIA');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tenantSlug, setTenantSlug] = useState('');

  // Passo 2 — primeiro profissional
  const [proName, setProName] = useState('');
  const [proEmail, setProEmail] = useState('');
  const [proPhone, setProPhone] = useState('');
  const [proColor, setProColor] = useState(PRO_COLORS[0]);
  const [proBusy, setProBusy] = useState(false);
  const [proError, setProError] = useState<string | null>(null);
  const [professional, setProfessional] = useState<{ id: string; name: string } | null>(null);

  // Passo 3 — primeiro serviço
  const [svcName, setSvcName] = useState('');
  const [svcDuration, setSvcDuration] = useState('50');
  const [svcPrice, setSvcPrice] = useState('');
  const [svcBusy, setSvcBusy] = useState(false);
  const [svcError, setSvcError] = useState<string | null>(null);
  const [service, setService] = useState<{ id: string; name: string } | null>(null);

  // Passo 4 — horários
  const [ranges, setRanges] = useState<EditableRange[]>([]);
  const [hoursBusy, setHoursBusy] = useState(false);
  const [hoursError, setHoursError] = useState<string | null>(null);
  const [hoursSaved, setHoursSaved] = useState(false);

  // Derivado no render: acompanha o nome até o usuário editar o campo.
  const slug = slugTouched ? manualSlug : slugify(name);

  async function handleTenantSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.email) {
      setError('Entre com Google primeiro.');
      return;
    }
    // O dono sai do token no servidor — nada de email no corpo.
    const parsed = CreateTenantSchema.safeParse({ slug, name, category });
    if (!parsed.success) {
      setError(parsed.error.errors.map((x) => x.message).join('; '));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const tenant = await api<{ slug: string }>('/tenants', {
        method: 'POST',
        body: JSON.stringify(parsed.data),
      });
      setTenantSlug(tenant.slug);
      setProName(user.displayName ?? '');
      setProEmail(user.email ?? '');
      setStep(2);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleProfessionalSubmit(e: React.FormEvent) {
    e.preventDefault();
    setProBusy(true);
    setProError(null);
    try {
      const created = await api<{ id: string; name: string }>('/professionals', {
        method: 'POST',
        body: JSON.stringify({
          name: proName,
          email: proEmail,
          phone: proPhone || undefined,
          color: proColor,
          serviceIds: [],
        }),
      });
      setProfessional({ id: created.id, name: created.name });
      setStep(3);
    } catch (err) {
      setProError(err instanceof ApiError ? err.message : (err as Error).message);
    } finally {
      setProBusy(false);
    }
  }

  async function handleServiceSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSvcBusy(true);
    setSvcError(null);
    try {
      const created = await api<{ id: string; name: string }>('/services', {
        method: 'POST',
        body: JSON.stringify({
          name: svcName,
          duration: Number(svcDuration),
          price: centavosToNumber(svcPrice),
          professionalIds: professional ? [professional.id] : [],
        }),
      });
      setService({ id: created.id, name: created.name });
      setStep(professional ? 4 : 5);
    } catch (err) {
      setSvcError(err instanceof ApiError ? err.message : (err as Error).message);
    } finally {
      setSvcBusy(false);
    }
  }

  function addRange(weekday: number) {
    setHoursSaved(false);
    setRanges((prev) => [...prev, { weekday, start: '09:00', end: '18:00' }]);
  }

  function updateRange(index: number, patch: Partial<EditableRange>) {
    setHoursSaved(false);
    setRanges((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function removeRange(index: number) {
    setHoursSaved(false);
    setRanges((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleHoursSave() {
    if (!professional) return;
    setHoursBusy(true);
    setHoursError(null);
    try {
      const payload = ranges.map((r) => ({
        weekday: r.weekday,
        startMinute: hhmmToMinutes(r.start),
        endMinute: hhmmToMinutes(r.end),
      }));
      await api(`/professionals/${professional.id}/working-hours`, {
        method: 'PUT',
        body: JSON.stringify({ ranges: payload }),
      });
      setHoursSaved(true);
      setStep(5);
    } catch (err) {
      setHoursError(err instanceof ApiError ? err.message : (err as Error).message);
    } finally {
      setHoursBusy(false);
    }
  }

  return (
    <main className="min-h-screen">
      <header className="border-b border-[color:var(--color-rule)]">
        <div className="mx-auto max-w-[1280px] px-6 md:px-10 py-5 flex items-center justify-between">
          <Link
            href="/"
            className="font-serif italic text-2xl tracking-tight text-[color:var(--color-ink)]"
          >
            ← Consultório
          </Link>
          <span className="kicker hidden sm:inline">Capítulo primeiro — abertura</span>
        </div>
      </header>

      <div className="mx-auto max-w-[1280px] px-6 md:px-10 py-16 md:py-24 grid grid-cols-12 gap-6 md:gap-12 stagger">
        {/* Left: literary column */}
        <aside className="col-span-12 md:col-span-5 md:pr-8 md:border-r md:border-[color:var(--color-rule)]">
          <p className="section-number">§ Prefácio</p>
          <h1 className="font-serif text-5xl md:text-[64px] leading-[1.02] tracking-[-0.02em] mt-3">
            Todo consultório
            <br />
            começa num{' '}
            <em className="text-[color:var(--color-moss)]">caderno</em>.
          </h1>
          <hr className="rule my-8 max-w-[120px]" />
          <p className="drop-cap font-serif text-lg leading-[1.6] text-[color:var(--color-ink-soft)] max-w-[36ch]">
            O seu começa aqui. Três campos, dois minutos, zero planilha. Depois disso a
            agenda é sua — você diz quem atende, quando, por quanto. A gente só guarda os
            horários e confirma os pacientes.
          </p>
          <div className="mt-10 flex items-start gap-4">
            <span className="seal">2026</span>
            <p className="text-sm text-[color:var(--color-ink-soft)] leading-relaxed max-w-[26ch]">
              <strong className="text-[color:var(--color-ink)] font-medium">Grátis</strong>{' '}
              até 30 agendamentos por mês. Sem cartão. Sem trial.
            </p>
          </div>
        </aside>

        {/* Right: form column */}
        <section className="col-span-12 md:col-span-7 md:pl-4">
          {loadingAuth ? (
            <p className="font-serif italic text-[color:var(--color-ink-soft)]">
              Folheando caderno…
            </p>
          ) : !user ? (
            <div className="max-w-md">
              <p className="section-number">§ 1</p>
              <AuthPanel
                heading={
                  <h2 className="font-serif text-4xl md:text-5xl mt-3 leading-[1.05] tracking-[-0.02em]">
                    Primeiro, quem é você?
                  </h2>
                }
                description={
                  <p className="mt-4 text-[color:var(--color-ink-soft)] leading-relaxed">
                    Entre com Google, email e senha, ou peça um link de acesso por email.
                  </p>
                }
                footer={
                  <p className="mt-10 text-xs text-[color:var(--color-ink-soft)] max-w-sm">
                    Ao continuar você concorda com os{' '}
                    <Link href="/termos" target="_blank" className="link-editorial">
                      Termos de Uso
                    </Link>{' '}
                    e a{' '}
                    <Link href="/privacidade" target="_blank" className="link-editorial">
                      Política de Privacidade
                    </Link>
                    . LGPD, sem letrinhas miúdas.
                  </p>
                }
              />
            </div>
          ) : !emailVerified ? (
            <VerifyEmailNotice
              user={user}
              section="1"
              onRecheck={recheckEmail}
              onResend={resendVerification}
            />
          ) : existing === 'checking' ? (
            <p className="font-serif italic text-[color:var(--color-ink-soft)]">
              Conferindo seu caderno…
            </p>
          ) : existing !== 'none' ? (
            <div className="max-w-md">
              <p className="section-number">§ Já registrado</p>
              <h2 className="font-serif text-4xl md:text-5xl mt-3 leading-[1.05] tracking-[-0.02em]">
                Você já tem o{' '}
                <em className="text-[color:var(--color-moss)]">{existing.tenant.name}</em>.
              </h2>
              <p className="mt-4 text-[color:var(--color-ink-soft)] leading-relaxed max-w-[44ch]">
                Cada conta administra um consultório. Para abrir outro, entre com uma conta
                Google diferente.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link href="/painel" className="btn-clay">
                  Ir para o painel →
                </Link>
                <a href={`/c/${existing.tenant.slug}`} className="btn-ghost">
                  Ver página pública
                </a>
              </div>
              <button
                onClick={() => signOut(getFirebaseAuth())}
                className="text-xs link-editorial mt-8 block"
              >
                trocar conta ({user.email})
              </button>
            </div>
          ) : (
            <div className="max-w-xl">
              <StepProgress step={step} />

              {step === 1 && (
                <form onSubmit={handleTenantSubmit}>
                  <div className="flex items-center justify-between mb-8">
                    <p className="text-xs text-[color:var(--color-ink-soft)]">
                      Logada como{' '}
                      <strong className="text-[color:var(--color-ink)]">{user.email}</strong>
                    </p>
                    <button
                      type="button"
                      onClick={() => signOut(getFirebaseAuth())}
                      className="text-xs link-editorial"
                    >
                      trocar conta
                    </button>
                  </div>

                  <div className="space-y-10">
                    <label className="block">
                      <span className="kicker">Nome do consultório</span>
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        minLength={2}
                        maxLength={120}
                        placeholder="Consultório da Ana"
                        className="input-editorial mt-2"
                        autoFocus
                      />
                    </label>

                    <label className="block">
                      <span className="kicker">Endereço público</span>
                      <div className="mt-2 flex items-baseline gap-2 border-b border-[color:var(--color-rule)] focus-within:border-[color:var(--color-clay)]">
                        <span className="font-serif italic text-[color:var(--color-ink-soft)] text-lg">
                          consultorio.app/c/
                        </span>
                        <input
                          value={slug}
                          onChange={(e) => {
                            setManualSlug(slugify(e.target.value));
                            setSlugTouched(true);
                          }}
                          required
                          pattern="[a-z0-9-]{3,40}"
                          placeholder="ana-psi"
                          className="flex-1 bg-transparent border-0 focus:outline-none font-serif text-lg py-[10px] focus:ring-0"
                        />
                      </div>
                      <span className="text-xs text-[color:var(--color-ink-soft)] mt-1.5 inline-block">
                        3 a 40 caracteres. Letras minúsculas, números e hífen.
                      </span>
                    </label>

                    <label className="block">
                      <span className="kicker">Qual a especialidade principal?</span>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value as HealthCategory)}
                        className="select-editorial mt-2"
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  {error && (
                    <p className="mt-8 text-sm text-[color:var(--color-clay-deep)] border-l-2 border-[color:var(--color-clay)] pl-3">
                      {error}
                    </p>
                  )}

                  <div className="mt-12 flex items-center gap-4">
                    <button type="submit" disabled={submitting} className="btn-clay">
                      {submitting ? 'Abrindo as portas…' : 'Continuar'}
                      {!submitting && <span aria-hidden>→</span>}
                    </button>
                    <p className="text-xs text-[color:var(--color-ink-soft)] max-w-[24ch]">
                      Você pode mudar tudo depois. Nada é definitivo.
                    </p>
                  </div>
                </form>
              )}

              {step === 2 && (
                <form onSubmit={handleProfessionalSubmit}>
                  <p className="text-sm text-[color:var(--color-ink-soft)] max-w-[52ch] mb-8">
                    Pode ser você mesma. Dá pra adicionar o resto da equipe depois, no painel.
                  </p>
                  <div className="space-y-8">
                    <label className="block">
                      <span className="kicker">Nome</span>
                      <input
                        value={proName}
                        onChange={(e) => setProName(e.target.value)}
                        required
                        minLength={2}
                        maxLength={120}
                        placeholder="Dra. Ana Souza"
                        className="input-editorial mt-2"
                        autoFocus
                      />
                    </label>
                    <label className="block">
                      <span className="kicker">Email</span>
                      <input
                        type="email"
                        value={proEmail}
                        onChange={(e) => setProEmail(e.target.value)}
                        required
                        placeholder="ana@exemplo.com"
                        className="input-editorial mt-2"
                      />
                    </label>
                    <label className="block">
                      <span className="kicker">Telefone (opcional)</span>
                      <input
                        type="tel"
                        value={formatPhoneBR(proPhone)}
                        onChange={(e) => setProPhone(phoneDigits(e.target.value))}
                        maxLength={16}
                        placeholder="(11) 99999-0000"
                        className="input-editorial mt-2"
                      />
                    </label>
                    <div>
                      <span className="kicker">Cor na agenda</span>
                      <div className="mt-3 flex gap-3">
                        {PRO_COLORS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setProColor(c)}
                            aria-label={`Cor ${c}`}
                            className="h-8 w-8 rounded-full border-2"
                            style={{
                              background: c,
                              borderColor: proColor === c ? 'var(--color-ink)' : 'transparent',
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {proError && (
                    <p className="mt-8 text-sm text-[color:var(--color-clay-deep)] border-l-2 border-[color:var(--color-clay)] pl-3">
                      {proError}
                    </p>
                  )}

                  <div className="mt-12 flex items-center gap-4">
                    <button type="submit" disabled={proBusy} className="btn-clay">
                      {proBusy ? 'Salvando…' : 'Continuar'}
                      {!proBusy && <span aria-hidden>→</span>}
                    </button>
                    <button type="button" onClick={() => setStep(3)} className="btn-ghost">
                      Pular por enquanto
                    </button>
                  </div>
                </form>
              )}

              {step === 3 && (
                <form onSubmit={handleServiceSubmit}>
                  <p className="text-sm text-[color:var(--color-ink-soft)] max-w-[52ch] mb-8">
                    O que os pacientes vão poder agendar. Só o essencial — nome, duração e preço.
                  </p>
                  <div className="space-y-8">
                    <label className="block">
                      <span className="kicker">Nome do serviço</span>
                      <input
                        value={svcName}
                        onChange={(e) => setSvcName(e.target.value)}
                        required
                        minLength={2}
                        maxLength={120}
                        placeholder="Sessão de psicoterapia"
                        className="input-editorial mt-2"
                        autoFocus
                      />
                    </label>
                    <div className="grid grid-cols-2 gap-6">
                      <label className="block">
                        <span className="kicker">Duração (min)</span>
                        <input
                          type="number"
                          value={svcDuration}
                          onChange={(e) => setSvcDuration(e.target.value)}
                          required
                          min={5}
                          max={480}
                          step={5}
                          className="input-editorial mt-2"
                        />
                      </label>
                      <label className="block">
                        <span className="kicker">Preço (R$)</span>
                        <input
                          inputMode="numeric"
                          value={formatMoneyBR(svcPrice)}
                          onChange={(e) => setSvcPrice(moneyDigits(e.target.value))}
                          required
                          placeholder="180,00"
                          className="input-editorial mt-2"
                        />
                      </label>
                    </div>
                  </div>

                  {svcError && (
                    <p className="mt-8 text-sm text-[color:var(--color-clay-deep)] border-l-2 border-[color:var(--color-clay)] pl-3">
                      {svcError}
                    </p>
                  )}

                  <div className="mt-12 flex items-center gap-4">
                    <button type="submit" disabled={svcBusy} className="btn-clay">
                      {svcBusy ? 'Salvando…' : 'Continuar'}
                      {!svcBusy && <span aria-hidden>→</span>}
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep(professional ? 4 : 5)}
                      className="btn-ghost"
                    >
                      Pular por enquanto
                    </button>
                  </div>
                </form>
              )}

              {step === 4 &&
                (!professional ? (
                  <div>
                    <p className="text-sm text-[color:var(--color-ink-soft)] max-w-[52ch] mb-8">
                      Sem um profissional cadastrado ainda não dá pra definir horários. Adicione
                      um no painel quando quiser.
                    </p>
                    <button onClick={() => setStep(5)} className="btn-clay">
                      Continuar <span aria-hidden>→</span>
                    </button>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-[color:var(--color-ink-soft)] max-w-[52ch] mb-8">
                      Horários de {professional.name}. Definem quais faixas aparecem na página
                      pública de agendamento — sem faixas em um dia, o dia não abre para
                      pacientes.
                    </p>

                    <ul className="divide-y divide-[color:var(--color-rule)] border-t border-b border-[color:var(--color-rule)]">
                      {WEEKDAY_ORDER.map((weekday) => {
                        const dayRanges = ranges
                          .map((r, index) => ({ ...r, index }))
                          .filter((r) => r.weekday === weekday);
                        return (
                          <li key={weekday} className="py-4">
                            <div className="flex items-baseline justify-between gap-4">
                              <p className="font-medium text-sm">{WEEKDAY_LONG[weekday]}</p>
                              <button
                                type="button"
                                onClick={() => addRange(weekday)}
                                className="text-xs link-editorial"
                              >
                                + faixa
                              </button>
                            </div>
                            {dayRanges.length === 0 ? (
                              <p className="text-sm italic text-[color:var(--color-ink-soft)] mt-1">
                                fechado
                              </p>
                            ) : (
                              <div className="mt-2 space-y-2">
                                {dayRanges.map((r) => (
                                  <div key={r.index} className="flex items-center gap-2">
                                    <input
                                      type="time"
                                      value={r.start}
                                      onChange={(e) =>
                                        updateRange(r.index, { start: e.target.value })
                                      }
                                      className="input-editorial text-sm py-1 w-28"
                                    />
                                    <span className="text-sm text-[color:var(--color-ink-soft)]">
                                      até
                                    </span>
                                    <input
                                      type="time"
                                      value={r.end}
                                      onChange={(e) =>
                                        updateRange(r.index, { end: e.target.value })
                                      }
                                      className="input-editorial text-sm py-1 w-28"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => removeRange(r.index)}
                                      className="text-xs text-[color:var(--color-clay-deep)] link-editorial"
                                    >
                                      remover
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>

                    {hoursError && (
                      <p className="mt-6 text-sm text-[color:var(--color-clay-deep)] border-l-2 border-[color:var(--color-clay)] pl-3">
                        {hoursError}
                      </p>
                    )}

                    <div className="mt-8 flex items-center gap-4">
                      <button
                        type="button"
                        onClick={handleHoursSave}
                        disabled={hoursBusy}
                        className="btn-clay"
                      >
                        {hoursBusy ? 'Salvando…' : 'Continuar'}
                        {!hoursBusy && <span aria-hidden>→</span>}
                      </button>
                      <button type="button" onClick={() => setStep(5)} className="btn-ghost">
                        Pular por enquanto
                      </button>
                    </div>
                  </div>
                ))}

              {step === 5 && (
                <div>
                  <h2 className="font-serif text-4xl md:text-5xl leading-[1.05] tracking-[-0.02em]">
                    Pronto. As portas estão{' '}
                    <em className="text-[color:var(--color-moss)]">abertas</em>.
                  </h2>

                  <ul className="mt-8 space-y-3 text-sm">
                    <li className="flex items-baseline gap-2">
                      <span className="text-[color:var(--color-moss)]">✓</span>
                      <span>
                        Consultório <strong>{name}</strong> · consultorio.app/c/{tenantSlug}
                      </span>
                    </li>
                    <li className="flex items-baseline gap-2">
                      <span
                        className={
                          professional
                            ? 'text-[color:var(--color-moss)]'
                            : 'text-[color:var(--color-ink-soft)]'
                        }
                      >
                        {professional ? '✓' : '·'}
                      </span>
                      <span>
                        {professional
                          ? `Profissional ${professional.name} cadastrado`
                          : 'Nenhum profissional ainda — adicione no painel'}
                      </span>
                    </li>
                    <li className="flex items-baseline gap-2">
                      <span
                        className={
                          service
                            ? 'text-[color:var(--color-moss)]'
                            : 'text-[color:var(--color-ink-soft)]'
                        }
                      >
                        {service ? '✓' : '·'}
                      </span>
                      <span>
                        {service
                          ? `Serviço ${service.name} cadastrado`
                          : 'Nenhum serviço ainda — adicione no painel'}
                      </span>
                    </li>
                    <li className="flex items-baseline gap-2">
                      <span
                        className={
                          hoursSaved
                            ? 'text-[color:var(--color-moss)]'
                            : 'text-[color:var(--color-ink-soft)]'
                        }
                      >
                        {hoursSaved ? '✓' : '·'}
                      </span>
                      <span>
                        {hoursSaved
                          ? 'Horários de atendimento definidos'
                          : 'Horários ainda não definidos — a agenda pública fica fechada até lá'}
                      </span>
                    </li>
                  </ul>

                  <div className="mt-12 flex flex-wrap items-center gap-4">
                    <button onClick={() => router.push('/painel')} className="btn-clay">
                      Ir para o painel <span aria-hidden>→</span>
                    </button>
                    <a href={`/c/${tenantSlug}`} className="btn-ghost">
                      Ver página pública
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
