import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '@core/services/prisma.service';
import { RbacService } from '@core/services/rbac.service';
import { SecurityService } from './security.service';
import { FieldPermissionService } from './field-permission.service';

interface SearchResult { id: number; title: string; description: string; model: string; group: string }

@Injectable()
export class SearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rbac: RbacService,
    private readonly security: SecurityService,
    private readonly fields: FieldPermissionService,
  ) {}

  async search(userId: number, companyId: number, query: unknown, requestedLimit: unknown = '20') {
    if (typeof query !== 'string' || query.length > 200 ||
        !/^[1-9]\d*$/.test(String(requestedLimit)) || Number(requestedLimit) > 50) {
      throw new BadRequestException('Search requires q (up to 200 characters) and limit between 1 and 50');
    }
    const q = query.trim();
    const limit = Number(requestedLimit);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new ForbiddenException('User identity required');
    const role = await this.prisma.role.findUnique({ where: { id: user.role_id } });
    if (!role || !role.isActive) throw new ForbiddenException('Active role required');
    const results: SearchResult[] = [];
    if (!q) return { results, total: 0, query: q };
    const needle = q.toLowerCase();
    const rank = (title: string) => title.toLowerCase() === needle ? 0 : title.toLowerCase().startsWith(needle) ? 1 : 2;
    const collect = (row: SearchResult) => {
      if (!row.title.toLowerCase().includes(needle)) return;
      results.push(row);
      results.sort((a, b) => rank(a.title) - rank(b.title) || a.title.localeCompare(b.title) || a.model.localeCompare(b.model) || a.id - b.id);
      if (results.length > limit) results.pop();
    };
    const context = { userId, roleId: user.role_id };
    if (await this.rbac.hasPermission(userId, 'base.records.read')) {
      const predicates = new Map<number, (data: Record<string, unknown>) => boolean>();
      let after = 0;
      while (true) {
        const batch = await this.prisma.entityRecord.findMany({
          where: { companyId, deletedAt: null, id: { gt: after }, entity: { deletedAt: null },
            ...(!this.rbac.isAdminRole(role.name) ? { OR: [{ visibility: { not: 'private' } }, { createdBy: userId }] } : {}),
          },
          include: { entity: { select: { name: true } } }, orderBy: { id: 'asc' }, take: 200,
        });
        if (!batch.length) break;
        for (const record of batch) {
          let data: Record<string, unknown>;
          try { data = JSON.parse(record.data); } catch { continue; }
          if (!data || typeof data !== 'object' || Array.isArray(data)) continue;
          if (!predicates.has(record.entityId)) predicates.set(record.entityId,
            await this.security.recordPredicate(['EntityRecord', 'entity_records', record.entity.name], 'read', context));
          if (!predicates.get(record.entityId)!(data)) continue;
          // Filter before matching: hidden field values must not influence search results.
          data = await this.fields.filterRecordForRole(record.entityId, data, user.role_id);
          const title = ['title', 'name', 'subject', 'label'].map(key => data[key]).find(value => typeof value === 'string' && value.length);
          if (typeof title !== 'string') continue;
          collect({ id: record.id, title, description: String(data.description || data.excerpt || '').slice(0, 140), model: record.entity.name, group: 'Records' });
        }
        after = batch[batch.length - 1].id;
      }
    }
    if (await this.rbac.hasPermission(userId, 'documents.read')) {
      // Documents have no tenant column. Only explicitly public files or the actor's
      // own uploads are discoverable; an admin role does not expose others' private files.
      const allowed = await this.security.recordPredicate(['documents'], 'read', context);
      let after = 0;
      while (true) {
        const batch = await this.prisma.documents.findMany({
          where: { deleted_at: null, id: { gt: after }, OR: [{ is_public: true }, { uploaded_by: userId }] },
          orderBy: { id: 'asc' }, take: 200,
        });
        if (!batch.length) break;
        for (const row of batch) {
          if (allowed(row)) collect({ id: row.id, title: row.title, description: (row.description || '').slice(0, 140), model: 'documents', group: 'Documents' });
        }
        after = batch[batch.length - 1].id;
      }
    }
    return { results, total: results.length, query: q };
  }
}
