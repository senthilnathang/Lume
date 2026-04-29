import { Module } from '@nestjs/common';
import { SharedModule } from '@core/modules/shared.module';
import { AuditService } from './services/audit.service';
import { AuditController } from './controllers/audit.controller';

@Module({
  imports: [SharedModule],
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
