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

// Campos do responsável legal, reutilizados no cadastro (painel) e no
// agendamento inline (público/painel). Todos opcionais no schema; a
// obrigatoriedade para menores é imposta pelo refine abaixo.
export const GuardianFields = {
  guardianName: z.string().min(2).max(120).optional(),
  guardianPhone: PhoneSchema.optional(),
  guardianRelationship: z.string().max(60).optional(),
};

/**
 * Se a data de nascimento indicar menor de idade, exige nome e telefone do
 * responsável legal. Usado via `.superRefine` em todos os schemas de paciente.
 */
export function minorGuardianRefine(
  data: { birthDate?: Date; guardianName?: string; guardianPhone?: string },
  ctx: z.RefinementCtx,
): void {
  if (!data.birthDate || !isMinor(data.birthDate)) return;
  if (!data.guardianName) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['guardianName'],
      message: 'Paciente menor de idade: informe o nome do responsável legal.',
    });
  }
  if (!data.guardianPhone) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['guardianPhone'],
      message: 'Paciente menor de idade: informe o telefone do responsável legal.',
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
  ...GuardianFields,
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
