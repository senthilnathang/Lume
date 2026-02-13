import { createCrudService } from '~/server/services/crud.mixin';
import { AuditLog } from '~/server/models/index';

const auditService = createCrudService(AuditLog, {
  searchFields: ['entity_type', 'entity_name', 'description'],
});

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'audit.read');
  const { page, pageSize } = getPaginationParams(event);
  const { search, sortBy, sortOrder } = getSearchParams(event);
  const query = getQuery(event);

  const filters: any = {};
  if (query.user_id) filters.user_id = parseInt(query.user_id as string);
  if (query.action) filters.action = query.action;
  if (query.entity_type) filters.entity_type = query.entity_type;

  const result = await auditService.list({ page, pageSize, search, sortBy, sortOrder, filters });
  return paginatedResponse(result.items, result.total, page, pageSize);
});
