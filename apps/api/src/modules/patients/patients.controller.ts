import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  CreatePatientSchema,
  ListPatientsQuerySchema,
  UpdatePatientSchema,
  type CreatePatientInput,
  type ListPatientsQuery,
  type UpdatePatientInput,
} from '@consultorio/contracts';
import { ZodValidationPipe } from 'nestjs-zod';
import { CurrentMember } from '../../common/decorators/current-member.decorator';
import type { TenantMember } from '../../common/guards/tenant-member.guard';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { TenantMemberGuard } from '../../common/guards/tenant-member.guard';
import { PatientsService } from './patients.service';

@Controller('patients')
@UseGuards(FirebaseAuthGuard, TenantMemberGuard)
export class PatientsController {
  constructor(private readonly patients: PatientsService) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(ListPatientsQuerySchema)) query: ListPatientsQuery,
    @CurrentMember() member: TenantMember,
  ) {
    return this.patients.list(member.tenantId, query);
  }

  @Get(':id')
  get(@Param('id') id: string, @CurrentMember() member: TenantMember) {
    return this.patients.get(member.tenantId, id);
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(CreatePatientSchema)) body: CreatePatientInput,
    @CurrentMember() member: TenantMember,
  ) {
    return this.patients.create(member.tenantId, body);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdatePatientSchema)) body: UpdatePatientInput,
    @CurrentMember() member: TenantMember,
  ) {
    return this.patients.update(member.tenantId, id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentMember() member: TenantMember) {
    return this.patients.remove(member.tenantId, id);
  }

  @Post(':id/invite')
  invite(@Param('id') id: string, @CurrentMember() member: TenantMember) {
    if (member.role !== 'OWNER') {
      throw new ForbiddenException('Apenas o dono do consultório pode convidar pacientes.');
    }
    return this.patients.invite(member.tenantId, id);
  }
}
