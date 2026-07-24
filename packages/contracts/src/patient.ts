import { z } from 'zod';

// Telefone canônico: só dígitos (DDD + número). A entrada pode vir com máscara
// ("(11) 99999-0000") ou prefixo + — tudo é normalizado aqui, na borda da API,
// porque a deduplicação de paciente é por telefone exato.
export const PhoneSchema = z
  .string()
  .max(25)
  .transform((v) => v.replace(/\D/g, ''))
  .pipe(
    z.string().regex(/^\d{10,15}$/, 'Telefone inválido: informe DDD + número (10 a 15 dígitos)'),
  );

export const CreatePatientSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().optional(),
  phone: PhoneSchema,
  birthDate: z.coerce.date().optional(),
  notes: z.string().max(2000).optional(),
  // Consentimento coletado do paciente (LGPD). No cadastro pelo painel, o
  // staff atesta o aceite; o servidor grava consentAt + versão dos termos.
  consent: z.boolean().optional(),
});
export type CreatePatientInput = z.infer<typeof CreatePatientSchema>;

export const UpdatePatientSchema = CreatePatientSchema.partial();
export type UpdatePatientInput = z.infer<typeof UpdatePatientSchema>;

export const ListPatientsQuerySchema = z.object({
  search: z.string().max(120).optional(),
});
export type ListPatientsQuery = z.infer<typeof ListPatientsQuerySchema>;
