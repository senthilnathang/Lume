import { createCrudService } from '~/server/services/crud.mixin';
import { Company } from '~/server/models/index';

const companyService = createCrudService(Company, {
  searchFields: ['name', 'code'],
});

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'company.read');
  const { page, pageSize } = getPaginationParams(event);
  const { search, sortBy, sortOrder } = getSearchParams(event);

  const result = await companyService.list({ page, pageSize, search, sortBy, sortOrder });
  return paginatedResponse(result.items, result.total, page, pageSize);
});
