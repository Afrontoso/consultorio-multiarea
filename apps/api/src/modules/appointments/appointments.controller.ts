import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import {
  CreateAppointmentSchema,
  ListAppointmentsQuerySchema,
  UpdateAppointmentSchema,
  type CreateAppointmentInput,
  type ListAppointmentsQuery,
  type UpdateAppointmentInput,
} from '@consultorio/contracts';
import { ZodValidationPipe } from 'nestjs-zod';
import { CurrentMember } from '../../common/decorators/current-member.decorator';
import type { TenantMember } from '../../common/guards/tenant-member.guard';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { TenantMemberGuard } from '../../common/guards/tenant-member.guard';
import { AppointmentsService } from './appointments.service';

@Controller('appointments')
@UseGuards(FirebaseAuthGuard, TenantMemberGuard)
export class AppointmentsController {
  constructor(private readonly appointments: AppointmentsService) {}

  @Get('usage')
  usage(@CurrentMember() member: TenantMember) {
    return this.appointments.usage(member.tenantId);
  }

  @Get()
  list(
    @Query(new ZodValidationPipe(ListAppointmentsQuerySchema)) query: ListAppointmentsQuery,
    @CurrentMember() member: TenantMember,
  ) {
    return this.appointments.list(member.tenantId, query);
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(CreateAppointmentSchema)) body: CreateAppointmentInput,
    @CurrentMember() member: TenantMember,
  ) {
    return this.appointments.create(member.tenantId, body);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateAppointmentSchema)) body: UpdateAppointmentInput,
    @CurrentMember() member: TenantMember,
  ) {
    return this.appointments.update(member.tenantId, id, body);
  }
}
