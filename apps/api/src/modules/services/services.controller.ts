import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import {
  CreateServiceSchema,
  UpdateServiceSchema,
  type CreateServiceInput,
  type UpdateServiceInput,
} from '@consultorio/contracts';
import { ZodValidationPipe } from 'nestjs-zod';
import { CurrentMember } from '../../common/decorators/current-member.decorator';
import type { TenantMember } from '../../common/guards/tenant-member.guard';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { TenantMemberGuard } from '../../common/guards/tenant-member.guard';
import { ServicesService } from './services.service';

@Controller('services')
@UseGuards(FirebaseAuthGuard, TenantMemberGuard)
export class ServicesController {
  constructor(private readonly services: ServicesService) {}

  @Get()
  list(@CurrentMember() member: TenantMember) {
    return this.services.list(member.tenantId);
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(CreateServiceSchema)) body: CreateServiceInput,
    @CurrentMember() member: TenantMember,
  ) {
    return this.services.create(member.tenantId, body);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateServiceSchema)) body: UpdateServiceInput,
    @CurrentMember() member: TenantMember,
  ) {
    return this.services.update(member.tenantId, id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentMember() member: TenantMember) {
    return this.services.remove(member.tenantId, id);
  }
}
