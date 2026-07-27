import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@consultorio/db';
import type { AdminUpdateTenantInput, TenantStatus } from '@consultorio/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { monthWindowUtc } from '../appointments/appointments.service';
import { DEFAULT_UTC_OFFSET_MINUTES } from '../availability/slots';

const TENANT_SELECT = {
  id: true,
  name: true,
  slug: true,
  status: true,
  trialEndsAt: true,
  createdAt: true,
  plan: { select: { id: true, code: true, priceBRL: true } },
} as const;

export interface AdminTenantRow {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  trialEndsAt: Date | null;
  createdAt: Date;
  plan: { id: string; code: string; priceBRL: number };
}

export interface AdminMetrics {
  totals: { tenants: number; mrr: number; appointmentsThisMonth: number };
  byStatus: Record<TenantStatus, number>;
  byPlan: Record<string, number>;
  // Catálogo de planos, para o select de troca de plano no painel.
  plans: { id: string; code: string; priceBRL: number }[];
}

export interface AdminAuditRow {
  id: string;
  actorEmail: string;
  action: string;
  tenantId: string | null;
  detail: unknown;
  createdAt: Date;
}

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  /** Métricas da plataforma: contagens, MRR (só ACTIVE) e agendamentos do mês. */
  async metrics(): Promise<AdminMetrics> {
    const [tenants, plans] = await Promise.all([
      this.prisma.tenant.findMany({
        select: { status: true, plan: { select: { code: true, priceBRL: true } } },
      }),
      this.prisma.plan.findMany({
        orderBy: { priceBRL: 'asc' },
        select: { id: true, code: true, priceBRL: true },
      }),
    ]);

    const byStatus: Record<TenantStatus, number> = {
      TRIAL: 0,
      ACTIVE: 0,
      SUSPENDED: 0,
      CANCELED: 0,
    };
    const byPlan: Record<string, number> = {};
    let mrr = 0;
    for (const t of tenants) {
      byStatus[t.status] += 1;
      byPlan[t.plan.code] = (byPlan[t.plan.code] ?? 0) + 1;
      if (t.status === 'ACTIVE') mrr += Number(t.plan.priceBRL);
    }

    const { monthStart, monthEnd } = monthWindowUtc(new Date(), DEFAULT_UTC_OFFSET_MINUTES);
    // Agendamento é tabela com RLS: a contagem da plataforma cruza tenants de
    // propósito, então vai no escopo global explícito.
    const appointmentsThisMonth = await this.prisma.withGlobalScope((tx) =>
      tx.appointment.count({
        where: { date: { gte: monthStart, lt: monthEnd }, status: { notIn: ['CANCELED'] } },
      }),
    );

    return {
      totals: { tenants: tenants.length, mrr, appointmentsThisMonth },
      byStatus,
      byPlan,
      plans: plans.map((p) => ({ ...p, priceBRL: Number(p.priceBRL) })),
    };
  }

  async listTenants(): Promise<AdminTenantRow[]> {
    const rows = await this.prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      select: TENANT_SELECT,
    });
    return rows.map((r) => ({ ...r, plan: { ...r.plan, priceBRL: Number(r.plan.priceBRL) } }));
  }

  /** Suspende/reativa ou troca o plano de um tenant, registrando auditoria. */
  async updateTenant(
    id: string,
    input: AdminUpdateTenantInput,
    actorEmail: string,
  ): Promise<AdminTenantRow> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException('Consultório não encontrado.');
    if (input.planId) {
      const plan = await this.prisma.plan.findUnique({ where: { id: input.planId } });
      if (!plan) throw new NotFoundException('Plano não encontrado.');
    }

    // Mudança e registro de auditoria na mesma transação: nunca uma suspensão
    // ou troca de plano sem rastro de quem fez.
    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.tenant.update({
        where: { id },
        data: {
          ...(input.status && { status: input.status }),
          ...(input.planId && { planId: input.planId }),
        },
        select: TENANT_SELECT,
      });
      await tx.adminAuditLog.create({
        data: {
          actorEmail,
          action: 'UPDATE_TENANT',
          tenantId: id,
          detail: {
            from: { status: tenant.status, planId: tenant.planId },
            to: input,
          } as Prisma.InputJsonValue,
        },
      });
      return row;
    });

    return { ...updated, plan: { ...updated.plan, priceBRL: Number(updated.plan.priceBRL) } };
  }

  async listAudit(limit = 50): Promise<AdminAuditRow[]> {
    const rows = await this.prisma.adminAuditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.map((r) => ({
      id: r.id,
      actorEmail: r.actorEmail,
      action: r.action,
      tenantId: r.tenantId,
      detail: r.detail,
      createdAt: r.createdAt,
    }));
  }
}
