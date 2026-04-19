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

export const CreateTenantSchema = z.object({
  slug: z
    .string()
    .min(3)
    .max(40)
    .regex(/^[a-z0-9-]+$/, 'Apenas letras minúsculas, números e hífen'),
  name: z.string().min(2).max(120),
  category: HealthCategorySchema,
  ownerEmail: z.string().email(),
  ownerName: z.string().min(2).max(120),
});
export type CreateTenantInput = z.infer<typeof CreateTenantSchema>;
