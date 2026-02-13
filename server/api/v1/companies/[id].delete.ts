import { Company } from '~/server/models/index';

export default defineEventHandler(async (event) => {
  const authUser = await requirePermission(event, 'company.delete');
  const id = parseInt(getRouterParam(event, 'id') || '');
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Invalid company ID' });

  const company = await Company.findByPk(id);
  if (!company) throw createError({ statusCode: 404, statusMessage: 'Company not found' });

  await company.update({ is_deleted: true, deleted_at: new Date(), updated_by: authUser.id });
  return successResponse(null, 'Company deleted');
});
