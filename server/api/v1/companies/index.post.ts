import { Company } from '~/server/models/index';

export default defineEventHandler(async (event) => {
  const authUser = await requirePermission(event, 'company.create');
  const body = await readBody(event);

  if (!body.name || !body.code) {
    throw createError({ statusCode: 400, statusMessage: 'Name and code are required' });
  }

  const company = await Company.create({ ...body, created_by: authUser.id } as any);
  return successResponse(company, 'Company created successfully');
});
