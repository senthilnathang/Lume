import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '@modules/auth/guards/jwt.guard';
import { RbacGuard } from '@core/guards/rbac.guard';
import { RbacService } from '../services/rbac.service';
import {
  CreateRoleDto,
  UpdateRoleDto,
  CreatePermissionDto,
  CreateAccessRuleDto,
  UpdateAccessRuleDto,
} from '../dtos';
import { Permissions } from '@core/decorators';

@Controller('api/rbac')
export class RbacController {
  constructor(private rbacService: RbacService) {}

  // ============ Roles ============

  @Get('roles')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('rbac.roles.read')
  async getAllRoles() {
    return this.rbacService.getAllRoles();
  }

  @Get('roles/:id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('rbac.roles.read')
  async getRoleById(@Param('id', ParseIntPipe) id: number) {
    return this.rbacService.getRoleById(id);
  }

  @Post('roles')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('rbac.roles.write')
  async createRole(@Body() dto: CreateRoleDto) {
    return this.rbacService.createRole(dto);
  }

  @Put('roles/:id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('rbac.roles.write')
  async updateRole(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRoleDto) {
    return this.rbacService.updateRole(id, dto);
  }

  @Delete('roles/:id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('rbac.roles.delete')
  async deleteRole(@Param('id', ParseIntPipe) id: number) {
    return this.rbacService.deleteRole(id);
  }

  // ============ Permissions ============

  @Get('permissions')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('rbac.permissions.read')
  async getAllPermissions() {
    return this.rbacService.getAllPermissions();
  }

  @Get('permissions/grouped')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('rbac.permissions.read')
  async getPermissionsGrouped() {
    return this.rbacService.getPermissionsGrouped();
  }

  @Post('permissions')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('rbac.permissions.write')
  async createPermission(@Body() dto: CreatePermissionDto) {
    return this.rbacService.createPermission(dto);
  }

  // ============ Access Rules ============

  @Get('rules')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('rbac.rules.read')
  async getAllRules() {
    return this.rbacService.getAllRules();
  }

  @Post('rules')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('rbac.rules.write')
  async createRule(@Body() dto: CreateAccessRuleDto) {
    return this.rbacService.createRule(dto);
  }

  @Put('rules/:id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('rbac.rules.write')
  async updateRule(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAccessRuleDto) {
    return this.rbacService.updateRule(id, dto);
  }

  @Delete('rules/:id')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('rbac.rules.write')
  async deleteRule(@Param('id', ParseIntPipe) id: number) {
    return this.rbacService.deleteRule(id);
  }
}
