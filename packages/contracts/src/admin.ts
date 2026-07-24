import { z } from 'zod';

export const TenantStatusSchema = z.enum(['TRIAL', 'ACTIVE', 'SUSPENDED', 'CANCELED']);
export type TenantStatus = z.infer<typeof TenantStatusSchema>;

// Ação do super-admin sobre um tenant: mudar status e/ou trocar plano.
// Exige ao menos um dos campos.
export const AdminUpdateTenantSchema = z
  .object({
    status: TenantStatusSchema.optional(),
    planId: z.string().cuid().optional(),
  })
  .refine((data) => data.status !== undefined || data.planId !== undefined, {
    message: 'Informe status e/ou planId.',
  });
export type AdminUpdateTenantInput = z.infer<typeof AdminUpdateTenantSchema>;
