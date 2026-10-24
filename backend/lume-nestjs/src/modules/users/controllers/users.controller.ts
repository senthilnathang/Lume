import { Controller, Get, Post, Body, Param, Put, Delete, Query, UseGuards } from '@nestjs/common';
import { UsersService } from '../services/users.service';
import { CreateUserDto, UpdateUserDto } from '../dtos';
import { JwtAuthGuard } from '@modules/auth/guards/jwt.guard';
import { Permissions } from '@core/decorators';
import { RbacGuard } from '@core/guards/rbac.guard';
import { ParseIntPipe } from '@core/pipes/parse-int.pipe';

@Controller('users')
@UseGuards(JwtAuthGuard, RbacGuard)
@Permissions('read_user')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get()
  async findAll(@Query('role') role?: string, @Query('limit') limit?: number,
    @Query('page') page?: number, @Query('search') search?: string) {
    return this.service.findAll({ role, limit, page, search });
  }

  @Get('fields')
  async getFields() {
    return this.service.getFields();
  }

  @Get('stats')
  async stats() {
    return this.service.stats();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @Permissions('create_user')
  async create(@Body() dto: CreateUserDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @Permissions('update_user')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Permissions('delete_user')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }

  @Post('bulk')
  @Permissions('create_user')
  async bulkCreate(@Body() dtos: CreateUserDto[]) {
    return this.service.bulkCreate(dtos);
  }

  @Delete('bulk')
  @Permissions('delete_user')
  async bulkDelete(@Body() ids: number[]) {
    return this.service.bulkDelete(ids);
  }
}
