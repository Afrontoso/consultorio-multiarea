/**
 * Purge definitivo de pacientes (LGPD — direito ao esquecimento).
 *
 * Apaga em definitivo as fichas soft-deletadas (`deletedAt` preenchido) há mais
 * de N dias (padrão 30, via PURGE_RETENTION_DAYS). Pensado para rodar
 * periodicamente (ex.: Fly scheduled machine ou cron diário):
 *
 *   pnpm --filter @consultorio/db purge:patients
 *
 * FKs: `Appointment` é RESTRICT (apagado antes), `_PatientToProfessional` é
 * CASCADE (automático). O login do paciente (`User` PATIENT) é apagado junto.
 * A conta no Firebase Auth, se houver, não é tocada aqui (fora do escopo do
 * banco); pode ser limpa por um passo separado no futuro.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const RETENTION_DAYS = Number(process.env.PURGE_RETENTION_DAYS ?? 30);

async function main() {
  if (!Number.isFinite(RETENTION_DAYS) || RETENTION_DAYS < 0) {
    throw new Error(`PURGE_RETENTION_DAYS inválido: ${process.env.PURGE_RETENTION_DAYS}`);
  }

  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const patients = await prisma.patient.findMany({
    where: { deletedAt: { not: null, lt: cutoff } },
    select: { id: true, tenantId: true, deletedAt: true },
  });

  if (patients.length === 0) {
    console.log(`[purge] nada a apagar (retenção de ${RETENTION_DAYS} dias, corte em ${cutoff.toISOString()}).`);
    return;
  }

  console.log(`[purge] ${patients.length} paciente(s) a apagar (corte em ${cutoff.toISOString()}):`);

  let purged = 0;
  for (const patient of patients) {
    await prisma.$transaction(async (tx) => {
      const appointments = await tx.appointment.deleteMany({ where: { patientId: patient.id } });
      const users = await tx.user.deleteMany({ where: { patientId: patient.id } });
      await tx.patient.delete({ where: { id: patient.id } });
      console.log(
        `  ✓ ${patient.id} (tenant ${patient.tenantId}) — ${appointments.count} consulta(s), ${users.count} login(s).`,
      );
    });
    purged += 1;
  }

  console.log(`[purge] concluído: ${purged} paciente(s) apagado(s) em definitivo.`);
}

main()
  .catch((err) => {
    console.error('[purge] falhou:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
