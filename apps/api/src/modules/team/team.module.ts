import { Module } from '@nestjs/common';
import { SharedModule } from '@core/modules/shared.module';
import { TeamController } from './controllers/team.controller';
import { TeamService } from './services/team.service';

@Module({
  imports: [SharedModule],
  controllers: [TeamController],
  providers: [TeamService],
  exports: [TeamService],
})
export class TeamModule {}
