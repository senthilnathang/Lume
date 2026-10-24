import { Module } from '@nestjs/common';
import { SharedModule } from '@core/modules/shared.module';
import { SecurityAuditService } from './services/security-audit.service';
import { SecurityAuditController } from './controllers/security-audit.controller';

@Module({
  imports: [SharedModule],
  controllers: [SecurityAuditController],
  providers: [SecurityAuditService],
  exports: [SecurityAuditService],
})
export class SecurityAuditModule {}
