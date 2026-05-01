import { Module } from '@nestjs/common';
import { SharedModule } from '@core/modules/shared.module';
import { PlatformConfigService } from './services/platform-config.service';
import { PlatformConfigController } from './controllers/platform-config.controller';

@Module({
  imports: [SharedModule],
  controllers: [PlatformConfigController],
  providers: [PlatformConfigService],
  exports: [PlatformConfigService],
})
export class PlatformConfigModule {}
