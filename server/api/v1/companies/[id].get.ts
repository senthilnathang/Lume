import { Company } from '~/server/models/index';

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'company.read');
  const id = parseInt(getRouterParam(event, 'id') || '');
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Invalid company ID' });

  const company = await Company.findByPk(id, {
    include: [{ association: 'subsidiaries' }],
  });
  if (!company) throw createError({ statusCode: 404, statusMessage: 'Company not found' });

  return successResponse(company);
});
