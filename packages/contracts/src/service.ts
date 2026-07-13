import { z } from 'zod';

export const CreateServiceSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(2000).optional(),
  duration: z.number().int().min(5).max(480),
  price: z.number().nonnegative().max(99999.99),
  professionalIds: z.array(z.string().cuid()).default([]),
});
export type CreateServiceInput = z.infer<typeof CreateServiceSchema>;

export const UpdateServiceSchema = CreateServiceSchema.partial();
export type UpdateServiceInput = z.infer<typeof UpdateServiceSchema>;
