import { Company } from '~/server/models/index';

export default defineEventHandler(async (event) => {
  const authUser = await requirePermission(event, 'company.update');
  const id = parseInt(getRouterParam(event, 'id') || '');
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Invalid company ID' });

  const company = await Company.findByPk(id);
  if (!company) throw createError({ statusCode: 404, statusMessage: 'Company not found' });

  const body = await readBody(event);
  await company.update({ ...body, updated_by: authUser.id });

  return successResponse(company, 'Company updated');
});
