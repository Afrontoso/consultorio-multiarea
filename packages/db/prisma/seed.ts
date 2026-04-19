import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const plans = [
    {
      code: 'FREE',
      priceBRL: 0,
      maxProfessionals: 1,
      maxAppointmentsPerMonth: 30,
      allowsCustomDomain: false,
      allowsBranding: false,
      featuresJson: { watermark: true },
    },
    {
      code: 'STARTER',
      priceBRL: 39,
      maxProfessionals: 1,
      maxAppointmentsPerMonth: 1_000_000,
      allowsCustomDomain: false,
      allowsBranding: false,
      featuresJson: {},
    },
    {
      code: 'PRO',
      priceBRL: 89,
      maxProfessionals: 3,
      maxAppointmentsPerMonth: 1_000_000,
      allowsCustomDomain: true,
      allowsBranding: true,
      featuresJson: { whatsappReminders: true },
    },
    {
      code: 'CLINIC',
      priceBRL: 189,
      maxProfessionals: 10,
      maxAppointmentsPerMonth: 1_000_000,
      allowsCustomDomain: true,
      allowsBranding: true,
      featuresJson: { whatsappReminders: true, reports: true, records: true },
    },
  ];

  for (const p of plans) {
    await prisma.plan.upsert({
      where: { code: p.code },
      update: p,
      create: p,
    });
  }

  // eslint-disable-next-line no-console
  console.log(`[seed] ${plans.length} plans ready`);
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
