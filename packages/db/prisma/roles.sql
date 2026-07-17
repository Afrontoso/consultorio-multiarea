-- Role de aplicação SEM superuser/BYPASSRLS — obrigatório para o RLS valer.
-- O usuário `postgres` local é superuser e IGNORA as policies; em produção a
-- API deve conectar com esta role (ajuste a senha via variável ou secret):
--
--   psql $DATABASE_URL -f prisma/roles.sql
--   DATABASE_URL=postgresql://consultorio_api:<senha>@host:5432/consultorio
--
-- Migrations continuam rodando com o usuário admin (owner das tabelas).

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'consultorio_api') THEN
    CREATE ROLE consultorio_api LOGIN PASSWORD 'consultorio_api_dev' NOSUPERUSER NOBYPASSRLS;
  END IF;
END $$;

GRANT USAGE ON SCHEMA public TO consultorio_api;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO consultorio_api;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO consultorio_api;

-- Tabelas criadas por migrations futuras herdam os grants:
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO consultorio_api;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO consultorio_api;
