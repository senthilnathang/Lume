import { Module } from '@nestjs/common';
import { SharedModule } from '@core/modules/shared.module';
import { EditorService } from './services/editor.service';
import { EditorController } from './controllers/editor.controller';

@Module({
  imports: [SharedModule],
  controllers: [EditorController],
  providers: [EditorService],
  exports: [EditorService],
})
export class EditorModule {}
