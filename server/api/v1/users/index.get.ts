import { userService } from '~/server/services/user.service';

export default defineEventHandler(async (event) => {
  const authUser = await requirePermission(event, 'user.read');

  const { page, pageSize } = getPaginationParams(event);
  const { search, sortBy, sortOrder } = getSearchParams(event);

  const result = await userService.list({
    page,
    pageSize,
    search,
    sortBy,
    sortOrder,
    companyId: authUser.current_company_id,
  });

  return paginatedResponse(result.items, result.total, page, pageSize);
});
