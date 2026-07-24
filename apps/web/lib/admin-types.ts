export type TenantStatus = 'TRIAL' | 'ACTIVE' | 'SUSPENDED' | 'CANCELED';

export interface AdminPlan {
  id: string;
  code: string;
  priceBRL: number;
}

export interface AdminMetrics {
  totals: { tenants: number; mrr: number; appointmentsThisMonth: number };
  byStatus: Record<TenantStatus, number>;
  byPlan: Record<string, number>;
  plans: AdminPlan[];
}

export interface AdminTenant {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  trialEndsAt: string | null;
  createdAt: string;
  plan: AdminPlan;
}

export interface AdminAuditEntry {
  id: string;
  actorEmail: string;
  action: string;
  tenantId: string | null;
  detail: unknown;
  createdAt: string;
}
