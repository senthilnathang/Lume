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
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '@modules/auth/guards/jwt.guard';
import { RbacGuard } from '@core/guards/rbac.guard';
import { ActivitiesService } from '../services/activities.service';
import { CreateActivityDto, UpdateActivityDto, QueryActivitiesDto } from '../dtos';
import { Public, Permissions, CurrentUser } from '@core/decorators';
import { ParseIntPipe } from '@nestjs/common';

@Controller('api/activities')
export class ActivitiesController {
  constructor(private activitiesService: ActivitiesService) {}

  @Get()
  @Public()
  async findAll(@Query() query: QueryActivitiesDto) {
    return this.activitiesService.findAll(query);
  }

  @Get('upcoming')
  @Public()
  async getUpcoming(@Query('limit') limit?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : 10;
    if (isNaN(parsedLimit) || parsedLimit < 1) {
      throw new BadRequestException('Limit must be a positive integer');
    }
    return this.activitiesService.getUpcoming(parsedLimit);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('activities.read')
  async getStats() {
    return this.activitiesService.getStats();
  }

  @Get('by-slug/:slug')
  @Public()
  async findBySlug(@Param('slug') slug: string) {
    return this.activitiesService.findBySlug(slug);
  }

  @Get(':id')
  @Public()
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.activitiesService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('activities.write')
  async create(@Body() createDto: CreateActivityDto, @CurrentUser() user: any) {
    return this.activitiesService.create(createDto, user.id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('activities.write')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateActivityDto,
  ) {
    return this.activitiesService.update(id, updateDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('activities.delete')
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.activitiesService.delete(id);
  }

  @Post(':id/publish')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('activities.write')
  async publish(@Param('id', ParseIntPipe) id: number) {
    return this.activitiesService.publish(id);
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('activities.write')
  async cancel(@Param('id', ParseIntPipe) id: number) {
    return this.activitiesService.cancel(id);
  }
}
