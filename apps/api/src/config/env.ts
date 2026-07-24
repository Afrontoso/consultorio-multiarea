import { z } from 'zod';

// Validação fail-fast das env vars no bootstrap (ConfigModule.validate).
// Variáveis opcionais em dev (Firebase, WEB_ORIGIN) têm defaults seguros ou
// degradam com warning explícito nos módulos que as consomem.
const EnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3333),
    DATABASE_URL: z
      .string()
      .min(1, 'DATABASE_URL é obrigatória')
      .regex(/^postgres(ql)?:\/\//, 'DATABASE_URL deve ser uma URL postgres://'),
    // Origens permitidas no CORS, separadas por vírgula.
    WEB_ORIGIN: z.string().optional(),
    FIREBASE_PROJECT_ID: z.string().optional(),
    FIREBASE_CLIENT_EMAIL: z.string().email().optional().or(z.literal('')),
    FIREBASE_PRIVATE_KEY: z.string().optional(),
    REDIS_URL: z.string().optional(),
    RESEND_API_KEY: z.string().optional(),
    EMAIL_FROM: z.string().optional(),
    // Chave AES-256 (32 bytes em base64) para cifrar campos sensíveis do
    // paciente. Opcional em dev; obrigatória em produção (ver superRefine).
    FIELD_ENCRYPTION_KEY: z.string().optional(),
    // Emails com acesso ao painel de plataforma (/super-admin), separados por
    // vírgula. Vazio = ninguém tem acesso (fail-safe).
    SUPER_ADMIN_EMAILS: z.string().optional(),
  })
  .superRefine((env, ctx) => {
    const firebase = [env.FIREBASE_PROJECT_ID, env.FIREBASE_CLIENT_EMAIL, env.FIREBASE_PRIVATE_KEY];
    const provided = firebase.filter((v) => v && v.length > 0).length;
    if (provided > 0 && provided < firebase.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL e FIREBASE_PRIVATE_KEY devem ser definidas juntas (ou nenhuma, para rodar sem auth em dev)',
      });
    }
    if (env.NODE_ENV === 'production' && provided < firebase.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Em produção as credenciais do Firebase Admin são obrigatórias',
      });
    }
    if (env.NODE_ENV === 'production' && !env.WEB_ORIGIN) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Em produção WEB_ORIGIN é obrigatória (allowlist de CORS)',
      });
    }
    if (env.NODE_ENV === 'production' && !env.FIELD_ENCRYPTION_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Em produção FIELD_ENCRYPTION_KEY é obrigatória (cifra os dados sensíveis do paciente)',
      });
    }
  });

export type Env = z.infer<typeof EnvSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const result = EnvSchema.safeParse(config);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(env)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Variáveis de ambiente inválidas:\n${details}`);
  }
  return result.data;
}

export function corsOrigins(env: Pick<Env, 'NODE_ENV' | 'WEB_ORIGIN'>): string[] {
  const fromEnv = (env.WEB_ORIGIN ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (fromEnv.length > 0) return fromEnv;
  // Sem WEB_ORIGIN fora de produção: assume o Next local.
  return ['http://localhost:3000'];
}
