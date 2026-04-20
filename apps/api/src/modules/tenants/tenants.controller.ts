import { Body, Controller, Post, UseGuards, UsePipes } from '@nestjs/common';
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
  @UsePipes(new ZodValidationPipe(CreateTenantSchema))
  async create(@Body() body: CreateTenantInput, @CurrentUser() user: CurrentUserPayload) {
    const tenant = await this.tenants.createTenant(body, user.uid);
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
