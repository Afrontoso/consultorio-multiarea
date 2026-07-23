import { z } from 'zod';
import { isMinor } from './age';

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

// Um responsável legal. Nome e telefone obrigatórios; parentesco opcional.
export const GuardianSchema = z.object({
  name: z.string().min(2).max(120),
  phone: PhoneSchema,
  relationship: z.string().max(60).optional(),
});
export type GuardianInput = z.infer<typeof GuardianSchema>;

// Lista de responsáveis. Cada item é validado por GuardianSchema; a
// obrigatoriedade de ao menos um para menores é imposta pelo refine.
export const guardiansField = z.array(GuardianSchema).max(10).optional();

/**
 * Se a data de nascimento indicar menor de idade, exige pelo menos um
 * responsável legal. Usado via `.superRefine` em todos os schemas de paciente.
 */
export function minorGuardianRefine(
  data: { birthDate?: Date; guardians?: GuardianInput[] },
  ctx: z.RefinementCtx,
): void {
  if (!data.birthDate || !isMinor(data.birthDate)) return;
  if (!data.guardians || data.guardians.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['guardians'],
      message: 'Paciente menor de idade: informe pelo menos um responsável legal.',
    });
  }
}

const patientBase = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().optional(),
  phone: PhoneSchema,
  notes: z.string().max(2000).optional(),
  // Consentimento coletado do paciente (LGPD). No cadastro pelo painel, o
  // staff atesta o aceite; o servidor grava consentAt + versão dos termos.
  consent: z.boolean().optional(),
  guardians: guardiansField,
});

// birthDate obrigatório no cadastro: sem ele não dá pra calcular maioridade
// e exigir o responsável de um menor.
export const CreatePatientSchema = patientBase
  .extend({ birthDate: z.coerce.date() })
  .superRefine(minorGuardianRefine);
export type CreatePatientInput = z.infer<typeof CreatePatientSchema>;

// Edição parcial: birthDate volta a ser opcional; o refine só dispara quando
// a data vier no payload.
export const UpdatePatientSchema = patientBase
  .extend({ birthDate: z.coerce.date().optional() })
  .partial()
  .superRefine(minorGuardianRefine);
export type UpdatePatientInput = z.infer<typeof UpdatePatientSchema>;

export const ListPatientsQuerySchema = z.object({
  search: z.string().max(120).optional(),
});
export type ListPatientsQuery = z.infer<typeof ListPatientsQuerySchema>;
