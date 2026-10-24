import { Body, ConflictException, Controller, Delete, Get, NotFoundException, Param, Post, Put, UseGuards } from '@nestjs/common';
import { IsNotEmpty, IsOptional, IsString, MaxLength, IsBoolean } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { Transform } from 'class-transformer';
import { PrismaService } from '@core/services/prisma.service';
import { ParseIntPipe } from '@core/pipes/parse-int.pipe';
import { JwtAuthGuard } from '@modules/auth/guards/jwt.guard';
import { PolicyGuard, RequireRoles } from '@core/permission/policy.guard';

export class GroupInput {
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateGroupInput extends PartialType(GroupInput) {}

@Controller('admin/groups')
@UseGuards(JwtAuthGuard, PolicyGuard)
@RequireRoles('admin', 'super_admin')
export class AdminGroupsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list() {
    return { success: true, data: await this.prisma.group.findMany({ orderBy: { name: 'asc' } }) };
  }

  @Get(':id')
  async get(@Param('id', ParseIntPipe) id: number) {
    const data = await this.prisma.group.findUnique({ where: { id } });
    if (!data) throw new NotFoundException('Group not found');
    return { success: true, data };
  }

  private async write(operation: () => Promise<unknown>) {
    try { return { success: true, data: await operation() }; }
    catch (error) {
      if (error.code === 'P2002') throw new ConflictException('A group with this name already exists');
      if (error.code === 'P2025') throw new NotFoundException('Group not found');
      throw error;
    }
  }

  @Post()
  create(@Body() input: GroupInput) {
    return this.write(() => this.prisma.group.create({ data: {
      name: input.name, description: input.description, isActive: input.isActive ?? true,
      createdAt: new Date(), updatedAt: new Date(),
    } }));
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() input: UpdateGroupInput) {
    return this.write(() => this.prisma.group.update({ where: { id }, data: {
      name: input.name, description: input.description, isActive: input.isActive, updatedAt: new Date(),
    } }));
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.write(() => this.prisma.group.delete({ where: { id } }));
  }
}
