import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '@modules/auth/guards/jwt.guard';
import { RbacGuard } from '@core/guards/rbac.guard';
import { TeamService } from '../services/team.service';
import {
  CreateTeamMemberDto,
  UpdateTeamMemberDto,
  QueryTeamMembersDto,
  ReorderTeamMembersDto,
} from '../dtos';
import { Public, Permissions } from '@core/decorators';
import { ParseIntPipe } from '@nestjs/common';

@Controller('api/team')
export class TeamController {
  constructor(private teamService: TeamService) {}

  @Get('active')
  @Public()
  async getActive() {
    return this.teamService.getActive();
  }

  @Get('leaders')
  @Public()
  async getLeaders() {
    return this.teamService.getLeaders();
  }

  @Get('departments')
  @Public()
  async getDepartments() {
    return this.teamService.getDepartments();
  }

  @Get('department/:department')
  @Public()
  async getByDepartment(@Param('department') department: string) {
    return this.teamService.getByDepartment(department);
  }

  @Get()
  @Public()
  async findAll(@Query() query: QueryTeamMembersDto) {
    return this.teamService.findAll(query);
  }

  @Get(':id')
  @Public()
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.teamService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('team.write')
  async create(@Body() createDto: CreateTeamMemberDto) {
    return this.teamService.create(createDto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('team.write')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateTeamMemberDto,
  ) {
    return this.teamService.update(id, updateDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('team.delete')
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.teamService.delete(id);
  }

  @Post('reorder')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('team.write')
  async reorder(@Body() reorderDto: ReorderTeamMembersDto) {
    return this.teamService.reorder(reorderDto);
  }
}
