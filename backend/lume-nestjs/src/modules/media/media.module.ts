import { Module } from '@nestjs/common';
import { SharedModule } from '@core/modules/shared.module';
import { MediaService } from './services/media.service';
import { MediaController } from './controllers/media.controller';

@Module({
  imports: [SharedModule],
  controllers: [MediaController],
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule {}
