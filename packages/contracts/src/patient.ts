import { z } from 'zod';

export const CreatePatientSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().optional(),
  phone: z
    .string()
    .regex(/^\+?\d{10,15}$/, 'Telefone em formato internacional (apenas dígitos, 10-15)'),
  birthDate: z.coerce.date().optional(),
  notes: z.string().max(2000).optional(),
});
export type CreatePatientInput = z.infer<typeof CreatePatientSchema>;
