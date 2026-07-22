import { Module } from '@nestjs/common';
import { TenantMemberGuard } from '../../common/guards/tenant-member.guard';
import { ProfessionalsController } from './professionals.controller';
import { ProfessionalsService } from './professionals.service';

@Module({
  controllers: [ProfessionalsController],
  providers: [ProfessionalsService, TenantMemberGuard],
  exports: [ProfessionalsService],
})
export class ProfessionalsModule {}
