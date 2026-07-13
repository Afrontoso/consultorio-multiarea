import { Controller, Get, Param, Query } from '@nestjs/common';
import { AvailabilityQuerySchema, type AvailabilityQuery } from '@consultorio/contracts';
import { ZodValidationPipe } from 'nestjs-zod';
import { AvailabilityService } from './availability.service';

// Rota pública (sem auth): consumida pela página de agendamento do paciente.
@Controller('public/tenants/:slug')
export class AvailabilityController {
  constructor(private readonly availability: AvailabilityService) {}

  @Get('availability')
  slots(
    @Param('slug') slug: string,
    @Query(new ZodValidationPipe(AvailabilityQuerySchema)) query: AvailabilityQuery,
  ) {
    return this.availability.slotsForDay(slug, query);
  }
}
