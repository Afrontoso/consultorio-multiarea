import { Module } from '@nestjs/common';
import { TenantMemberGuard } from '../../common/guards/tenant-member.guard';
import { ServicesController } from './services.controller';
import { ServicesService } from './services.service';

@Module({
  controllers: [ServicesController],
  providers: [ServicesService, TenantMemberGuard],
})
export class ServicesModule {}
