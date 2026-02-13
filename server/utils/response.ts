import type { H3Event } from 'h3';

/**
 * Standard success response.
 */
export function successResponse<T>(data: T, message = 'Success') {
  return {
    success: true,
    message,
    data,
  };
}

/**
 * Standard paginated response.
 */
export function paginatedResponse<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
) {
  return {
    success: true,
    data: {
      items,
      total,
      page,
      page_size: pageSize,
      total_pages: Math.ceil(total / pageSize),
    },
  };
}

/**
 * Standard error response — throws createError from h3.
 */
export function errorResponse(
  statusCode: number,
  message: string,
  data?: unknown,
) {
  throw createError({
    statusCode,
    statusMessage: message,
    data,
  });
}

/**
 * Extract pagination params from query string.
 */
export function getPaginationParams(event: H3Event) {
  const query = getQuery(event);
  const page = Math.max(1, parseInt(query.page as string) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(query.page_size as string) || parseInt(query.limit as string) || 20));
  const skip = (page - 1) * pageSize;

  return { page, pageSize, skip };
}

/**
 * Extract search/filter params from query string.
 */
export function getSearchParams(event: H3Event) {
  const query = getQuery(event);
  return {
    search: (query.search as string) || '',
    sortBy: (query.sort_by as string) || 'created_at',
    sortOrder: ((query.sort_order as string) || 'DESC').toUpperCase() as 'ASC' | 'DESC',
  };
}
