import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { AdminUpdateTenantSchema, type AdminUpdateTenantInput } from '@consultorio/contracts';
import { ZodValidationPipe } from 'nestjs-zod';
import { CurrentUser, type CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
import { AdminService } from './admin.service';

/** Painel de plataforma. Restrito à allowlist SUPER_ADMIN_EMAILS. */
@Controller('admin')
@UseGuards(FirebaseAuthGuard, SuperAdminGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('metrics')
  metrics() {
    return this.admin.metrics();
  }

  @Get('tenants')
  tenants() {
    return this.admin.listTenants();
  }

  @Patch('tenants/:id')
  updateTenant(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(AdminUpdateTenantSchema)) body: AdminUpdateTenantInput,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.admin.updateTenant(id, body, user.email ?? 'desconhecido');
  }

  @Get('audit')
  audit() {
    return this.admin.listAudit();
  }
}
