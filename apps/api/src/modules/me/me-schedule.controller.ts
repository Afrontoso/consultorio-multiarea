import {
  BadRequestException,
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
import type { z } from 'zod';
import {
  CreateScheduleBlockSchema,
  ListAppointmentsQuerySchema,
  PatientUpdateAppointmentSchema,
  UpdateAppointmentSchema,
  type CreateScheduleBlockInput,
  type ListAppointmentsQuery,
} from '@consultorio/contracts';
import { ZodValidationPipe } from 'nestjs-zod';
import { CurrentMember } from '../../common/decorators/current-member.decorator';
import type { TenantMember } from '../../common/guards/tenant-member.guard';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { TenantAnyMemberGuard } from '../../common/guards/tenant-any-member.guard';
import { AppointmentsService } from '../appointments/appointments.service';
import { ProfessionalsService } from '../professionals/professionals.service';

/**
 * Agenda do próprio profissional logado (role PROFESSIONAL). O professionalId
 * nunca vem do client — é sempre o do membro autenticado, o que evita um
 * profissional ler/alterar a agenda de outro só trocando um id na URL.
 */
@Controller('me')
@UseGuards(FirebaseAuthGuard, TenantAnyMemberGuard)
export class MeScheduleController {
  constructor(
    private readonly appointments: AppointmentsService,
    private readonly professionals: ProfessionalsService,
  ) {}

  @Get('appointments')
  listAppointments(
    @Query(new ZodValidationPipe(ListAppointmentsQuerySchema)) query: ListAppointmentsQuery,
    @CurrentMember() member: TenantMember,
  ) {
    if (member.role === 'PATIENT') {
      const patientId = requirePatientId(member);
      return this.appointments.list(member.tenantId, { ...query, patientId });
    }
    const professionalId = requireProfessional(member);
    return this.appointments.list(member.tenantId, { ...query, professionalId });
  }

  @Patch('appointments/:id')
  updateAppointment(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentMember() member: TenantMember,
  ) {
    if (member.role === 'PATIENT') {
      const patientId = requirePatientId(member);
      const input = parseOrThrow(PatientUpdateAppointmentSchema, body);
      return this.appointments.update(member.tenantId, id, input, undefined, patientId);
    }
    const professionalId = requireProfessional(member);
    const input = parseOrThrow(UpdateAppointmentSchema, body);
    return this.appointments.update(member.tenantId, id, input, professionalId);
  }

  @Get('blocks')
  listBlocks(@CurrentMember() member: TenantMember) {
    const professionalId = requireProfessional(member);
    return this.professionals.listBlocks(member.tenantId, professionalId);
  }

  @Post('blocks')
  createBlock(
    @Body(new ZodValidationPipe(CreateScheduleBlockSchema)) body: CreateScheduleBlockInput,
    @CurrentMember() member: TenantMember,
  ) {
    const professionalId = requireProfessional(member);
    return this.professionals.createBlock(member.tenantId, professionalId, body);
  }

  @Delete('blocks/:blockId')
  removeBlock(@Param('blockId') blockId: string, @CurrentMember() member: TenantMember) {
    const professionalId = requireProfessional(member);
    return this.professionals.removeBlock(member.tenantId, professionalId, blockId);
  }
}

function requireProfessional(member: TenantMember): string {
  if (!member.professionalId) {
    throw new ForbiddenException('Este usuário não está vinculado a um profissional.');
  }
  return member.professionalId;
}

function requirePatientId(member: TenantMember): string {
  if (!member.patientId) {
    throw new ForbiddenException('Este usuário não está vinculado a um paciente.');
  }
  return member.patientId;
}

function parseOrThrow<T extends z.ZodTypeAny>(schema: T, body: unknown): z.infer<T> {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new BadRequestException(result.error.issues.map((i) => i.message).join('; '));
  }
  return result.data;
}
