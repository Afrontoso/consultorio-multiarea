import { Module } from '@nestjs/common';
import { TenantMemberGuard } from '../../common/guards/tenant-member.guard';
import { PatientsController } from './patients.controller';
import { PatientsService } from './patients.service';

@Module({
  controllers: [PatientsController],
  providers: [PatientsService, TenantMemberGuard],
})
export class PatientsModule {}
