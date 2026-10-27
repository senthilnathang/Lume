import { Controller, Get, Post, Req, Param, Query, UseGuards, ParseIntPipe, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@core/services/prisma.service';
import { RbacService } from '@core/services/rbac.service';
import { JwtAuthGuard } from '../guards/jwt.guard';
import { resolveTenant } from '../../../graphql/tenant';
import builtinNavigation from '../builtin-navigation.json';

@Controller('account')
@UseGuards(JwtAuthGuard)
export class AccountController {
  constructor(private prisma: PrismaService, private rbac: RbacService) {}

  @Get('permissions')
  async permissions(@Req() req: any) {
    const codes = await this.rbac.getUserPermissions(req.user.id);
    return { success: true, data: codes };
  }

  @Get('menus')
  async menus(@Req() req: any) {
    const { data: codes } = await this.permissions(req);
    const rows = await this.prisma.menu.findMany({ where: { isActive: true }, orderBy: { sequence: 'asc' } });
    const allowed = rows.filter(row => !row.permission || codes.includes('*') || codes.includes(row.permission));
    const ids = new Set(allowed.map(row => row.id));
    const build = (parentId: number | null, ancestors = new Set<number>()): any[] => allowed
      .filter(row => parentId === null ? row.parentId === null || !ids.has(row.parentId) : row.parentId === parentId)
      .filter(row => !ancestors.has(row.id))
      .map(row => ({ ...row, parent_id: row.parentId,
        children: build(row.id, new Set([...ancestors, row.id])) }));
    const configured = build(null);
    const filterDefaults = (items: any[]): any[] => items.flatMap(item => {
      const children = filterDefaults(item.children || []);
      const canRead = codes.includes('*') || (item.permission && codes.includes(item.permission));
      return canRead || children.length ? [{ ...item, children }] : [];
    });
    const configuredPaths = new Set(rows.map(row => row.path));
    const defaults = filterDefaults(builtinNavigation).filter(item => !configuredPaths.has(item.path));
    return { success: true, data: [...configured, ...defaults].sort((a, b) => (a.sequence || 10) - (b.sequence || 10)) };
  }

  @Get('dashboard')
  async dashboard(@Req() req: any) {
    const count = async (permission: string, query: () => Promise<number>) =>
      await this.rbac.hasPermission(req.user.id, permission) ? query() : 0;
    const [users, donations, activities, documents] = await Promise.all([
      count('read_user', () => this.prisma.user.count()),
      count('donations.view', async () => Number((await this.prisma.donations.aggregate({ _sum: { amount: true } }))._sum.amount || 0)),
      count('activities.view', () => this.prisma.activities.count()),
      count('documents.view', () => this.prisma.documents.count()),
    ]);
    return { success: true, data: { stats: { users, donations, activities, documents } } };
  }

  private notificationScope(req: any) {
    const company = resolveTenant(req);
    return { user_id: req.user.id, OR: company === null ? [{ company_id: null }] : [{ company_id: null }, { company_id: company }] };
  }

  @Get('notifications')
  async notifications(@Req() req: any, @Query('limit') rawLimit = '20') {
    const limit = Number(rawLimit);
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw new BadRequestException('Invalid limit');
    const rows = await this.prisma.notifications.findMany({
      where: { ...this.notificationScope(req), status: { not: 'dismissed' } },
      orderBy: { id: 'desc' }, take: limit,
    });
    return { success: true, data: rows.map(row => ({ ...row, isRead: row.status === 'read', createdAt: row.created_at })) };
  }

  @Get('notifications/unread-count')
  async unread(@Req() req: any) {
    const count = await this.prisma.notifications.count({ where: { ...this.notificationScope(req), status: 'unread' } });
    return { success: true, data: { count } };
  }

  @Post('notifications/read-all')
  async readAll(@Req() req: any) {
    await this.prisma.notifications.updateMany({ where: { ...this.notificationScope(req), status: 'unread' }, data: { status: 'read', read_at: new Date() } });
    return { success: true, data: { updated: true } };
  }

  @Post('notifications/:id/read')
  async read(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    const result = await this.prisma.notifications.updateMany({ where: { ...this.notificationScope(req), id }, data: { status: 'read', read_at: new Date() } });
    if (!result.count) throw new NotFoundException('Notification not found');
    return { success: true, data: { updated: true } };
  }
}
