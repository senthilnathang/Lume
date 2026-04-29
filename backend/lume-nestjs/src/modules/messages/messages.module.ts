import { Module } from '@nestjs/common';
import { SharedModule } from '@core/modules/shared.module';
import { MessagesService } from './services/messages.service';
import { MessagesController } from './controllers/messages.controller';

@Module({
  imports: [SharedModule],
  controllers: [MessagesController],
  providers: [MessagesService],
  exports: [MessagesService],
})
export class MessagesModule {}
