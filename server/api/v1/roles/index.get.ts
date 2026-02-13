import { createCrudService } from '~/server/services/crud.mixin';
import { Role } from '~/server/models/index';

const roleService = createCrudService(Role, {
  searchFields: ['name', 'codename'],
  companyScoped: true,
});

export default defineEventHandler(async (event) => {
  const authUser = await requirePermission(event, 'role.read');
  const { page, pageSize } = getPaginationParams(event);
  const { search, sortBy, sortOrder } = getSearchParams(event);

  const result = await roleService.list({
    page, pageSize, search, sortBy, sortOrder,
    companyId: authUser.current_company_id,
  });

  return paginatedResponse(result.items, result.total, page, pageSize);
});
