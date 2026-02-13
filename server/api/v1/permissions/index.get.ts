import { createCrudService } from '~/server/services/crud.mixin';
import { Permission } from '~/server/models/index';

const permService = createCrudService(Permission, {
  searchFields: ['name', 'codename', 'resource'],
});

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'permission.read');
  const { page, pageSize } = getPaginationParams(event);
  const { search, sortBy, sortOrder } = getSearchParams(event);
  const query = getQuery(event);

  const filters: any = {};
  if (query.category) filters.category = query.category;
  if (query.action) filters.action = query.action;
  if (query.module) filters.module = query.module;

  const result = await permService.list({ page, pageSize, search, sortBy, sortOrder, filters });
  return paginatedResponse(result.items, result.total, page, pageSize);
});
