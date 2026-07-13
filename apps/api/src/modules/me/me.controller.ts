import { Controller, Get, NotFoundException, UseGuards } from '@nestjs/common';
import { CurrentUser, type CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('me')
@UseGuards(FirebaseAuthGuard)
export class MeController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async me(@CurrentUser() user: CurrentUserPayload) {
    const dbUser = await this.prisma.user.findUnique({
      where: { firebaseUid: user.uid },
      include: { tenant: { include: { plan: true } } },
    });
    if (!dbUser) {
      throw new NotFoundException('Usuário não pertence a nenhum consultório.');
    }
    const { tenant } = dbUser;
    return {
      user: { id: dbUser.id, email: dbUser.email, role: dbUser.role },
      tenant: {
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
        category: tenant.category,
        status: tenant.status,
        trialEndsAt: tenant.trialEndsAt,
        plan: {
          code: tenant.plan.code,
          maxProfessionals: tenant.plan.maxProfessionals,
          maxAppointmentsPerMonth: tenant.plan.maxAppointmentsPerMonth,
        },
      },
    };
  }
}
