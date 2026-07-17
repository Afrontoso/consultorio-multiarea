import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { CreateTenantInput } from '@consultorio/contracts';
import type { Tenant } from '@consultorio/db';
import { PrismaService } from '../prisma/prisma.service';

const TRIAL_DAYS = 14;

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async createTenant(input: CreateTenantInput, firebaseUid: string): Promise<Tenant> {
    const freePlan = await this.prisma.plan.findUnique({ where: { code: 'FREE' } });
    if (!freePlan) {
      throw new NotFoundException('Plano FREE não encontrado (rode `pnpm --filter @consultorio/db seed`).');
    }

    const slugTaken = await this.prisma.tenant.findUnique({ where: { slug: input.slug } });
    if (slugTaken) {
      throw new ConflictException(`Slug "${input.slug}" já está em uso.`);
    }

    const alreadyOwner = await this.prisma.user.findUnique({ where: { firebaseUid } });
    if (alreadyOwner) {
      throw new ConflictException('Este usuário já pertence a um consultório.');
    }

    const trialEndsAt = new Date();
    trialEndsAt.setUTCDate(trialEndsAt.getUTCDate() + TRIAL_DAYS);

    return this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          slug: input.slug,
          name: input.name,
          category: input.category,
          planId: freePlan.id,
          status: 'TRIAL',
          trialEndsAt,
        },
      });

      await tx.$queryRaw`SELECT set_config('app.tenant_id', ${tenant.id}, true)`;

      await tx.user.create({
        data: {
          firebaseUid,
          email: input.ownerEmail,
          tenantId: tenant.id,
          role: 'OWNER',
        },
      });

      return tenant;
    });
  }
}
