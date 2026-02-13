import { getModuleList } from '~/server/modules/_loader';

/**
 * GET /api/v1/modules — List all loaded modules
 */
export default defineEventHandler(async (event) => {
  await requireAuth(event);

  const modules = getModuleList();

  return {
    success: true,
    data: modules,
  };
});
