import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { AvailabilityModule } from './modules/availability/availability.module';
import { BookingModule } from './modules/booking/booking.module';
import { FirebaseModule } from './modules/firebase/firebase.module';
import { HealthController } from './modules/health/health.controller';
import { MeModule } from './modules/me/me.module';
import { PatientsModule } from './modules/patients/patients.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { ProfessionalsModule } from './modules/professionals/professionals.module';
import { ServicesModule } from './modules/services/services.module';
import { TenantsModule } from './modules/tenants/tenants.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    FirebaseModule,
    TenantsModule,
    MeModule,
    ProfessionalsModule,
    ServicesModule,
    AvailabilityModule,
    AppointmentsModule,
    BookingModule,
    PatientsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
