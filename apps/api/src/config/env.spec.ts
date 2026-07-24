import { corsOrigins, validateEnv } from './env';

const DB = 'postgresql://postgres:postgres@localhost:5432/consultorio';

describe('validateEnv', () => {
  it('aceita config mínima de dev e aplica defaults', () => {
    const env = validateEnv({ DATABASE_URL: DB });
    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT).toBe(3333);
  });

  it('rejeita DATABASE_URL ausente ou não-postgres', () => {
    expect(() => validateEnv({})).toThrow(/DATABASE_URL/);
    expect(() => validateEnv({ DATABASE_URL: 'mysql://x' })).toThrow(/postgres/);
  });

  it('coage PORT para número e rejeita valores inválidos', () => {
    expect(validateEnv({ DATABASE_URL: DB, PORT: '8080' }).PORT).toBe(8080);
    expect(() => validateEnv({ DATABASE_URL: DB, PORT: 'abc' })).toThrow();
  });

  it('exige credenciais Firebase completas quando alguma é definida', () => {
    expect(() => validateEnv({ DATABASE_URL: DB, FIREBASE_PROJECT_ID: 'p' })).toThrow(
      /definidas juntas/,
    );
  });

  it('em produção exige Firebase, WEB_ORIGIN e FIELD_ENCRYPTION_KEY', () => {
    expect(() => validateEnv({ DATABASE_URL: DB, NODE_ENV: 'production' })).toThrow(/produção/);
    const env = validateEnv({
      DATABASE_URL: DB,
      NODE_ENV: 'production',
      WEB_ORIGIN: 'https://app.example.com',
      FIREBASE_PROJECT_ID: 'p',
      FIREBASE_CLIENT_EMAIL: 'svc@p.iam.gserviceaccount.com',
      FIREBASE_PRIVATE_KEY: 'key',
      FIELD_ENCRYPTION_KEY: 'MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=',
    });
    expect(env.NODE_ENV).toBe('production');
  });
});

describe('corsOrigins', () => {
  it('divide WEB_ORIGIN por vírgula e ignora espaços', () => {
    expect(
      corsOrigins({ NODE_ENV: 'production', WEB_ORIGIN: 'https://a.com, https://b.com' }),
    ).toEqual(['https://a.com', 'https://b.com']);
  });

  it('usa localhost:3000 como fallback em dev', () => {
    expect(corsOrigins({ NODE_ENV: 'development', WEB_ORIGIN: undefined })).toEqual([
      'http://localhost:3000',
    ]);
  });
});
