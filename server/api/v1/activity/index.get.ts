import { createCrudService } from '~/server/services/crud.mixin';
import { ActivityLog } from '~/server/models/index';

const activityService = createCrudService(ActivityLog, {
  searchFields: ['action', 'entity_type', 'description'],
});

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'audit.read');
  const { page, pageSize } = getPaginationParams(event);
  const { search, sortBy, sortOrder } = getSearchParams(event);
  const query = getQuery(event);

  const filters: any = {};
  if (query.user_id) filters.user_id = parseInt(query.user_id as string);
  if (query.category) filters.category = query.category;
  if (query.level) filters.level = query.level;
  if (query.entity_type) filters.entity_type = query.entity_type;

  const result = await activityService.list({ page, pageSize, search, sortBy, sortOrder, filters });
  return paginatedResponse(result.items, result.total, page, pageSize);
});
