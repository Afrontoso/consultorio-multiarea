-- Row Level Security policies for tenant isolation.
-- Apply after `prisma migrate` via: psql $DATABASE_URL -f prisma/rls.sql
-- NestJS runs `SET LOCAL app.tenant_id = '<id>'` at the start of every request transaction.
--
-- Dois escopos possíveis, ambos setados só pela API:
--   app.tenant_id = '<cuid>'  → PrismaService.withTenant: enxerga e escreve
--                               apenas as linhas daquele consultório.
--   app.tenant_id = '*'       → PrismaService.withGlobalScope: LEITURA cruzando
--                               tenants (login pelo firebaseUid, métricas da
--                               plataforma). O WITH CHECK não aceita a
--                               sentinela, então escrita continua exigindo o
--                               tenant certo.
-- Sem nenhum dos dois (query que esqueceu o wrapper) nada é visível — falha
-- fechada, de propósito.

DO $$ BEGIN
  PERFORM 1;
END $$;

-- Helper: read current tenant id from session variable
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT current_setting('app.tenant_id', true)
$$;

-- Enable RLS and attach policy to every tenant-scoped table
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'User',
    'Professional',
    'Service',
    'Patient',
    'Appointment',
    'Subscription',
    'WorkingHours',
    'ScheduleBlock'
  ]) LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'DROP POLICY IF EXISTS tenant_isolation ON %I; CREATE POLICY tenant_isolation ON %I USING ("tenantId" = current_tenant_id() OR current_tenant_id() = ''*'') WITH CHECK ("tenantId" = current_tenant_id())',
      t, t
    );
  END LOOP;
END $$;
