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
  CreateScheduleBlockSchema,
  ListAppointmentsQuerySchema,
  UpdateAppointmentSchema,
  type CreateScheduleBlockInput,
  type ListAppointmentsQuery,
  type UpdateAppointmentInput,
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
    const professionalId = requireProfessional(member);
    return this.appointments.list(member.tenantId, { ...query, professionalId });
  }

  @Patch('appointments/:id')
  updateAppointment(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateAppointmentSchema)) body: UpdateAppointmentInput,
    @CurrentMember() member: TenantMember,
  ) {
    const professionalId = requireProfessional(member);
    return this.appointments.update(member.tenantId, id, body, professionalId);
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
