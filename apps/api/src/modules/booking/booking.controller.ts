import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import {
  PublicCreateAppointmentSchema,
  type PublicCreateAppointmentInput,
} from '@consultorio/contracts';
import { ZodValidationPipe } from 'nestjs-zod';
import { BookingService } from './booking.service';

// Rotas públicas (sem auth): consumidas pela página de agendamento do paciente.
@UseGuards(ThrottlerGuard)
@Controller('public/tenants/:slug')
export class BookingController {
  constructor(private readonly booking: BookingService) {}

  @Get()
  profile(@Param('slug') slug: string) {
    return this.booking.profile(slug);
  }

  @Get('booking')
  catalog(@Param('slug') slug: string) {
    return this.booking.catalog(slug);
  }

  // Criação de agendamento é o alvo natural de spam: limite bem mais apertado.
  @Throttle({ public: { ttl: 60_000, limit: 5 } })
  @Post('appointments')
  book(
    @Param('slug') slug: string,
    @Body(new ZodValidationPipe(PublicCreateAppointmentSchema))
    body: PublicCreateAppointmentInput,
  ) {
    return this.booking.book(slug, body);
  }
}
