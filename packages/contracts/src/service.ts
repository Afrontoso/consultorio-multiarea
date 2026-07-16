import { z } from 'zod';

export const CreateServiceSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(2000).optional(),
  duration: z.number().int().min(5).max(480),
  // Dinheiro canônico: number em reais com no máximo 2 casas (Decimal(10,2) no banco).
  price: z
    .number()
    .nonnegative()
    .max(99999.99)
    .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-9, {
      message: 'Preço com no máximo 2 casas decimais',
    }),
  professionalIds: z.array(z.string().cuid()).default([]),
});
export type CreateServiceInput = z.infer<typeof CreateServiceSchema>;

export const UpdateServiceSchema = CreateServiceSchema.partial();
export type UpdateServiceInput = z.infer<typeof UpdateServiceSchema>;
