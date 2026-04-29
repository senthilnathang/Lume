import { Module } from '@nestjs/common';
import { SharedModule } from '@core/modules/shared.module';
import { BaseRbacService } from './services/base-rbac.service';

@Module({
  imports: [SharedModule],
  providers: [BaseRbacService],
  exports: [BaseRbacService],
})
export class BaseRbacModule {}
