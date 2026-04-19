import { z } from 'zod';

export const CreateProfessionalSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().optional(),
  bio: z.string().max(2000).optional(),
  photoUrl: z.string().url().optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default('#3b82f6'),
  serviceIds: z.array(z.string().cuid()).default([]),
});
export type CreateProfessionalInput = z.infer<typeof CreateProfessionalSchema>;
