import { Module } from '@nestjs/common';
import { SharedModule } from '@core/modules/shared.module';
import { LumeService } from './services/lume.service';
import { LumeController } from './controllers/lume.controller';

@Module({
  imports: [SharedModule],
  controllers: [LumeController],
  providers: [LumeService],
  exports: [LumeService],
})
export class LumeModule {}
