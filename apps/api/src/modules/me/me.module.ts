import { Module } from '@nestjs/common';
import { TenantAnyMemberGuard } from '../../common/guards/tenant-any-member.guard';
import { AppointmentsModule } from '../appointments/appointments.module';
import { ProfessionalsModule } from '../professionals/professionals.module';
import { MeController } from './me.controller';
import { MeScheduleController } from './me-schedule.controller';

@Module({
  imports: [AppointmentsModule, ProfessionalsModule],
  controllers: [MeController, MeScheduleController],
  providers: [TenantAnyMemberGuard],
})
export class MeModule {}
