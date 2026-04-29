import { Module } from '@nestjs/common';
import { SharedModule } from '@core/modules/shared.module';
import { DocumentsController } from './controllers/documents.controller';
import { DocumentsService } from './services/documents.service';

@Module({
  imports: [SharedModule],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
