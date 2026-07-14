'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '../../../../lib/api';

interface BookingProfessional {
  id: string;
  name: string;
  bio: string | null;
  photoUrl: string | null;
  color: string;
}

interface BookingService {
  id: string;
  name: string;
  description: string | null;
  duration: number;
  price: number;
  professionals: BookingProfessional[];
}

interface Catalog {
  tenant: { slug: string; name: string; category: string; utcOffsetMinutes: number };
  services: BookingService[];
}

interface AvailabilityResponse {
  date: string;
  slots: string[];
}

type Step = 'servico' | 'profissional' | 'horario' | 'dados' | 'revisao' | 'sucesso';

const STEP_LABEL: Record<Exclude<Step, 'sucesso'>, string> = {
  servico: 'Serviço',
  profissional: 'Profissional',
  horario: 'Data e horário',
  dados: 'Seus dados',
  revisao: 'Confirmação',
};

const STEP_ORDER: Exclude<Step, 'sucesso'>[] = [
  'servico',
  'profissional',
  'horario',
  'dados',
  'revisao',
];

const DAYS_AHEAD = 14;

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Componentes de data "hoje" no fuso do consultório. */
function shiftedNow(utcOffsetMinutes: number) {
  return new Date(Date.now() + utcOffsetMinutes * 60_000);
}

function toIsoDay(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** Próximos N dias (YYYY-MM-DD) a partir de hoje no fuso do consultório. */
function upcomingDays(utcOffsetMinutes: number) {
  const base = shiftedNow(utcOffsetMinutes);
  return Array.from({ length: DAYS_AHEAD }, (_, i) =>
    toIsoDay(new Date(base.getTime() + i * 24 * 60 * 60 * 1000)),
  );
}

function dayLabel(isoDay: string, style: 'short' | 'long') {
  const [y, m, d] = isoDay.split('-').map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!)).toLocaleDateString('pt-BR', {
    timeZone: 'UTC',
    ...(style === 'short'
      ? { weekday: 'short', day: '2-digit', month: '2-digit' }
      : { weekday: 'long', day: 'numeric', month: 'long' }),
  });
}

/** HH:MM de um instante UTC no fuso do consultório. */
function slotTime(iso: string, utcOffsetMinutes: number) {
  const d = new Date(new Date(iso).getTime() + utcOffsetMinutes * 60_000);
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function BookingFlow({ slug }: { slug: string }) {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [step, setStep] = useState<Step>('servico');
  const [service, setService] = useState<BookingService | null>(null);
  const [professional, setProfessional] = useState<BookingProfessional | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [patient, setPatient] = useState({ name: '', phone: '', email: '' });

  const [slots, setSlots] = useState<string[] | null>(null);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    api<Catalog>(`/public/tenants/${slug}/booking`, { authed: false })
      .then(setCatalog)
      .catch((e) =>
        setLoadError(
          e instanceof ApiError && e.status === 404
            ? 'Consultório não encontrado.'
            : 'Não foi possível carregar a agenda. Tente novamente em instantes.',
        ),
      );
  }, [slug]);

  // Não limpa slotsError nem slots aqui: o aviso de "slot ocupado" do 409
  // precisa sobreviver ao refetch, e quem invalida a lista são os handlers
  // de evento (troca de dia/serviço/profissional e o próprio 409, que ao
  // voltar o step para 'horario' já dispara este efeito de novo).
  useEffect(() => {
    if (step !== 'horario' || !day || !service || !professional) return;
    let stale = false;
    api<AvailabilityResponse>(
      `/public/tenants/${slug}/availability?professionalId=${professional.id}&serviceId=${service.id}&date=${day}`,
      { authed: false },
    )
      .then((res) => {
        if (!stale) setSlots(res.slots);
      })
      .catch((e) => {
        if (stale) return;
        setSlotsError(e instanceof ApiError ? e.message : 'Erro ao buscar horários.');
        setSlots([]);
      });
    return () => {
      stale = true;
    };
  }, [step, day, service, professional, slug]);

  function chooseService(s: BookingService) {
    setService(s);
    setSlot(null);
    setSlots(null);
    setSlotsError(null);
    if (s.professionals.length === 1) {
      setProfessional(s.professionals[0]!);
      setStep('horario');
    } else {
      setProfessional(null);
      setStep('profissional');
    }
  }

  function chooseProfessional(p: BookingProfessional) {
    setProfessional(p);
    setSlot(null);
    setSlots(null);
    setSlotsError(null);
    setStep('horario');
  }

  function goBack() {
    setSubmitError(null);
    if (step === 'profissional') setStep('servico');
    else if (step === 'horario')
      setStep(service && service.professionals.length > 1 ? 'profissional' : 'servico');
    else if (step === 'dados') setStep('horario');
    else if (step === 'revisao') setStep('dados');
  }

  async function confirm() {
    if (!service || !professional || !slot) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await api(`/public/tenants/${slug}/appointments`, {
        method: 'POST',
        authed: false,
        body: JSON.stringify({
          date: slot,
          professionalId: professional.id,
          serviceId: service.id,
          patient: {
            name: patient.name,
            phone: patient.phone,
            ...(patient.email && { email: patient.email }),
          },
        }),
      });
      setStep('sucesso');
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        // Slot ocupado no meio do fluxo: volta para a escolha de horário;
        // a mudança de step dispara o refetch dos slots.
        setSlot(null);
        setSlots(null);
        setStep('horario');
        setSlotsError('Esse horário acabou de ser ocupado. Escolha outro, por favor.');
      } else if (e instanceof ApiError && e.status === 403) {
        setSubmitError(
          'A agenda deste consultório atingiu o limite de agendamentos do mês. Entre em contato diretamente com o consultório.',
        );
      } else {
        setSubmitError(
          e instanceof ApiError ? e.message : 'Não foi possível confirmar. Tente novamente.',
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loadError) {
    return (
      <div className="stagger">
        <p className="section-number">§ Agendamento</p>
        <h1 className="font-serif text-4xl mt-4">Ops.</h1>
        <p className="mt-6 font-serif italic text-lg text-[color:var(--color-ink-soft)]">
          {loadError}
        </p>
      </div>
    );
  }

  if (!catalog) {
    return (
      <p className="font-serif italic text-[color:var(--color-ink-soft)]">Carregando agenda…</p>
    );
  }

  const offset = catalog.tenant.utcOffsetMinutes;

  if (step === 'sucesso') {
    return (
      <div className="stagger">
        <p className="section-number">§ Tudo certo</p>
        <h1 className="font-serif text-4xl md:text-5xl mt-4 tracking-[-0.02em]">
          Consulta <span className="italic text-[color:var(--color-moss)]">confirmada</span>
        </h1>
        <hr className="rule my-8 max-w-[160px]" />
        <Summary
          tenantName={catalog.tenant.name}
          service={service!}
          professional={professional!}
          day={day!}
          slot={slot!}
          offset={offset}
          patientName={patient.name}
        />
        <p className="mt-8 text-sm text-[color:var(--color-ink-soft)]">
          Guarde a data. Em caso de imprevisto, entre em contato com o consultório.
        </p>
        <a href={`/c/${slug}`} className="btn-ghost mt-8 inline-flex">
          ← Voltar à página do consultório
        </a>
      </div>
    );
  }

  // Com um único profissional o passo "Profissional" é pulado, mas o total
  // fica fixo em 5 para o contador não mudar no meio do fluxo.
  const stepIndex = STEP_ORDER.indexOf(step);

  return (
    <div>
      <p className="section-number">§ Agendar consulta</p>
      <h1 className="font-serif text-4xl md:text-5xl mt-4 tracking-[-0.02em]">
        {catalog.tenant.name || slug}
      </h1>
      <p className="kicker mt-6">
        Passo {stepIndex + 1} de {STEP_ORDER.length} — {STEP_LABEL[step]}
      </p>
      <hr className="rule mt-3 mb-10 max-w-[160px]" />

      {step !== 'servico' && (
        <button onClick={goBack} className="text-xs link-editorial mb-6 block">
          ← voltar
        </button>
      )}

      {step === 'servico' && (
        <div>
          {catalog.services.length === 0 ? (
            <p className="font-serif italic text-[color:var(--color-ink-soft)]">
              Este consultório ainda não publicou serviços para agendamento online.
            </p>
          ) : (
            <ul className="divide-y divide-[color:var(--color-rule)] border-t border-b border-[color:var(--color-rule)]">
              {catalog.services.map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => chooseService(s)}
                    className="w-full text-left py-5 flex items-baseline gap-4 hover:bg-[color:var(--color-paper-soft)] transition-colors px-2 -mx-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{s.name}</p>
                      <p className="text-sm text-[color:var(--color-ink-soft)]">
                        {s.duration} min · {formatBRL(s.price)}
                        {s.description ? ` · ${s.description}` : ''}
                      </p>
                    </div>
                    <span aria-hidden className="text-[color:var(--color-clay)]">
                      →
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {step === 'profissional' && service && (
        <ul className="divide-y divide-[color:var(--color-rule)] border-t border-b border-[color:var(--color-rule)]">
          {service.professionals.map((p) => (
            <li key={p.id}>
              <button
                onClick={() => chooseProfessional(p)}
                className="w-full text-left py-5 flex items-center gap-4 hover:bg-[color:var(--color-paper-soft)] transition-colors px-2 -mx-2"
              >
                <span
                  aria-hidden
                  className="inline-block h-3 w-3 rounded-full shrink-0"
                  style={{ backgroundColor: p.color }}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{p.name}</p>
                  {p.bio && (
                    <p className="text-sm text-[color:var(--color-ink-soft)] truncate">{p.bio}</p>
                  )}
                </div>
                <span aria-hidden className="text-[color:var(--color-clay)]">
                  →
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {step === 'horario' && service && professional && (
        <div>
          <p className="text-sm text-[color:var(--color-ink-soft)]">
            {service.name} · {service.duration} min · com {professional.name}
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            {upcomingDays(offset).map((d) => {
              const active = d === day;
              return (
                <button
                  key={d}
                  onClick={() => {
                    setDay(d);
                    setSlot(null);
                    setSlotsError(null);
                  }}
                  className={`text-sm px-3 py-1.5 border rounded-full transition-colors capitalize ${
                    active
                      ? 'bg-[color:var(--color-ink)] text-[color:var(--color-paper)] border-[color:var(--color-ink)]'
                      : 'border-[color:var(--color-rule)] text-[color:var(--color-ink-soft)] hover:border-[color:var(--color-ink)]'
                  }`}
                >
                  {dayLabel(d, 'short')}
                </button>
              );
            })}
          </div>

          {slotsError && (
            <p className="mt-6 text-sm text-[color:var(--color-clay-deep)]">{slotsError}</p>
          )}

          {day && (
            <div className="mt-8">
              <p className="kicker capitalize">{dayLabel(day, 'long')}</p>
              {slots === null ? (
                <p className="mt-4 font-serif italic text-[color:var(--color-ink-soft)]">
                  Buscando horários…
                </p>
              ) : slots.length === 0 ? (
                !slotsError && (
                  <p className="mt-4 font-serif italic text-[color:var(--color-ink-soft)]">
                    Sem horários livres neste dia. Tente outra data.
                  </p>
                )
              ) : (
                <div className="mt-4 flex flex-wrap gap-2">
                  {slots.map((s) => {
                    const active = s === slot;
                    return (
                      <button
                        key={s}
                        onClick={() => setSlot(s)}
                        className={`text-sm px-4 py-2 border transition-colors ${
                          active
                            ? 'bg-[color:var(--color-moss)] text-[color:var(--color-paper)] border-[color:var(--color-moss)]'
                            : 'border-[color:var(--color-rule)] hover:border-[color:var(--color-ink)]'
                        }`}
                      >
                        {slotTime(s, offset)}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => setStep('dados')}
            disabled={!slot}
            className="btn-clay mt-10 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Continuar <span aria-hidden>→</span>
          </button>
        </div>
      )}

      {step === 'dados' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setStep('revisao');
          }}
          className="space-y-6 max-w-md"
        >
          <label className="block">
            <span className="kicker">Nome completo</span>
            <input
              value={patient.name}
              onChange={(e) => setPatient({ ...patient, name: e.target.value })}
              required
              minLength={2}
              maxLength={120}
              placeholder="Maria da Silva"
              className="input-editorial mt-2"
              autoFocus
            />
          </label>
          <label className="block">
            <span className="kicker">Telefone (WhatsApp)</span>
            <input
              type="tel"
              value={patient.phone}
              onChange={(e) => setPatient({ ...patient, phone: e.target.value })}
              required
              minLength={8}
              maxLength={20}
              placeholder="(11) 99999-0000"
              className="input-editorial mt-2"
            />
          </label>
          <label className="block">
            <span className="kicker">Email (opcional)</span>
            <input
              type="email"
              value={patient.email}
              onChange={(e) => setPatient({ ...patient, email: e.target.value })}
              maxLength={254}
              placeholder="maria@email.com"
              className="input-editorial mt-2"
            />
          </label>
          <p className="text-xs text-[color:var(--color-ink-soft)]">
            Se você já é paciente, usaremos seu telefone para reconhecer o cadastro.
          </p>
          <button type="submit" className="btn-clay">
            Revisar agendamento <span aria-hidden>→</span>
          </button>
        </form>
      )}

      {step === 'revisao' && service && professional && day && slot && (
        <div>
          <Summary
            tenantName={catalog.tenant.name}
            service={service}
            professional={professional}
            day={day}
            slot={slot}
            offset={offset}
            patientName={patient.name}
          />

          {submitError && (
            <p className="mt-6 text-sm text-[color:var(--color-clay-deep)]">{submitError}</p>
          )}

          <button onClick={() => void confirm()} disabled={submitting} className="btn-clay mt-8">
            {submitting ? 'Confirmando…' : 'Confirmar agendamento'}
          </button>
        </div>
      )}
    </div>
  );
}

function Summary(props: {
  tenantName: string;
  service: BookingService;
  professional: BookingProfessional;
  day: string;
  slot: string;
  offset: number;
  patientName: string;
}) {
  const rows: [string, string, boolean?][] = [
    ['Consultório', props.tenantName],
    ['Serviço', `${props.service.name} · ${props.service.duration} min`],
    ['Valor', formatBRL(props.service.price)],
    ['Profissional', props.professional.name],
    ['Data', dayLabel(props.day, 'long'), true],
    ['Horário', slotTime(props.slot, props.offset)],
    ['Paciente', props.patientName],
  ];

  return (
    <dl className="border-t border-b border-[color:var(--color-rule)] divide-y divide-[color:var(--color-rule)]">
      {rows.map(([label, value, capitalize]) => (
        <div key={label} className="py-3 flex items-baseline gap-4">
          <dt className="kicker w-32 shrink-0">{label}</dt>
          <dd className={`font-medium ${capitalize ? 'capitalize' : ''}`}>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
