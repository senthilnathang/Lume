import { Module } from '@nestjs/common';
import { SharedModule } from '@core/modules/shared.module';
import { RbacService } from './services/rbac.service';
import { RbacController } from './controllers/rbac.controller';

@Module({
  imports: [SharedModule],
  controllers: [RbacController],
  providers: [RbacService],
  exports: [RbacService],
})
export class RbacModule {}
