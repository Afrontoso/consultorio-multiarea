import { Module } from '@nestjs/common';
import { TenantMemberGuard } from '../../common/guards/tenant-member.guard';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';

@Module({
  controllers: [AppointmentsController],
  providers: [AppointmentsService, TenantMemberGuard],
})
export class AppointmentsModule {}
