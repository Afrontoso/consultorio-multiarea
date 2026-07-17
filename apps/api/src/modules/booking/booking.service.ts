import { Injectable, NotFoundException } from '@nestjs/common';
import type { PublicCreateAppointmentInput } from '@consultorio/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { AppointmentsService } from '../appointments/appointments.service';
import { DEFAULT_UTC_OFFSET_MINUTES } from '../availability/slots';

@Injectable()
export class BookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly appointments: AppointmentsService,
  ) {}

  /** Perfil público do consultório: vitrine com profissionais e serviços. */
  async profile(slug: string) {
    const tenant = await this.activeTenant(slug);

    const [professionals, services] = await this.prisma.withTenant(tenant.id, async (tx) => [
      await tx.professional.findMany({
        where: { tenantId: tenant.id },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, bio: true, photoUrl: true, color: true },
      }),
      await tx.service.findMany({
        where: { tenantId: tenant.id },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, description: true, duration: true, price: true },
      }),
    ] as const);

    return {
      tenant: { slug: tenant.slug, name: tenant.name, category: tenant.category },
      professionals,
      services: services.map((s) => ({ ...s, price: Number(s.price) })),
    };
  }

  /** Catálogo público: dados do consultório + serviços com quem os realiza. */
  async catalog(slug: string) {
    const tenant = await this.activeTenant(slug);
    const settings = (tenant.settings ?? {}) as { utcOffsetMinutes?: number };

    const services = await this.prisma.withTenant(tenant.id, (tx) =>
      tx.service.findMany({
        where: { tenantId: tenant.id, professionals: { some: {} } },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          description: true,
          duration: true,
          price: true,
          professionals: {
            select: { id: true, name: true, bio: true, photoUrl: true, color: true },
            orderBy: { name: 'asc' },
          },
        },
      }),
    );

    return {
      tenant: {
        slug: tenant.slug,
        name: tenant.name,
        category: tenant.category,
        utcOffsetMinutes: settings.utcOffsetMinutes ?? DEFAULT_UTC_OFFSET_MINUTES,
      },
      services: services.map((s) => ({ ...s, price: Number(s.price) })),
    };
  }

  /** Agendamento público: paciente inline, reaproveitado pelo telefone. */
  async book(slug: string, input: PublicCreateAppointmentInput) {
    const tenant = await this.activeTenant(slug);
    return this.appointments.create(tenant.id, input);
  }

  private async activeTenant(slug: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { slug } });
    if (!tenant || tenant.status === 'SUSPENDED' || tenant.status === 'CANCELED') {
      throw new NotFoundException('Consultório não encontrado.');
    }
    return tenant;
  }
}
