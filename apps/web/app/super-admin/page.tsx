'use client';

import { useCallback, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { getFirebaseAuth } from '../../lib/firebase';
import { api, ApiError } from '../../lib/api';
import { AuthPanel } from '../../components/auth-panel';
import type {
  AdminAuditEntry,
  AdminMetrics,
  AdminTenant,
  TenantStatus,
} from '../../lib/admin-types';

const STATUS_LABEL: Record<TenantStatus, string> = {
  TRIAL: 'trial',
  ACTIVE: 'ativo',
  SUSPENDED: 'suspenso',
  CANCELED: 'cancelado',
};

const brl = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function SuperAdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [tenants, setTenants] = useState<AdminTenant[] | null>(null);
  const [audit, setAudit] = useState<AdminAuditEntry[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  // Troca de plano pendente de confirmação (ação delicada — evita troca
  // acidental por um clique no select).
  const [pendingPlan, setPendingPlan] = useState<{ tenantId: string; planId: string } | null>(
    null,
  );
  // Suspender/reativar também exige confirmação (bloqueia o consultório).
  const [pendingStatus, setPendingStatus] = useState<{
    tenantId: string;
    status: TenantStatus;
  } | null>(null);

  useEffect(() => {
    return onAuthStateChanged(getFirebaseAuth(), (u) => {
      setUser(u);
      setLoadingAuth(false);
      setDenied(false);
      setError(null);
      if (!u) {
        setMetrics(null);
        setTenants(null);
        setAudit(null);
      }
    });
  }, []);

  const load = useCallback(async () => {
    try {
      const [m, t, a] = await Promise.all([
        api<AdminMetrics>('/admin/metrics'),
        api<AdminTenant[]>('/admin/tenants'),
        api<AdminAuditEntry[]>('/admin/audit'),
      ]);
      setMetrics(m);
      setTenants(t);
      setAudit(a);
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) setDenied(true);
      else setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    // load() é assíncrono: os setState acontecem após os awaits (fora do
    // ciclo síncrono do efeito), então o alerta do lint não se aplica aqui.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (user) void load();
  }, [user, load]);

  async function patchTenant(id: string, body: { status?: TenantStatus; planId?: string }) {
    setBusyId(id);
    setError(null);
    try {
      await api(`/admin/tenants/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="min-h-screen">
      <header className="border-b border-[color:var(--color-rule)]">
        <div className="mx-auto max-w-[1100px] px-6 md:px-10 py-5 flex items-center justify-between gap-4">
          <span className="font-serif italic text-2xl tracking-tight text-[color:var(--color-ink)]">
            Consultório · plataforma
          </span>
          {user && (
            <button onClick={() => signOut(getFirebaseAuth())} className="text-xs link-editorial">
              sair
            </button>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-[1100px] px-6 md:px-10 py-12 md:py-16">
        {loadingAuth ? (
          <p className="font-serif italic text-[color:var(--color-ink-soft)]">Carregando…</p>
        ) : !user ? (
          <div className="max-w-md py-12">
            <p className="section-number">§ Plataforma</p>
            <AuthPanel
              heading={
                <h1 className="font-serif text-4xl md:text-5xl mt-3 leading-[1.05] tracking-[-0.02em]">
                  Painel da plataforma.
                </h1>
              }
            />
          </div>
        ) : denied ? (
          <div className="max-w-md py-12">
            <p className="section-number">§ Plataforma</p>
            <h1 className="font-serif text-4xl md:text-5xl mt-3 leading-[1.05] tracking-[-0.02em]">
              Acesso restrito.
            </h1>
            <p className="mt-4 text-[color:var(--color-ink-soft)] leading-relaxed max-w-[44ch]">
              Sua conta não está na lista de administradores da plataforma.
            </p>
          </div>
        ) : !metrics || !tenants ? (
          error ? (
            <p className="text-sm text-[color:var(--color-clay-deep)]">{error}</p>
          ) : (
            <p className="font-serif italic text-[color:var(--color-ink-soft)]">Carregando…</p>
          )
        ) : (
          <>
            <p className="section-number">§ Plataforma</p>
            <h1 className="font-serif text-4xl md:text-[52px] leading-[1.02] tracking-[-0.02em] mt-2">
              Visão geral
            </h1>

            {error && (
              <p className="mt-6 text-sm text-[color:var(--color-clay-deep)]">{error}</p>
            )}

            <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4">
              <Metric label="MRR" value={brl(metrics.totals.mrr)} />
              <Metric label="Consultórios" value={String(metrics.totals.tenants)} />
              <Metric label="Agendamentos no mês" value={String(metrics.totals.appointmentsThisMonth)} />
              <Metric label="Ativos" value={String(metrics.byStatus.ACTIVE)} />
            </div>

            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              {(Object.keys(metrics.byStatus) as TenantStatus[]).map((s) => (
                <Metric key={s} label={STATUS_LABEL[s]} value={String(metrics.byStatus[s])} muted />
              ))}
            </div>

            <h2 className="font-serif text-2xl tracking-tight mt-14">Consultórios</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm border-t border-[color:var(--color-rule)]">
                <thead>
                  <tr className="text-left text-[color:var(--color-ink-soft)]">
                    <th className="py-3 pr-4 font-normal kicker">Nome</th>
                    <th className="py-3 pr-4 font-normal kicker">Status</th>
                    <th className="py-3 pr-4 font-normal kicker">Plano</th>
                    <th className="py-3 pr-4 font-normal kicker">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((t) => (
                    <tr key={t.id} className="border-t border-[color:var(--color-rule)] align-middle">
                      <td className="py-3 pr-4">
                        <span className="font-medium">{t.name}</span>
                        <span className="block text-xs text-[color:var(--color-ink-soft)]">
                          /c/{t.slug}
                        </span>
                      </td>
                      <td className="py-3 pr-4">{STATUS_LABEL[t.status]}</td>
                      <td className="py-3 pr-4">
                        {(() => {
                          const pending =
                            pendingPlan?.tenantId === t.id ? pendingPlan.planId : null;
                          const target = metrics.plans.find((p) => p.id === pending);
                          return (
                            <div className="space-y-2">
                              <select
                                value={pending ?? t.plan.id}
                                disabled={busyId === t.id}
                                onChange={(e) =>
                                  setPendingPlan(
                                    e.target.value === t.plan.id
                                      ? null
                                      : { tenantId: t.id, planId: e.target.value },
                                  )
                                }
                                className="input-editorial py-1"
                              >
                                {metrics.plans.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.code} · {brl(p.priceBRL)}
                                  </option>
                                ))}
                              </select>
                              {target && (
                                <div className="flex items-center gap-3 text-xs">
                                  <span className="text-[color:var(--color-ink-soft)]">
                                    Trocar {t.plan.code} → {target.code}?
                                  </span>
                                  <button
                                    disabled={busyId === t.id}
                                    onClick={() => {
                                      setPendingPlan(null);
                                      void patchTenant(t.id, { planId: target.id });
                                    }}
                                    className="link-editorial"
                                  >
                                    confirmar
                                  </button>
                                  <button
                                    disabled={busyId === t.id}
                                    onClick={() => setPendingPlan(null)}
                                    className="text-[color:var(--color-ink-soft)] underline underline-offset-4"
                                  >
                                    cancelar
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="py-3 pr-4">
                        {pendingStatus?.tenantId === t.id ? (
                          <div className="flex items-center gap-3 text-xs">
                            <span className="text-[color:var(--color-ink-soft)]">
                              {pendingStatus.status === 'ACTIVE' ? 'Reativar' : 'Suspender'}{' '}
                              {t.name}?
                            </span>
                            <button
                              disabled={busyId === t.id}
                              onClick={() => {
                                const next = pendingStatus.status;
                                setPendingStatus(null);
                                void patchTenant(t.id, { status: next });
                              }}
                              className="link-editorial"
                            >
                              confirmar
                            </button>
                            <button
                              disabled={busyId === t.id}
                              onClick={() => setPendingStatus(null)}
                              className="text-[color:var(--color-ink-soft)] underline underline-offset-4"
                            >
                              cancelar
                            </button>
                          </div>
                        ) : t.status === 'SUSPENDED' || t.status === 'CANCELED' ? (
                          <button
                            disabled={busyId === t.id}
                            onClick={() => setPendingStatus({ tenantId: t.id, status: 'ACTIVE' })}
                            className="text-xs link-editorial"
                          >
                            reativar
                          </button>
                        ) : (
                          <button
                            disabled={busyId === t.id}
                            onClick={() =>
                              setPendingStatus({ tenantId: t.id, status: 'SUSPENDED' })
                            }
                            className="text-xs text-[color:var(--color-clay-deep)] underline underline-offset-4"
                          >
                            suspender
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h2 className="font-serif text-2xl tracking-tight mt-14">Auditoria</h2>
            {audit && audit.length > 0 ? (
              <ul className="mt-4 space-y-2 text-sm">
                {audit.map((a) => (
                  <li
                    key={a.id}
                    className="border-b border-[color:var(--color-rule)] pb-2 text-[color:var(--color-ink-soft)]"
                  >
                    <span className="text-[color:var(--color-ink)]">{a.actorEmail}</span> ·{' '}
                    {a.action}
                    {a.tenantId ? ` · ${a.tenantId}` : ''} ·{' '}
                    {new Date(a.createdAt).toLocaleString('pt-BR')}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-[color:var(--color-ink-soft)]">Nenhuma ação registrada.</p>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function Metric({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="border border-[color:var(--color-rule)] p-4">
      <p className="kicker">{label}</p>
      <p
        className={`mt-2 font-serif text-2xl ${
          muted ? 'text-[color:var(--color-ink-soft)]' : 'text-[color:var(--color-ink)]'
        }`}
      >
        {value}
      </p>
    </div>
  );
}
