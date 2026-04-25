import { Controller, Get, Post, Body, Param, Put, Delete, Query, UseGuards } from '@nestjs/common';
import { UsersService } from '../services/users.service';
import { CreateUserDto, UpdateUserDto } from '../dtos';
import { RbacGuard } from '@core/guards/rbac.guard';
import { ParseIntPipe } from '@core/pipes/parse-int.pipe';

@Controller('users')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get()
  async findAll(@Query('role') role?: string, @Query('limit') limit?: number) {
    return this.service.findAll({ role, limit });
  }

  @Get('fields')
  async getFields() {
    return this.service.getFields();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @UseGuards(RbacGuard)
  async create(@Body() dto: CreateUserDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @UseGuards(RbacGuard)
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RbacGuard)
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }

  @Post('bulk')
  @UseGuards(RbacGuard)
  async bulkCreate(@Body() dtos: CreateUserDto[]) {
    return this.service.bulkCreate(dtos);
  }

  @Delete('bulk')
  @UseGuards(RbacGuard)
  async bulkDelete(@Body() ids: number[]) {
    return this.service.bulkDelete(ids);
  }
}
