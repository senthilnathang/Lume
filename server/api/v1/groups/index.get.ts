import { createCrudService } from '~/server/services/crud.mixin';
import { Group } from '~/server/models/index';

const groupService = createCrudService(Group, {
  searchFields: ['name', 'codename'],
  companyScoped: true,
});

export default defineEventHandler(async (event) => {
  const authUser = await requirePermission(event, 'group.read');
  const { page, pageSize } = getPaginationParams(event);
  const { search, sortBy, sortOrder } = getSearchParams(event);

  const result = await groupService.list({
    page, pageSize, search, sortBy, sortOrder,
    companyId: authUser.current_company_id,
  });

  return paginatedResponse(result.items, result.total, page, pageSize);
});
