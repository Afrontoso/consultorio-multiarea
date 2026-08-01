import { BadRequestException, Body, Controller, Post, UseGuards } from '@nestjs/common';
import { CreateTenantSchema, type CreateTenantInput } from '@consultorio/contracts';
import { ZodValidationPipe } from 'nestjs-zod';
import { CurrentUser, type CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { TenantsService } from './tenants.service';

@Controller('tenants')
@UseGuards(FirebaseAuthGuard)
export class TenantsController {
  constructor(private readonly tenants: TenantsService) {}

  @Post()
  async create(
    @Body(new ZodValidationPipe(CreateTenantSchema)) body: CreateTenantInput,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    // Email do dono vem do token verificado, nunca do corpo do request.
    if (!user.email) {
      throw new BadRequestException(
        'Sua conta não tem email. Entre com Google, link mágico ou email/senha para abrir um consultório.',
      );
    }
    const tenant = await this.tenants.createTenant(body, user.uid, user.email);
    return {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      category: tenant.category,
      status: tenant.status,
      trialEndsAt: tenant.trialEndsAt,
    };
  }
}
