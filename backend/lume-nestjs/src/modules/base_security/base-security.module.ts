import { Module } from '@nestjs/common';
import { SharedModule } from '@core/modules/shared.module';
import { BaseSecurityController } from './controllers/base-security.controller';
import { BaseSecurityService } from './services/base-security.service';

@Module({
  imports: [SharedModule],
  controllers: [BaseSecurityController],
  providers: [BaseSecurityService],
  exports: [BaseSecurityService],
})
export class BaseSecurityModule {}
