import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  CreateProfessionalSchema,
  CreateScheduleBlockSchema,
  SetWorkingHoursSchema,
  UpdateProfessionalSchema,
  type CreateProfessionalInput,
  type CreateScheduleBlockInput,
  type SetWorkingHoursInput,
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

  @Post(':id/invite')
  invite(@Param('id') id: string, @CurrentMember() member: TenantMember) {
    if (member.role !== 'OWNER') {
      throw new ForbiddenException('Apenas o dono do consultório pode convidar profissionais.');
    }
    return this.professionals.invite(member.tenantId, id);
  }

  @Get(':id/working-hours')
  getWorkingHours(@Param('id') id: string, @CurrentMember() member: TenantMember) {
    return this.professionals.getWorkingHours(member.tenantId, id);
  }

  @Put(':id/working-hours')
  setWorkingHours(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(SetWorkingHoursSchema)) body: SetWorkingHoursInput,
    @CurrentMember() member: TenantMember,
  ) {
    return this.professionals.setWorkingHours(member.tenantId, id, body);
  }

  @Get(':id/blocks')
  listBlocks(@Param('id') id: string, @CurrentMember() member: TenantMember) {
    return this.professionals.listBlocks(member.tenantId, id);
  }

  @Post(':id/blocks')
  createBlock(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(CreateScheduleBlockSchema)) body: CreateScheduleBlockInput,
    @CurrentMember() member: TenantMember,
  ) {
    return this.professionals.createBlock(member.tenantId, id, body);
  }

  @Delete(':id/blocks/:blockId')
  removeBlock(
    @Param('id') id: string,
    @Param('blockId') blockId: string,
    @CurrentMember() member: TenantMember,
  ) {
    return this.professionals.removeBlock(member.tenantId, id, blockId);
  }
}
