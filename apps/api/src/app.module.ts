import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { TenantScopeInterceptor } from './common/interceptors/tenant-scope.interceptor';
import { validateEnv } from './config/env';
import { AdminModule } from './modules/admin/admin.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { AvailabilityModule } from './modules/availability/availability.module';
import { BookingModule } from './modules/booking/booking.module';
import { FirebaseModule } from './modules/firebase/firebase.module';
import { HealthController } from './modules/health/health.controller';
import { MeModule } from './modules/me/me.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PatientsModule } from './modules/patients/patients.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { ProfessionalsModule } from './modules/professionals/professionals.module';
import { ServicesModule } from './modules/services/services.module';
import { TenantsModule } from './modules/tenants/tenants.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    ThrottlerModule.forRoot([{ name: 'public', ttl: 60_000, limit: 30 }]),
    PrismaModule,
    FirebaseModule,
    NotificationsModule,
    TenantsModule,
    MeModule,
    ProfessionalsModule,
    ServicesModule,
    AvailabilityModule,
    AppointmentsModule,
    BookingModule,
    PatientsModule,
    AdminModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_INTERCEPTOR, useClass: TenantScopeInterceptor }],
})
export class AppModule {}
