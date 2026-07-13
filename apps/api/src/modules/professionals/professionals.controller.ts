import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import {
  CreateProfessionalSchema,
  UpdateProfessionalSchema,
  type CreateProfessionalInput,
  type UpdateProfessionalInput,
} from '@consultorio/contracts';
import { ZodValidationPipe } from 'nestjs-zod';
import { CurrentMember } from '../../common/decorators/current-member.decorator';
import type { TenantMember } from '../../common/guards/tenant-member.guard';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { TenantMemberGuard } from '../../common/guards/tenant-member.guard';
import { ProfessionalsService } from './professionals.service';

@Controller('professionals')
@UseGuards(FirebaseAuthGuard, TenantMemberGuard)
export class ProfessionalsController {
  constructor(private readonly professionals: ProfessionalsService) {}

  @Get()
  list(@CurrentMember() member: TenantMember) {
    return this.professionals.list(member.tenantId);
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(CreateProfessionalSchema)) body: CreateProfessionalInput,
    @CurrentMember() member: TenantMember,
  ) {
    return this.professionals.create(member.tenantId, body);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateProfessionalSchema)) body: UpdateProfessionalInput,
    @CurrentMember() member: TenantMember,
  ) {
    return this.professionals.update(member.tenantId, id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentMember() member: TenantMember) {
    return this.professionals.remove(member.tenantId, id);
  }
}
