import { userService } from '~/server/services/user.service';
import { auditCrudOperation } from '~/server/services/audit.service';

export default defineEventHandler(async (event) => {
  const authUser = await requirePermission(event, 'user.create');
  const body = await readBody(event);

  const { email, username, password, full_name, is_superuser, company_id, role_id } = body;

  if (!email || !username || !password) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Email, username, and password are required',
    });
  }

  const user = await userService.createUser({
    email,
    username,
    password,
    full_name,
    is_superuser,
    company_id: company_id || authUser.current_company_id,
    role_id,
  });

  await auditCrudOperation({
    userId: authUser.id,
    companyId: authUser.current_company_id,
    action: 'create',
    entityType: 'user',
    entityId: user.id,
    entityName: email,
    newValues: { email, username, full_name },
    ipAddress: event.context.clientIp,
    requestId: event.context.requestId,
  });

  return successResponse(user, 'User created successfully');
});
