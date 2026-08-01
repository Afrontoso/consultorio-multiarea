import { z } from 'zod';

export const HealthCategorySchema = z.enum([
  'PSICOLOGIA',
  'FISIOTERAPIA',
  'NUTRICAO',
  'ODONTO',
  'ESTETICA',
  'TERAPIAS',
  'PERSONAL',
  'OUTROS',
]);
export type HealthCategory = z.infer<typeof HealthCategorySchema>;

// O dono não é informado no corpo: a API usa o email do token verificado do
// Firebase. Aceitar `ownerEmail` do cliente deixaria qualquer um registrar o
// consultório sob o email de outra pessoa — e é o email do User que amarra os
// convites do consultório.
export const CreateTenantSchema = z.object({
  slug: z
    .string()
    .min(3)
    .max(40)
    .regex(/^[a-z0-9-]+$/, 'Apenas letras minúsculas, números e hífen'),
  name: z.string().min(2).max(120),
  category: HealthCategorySchema,
});
export type CreateTenantInput = z.infer<typeof CreateTenantSchema>;
