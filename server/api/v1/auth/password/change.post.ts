import { changePassword } from '~/server/services/auth.service';
import { createAuditLog } from '~/server/services/audit.service';

export default defineEventHandler(async (event) => {
  const authUser = await requireAuth(event);
  const body = await readBody(event);
  const { current_password, new_password } = body;

  if (!current_password || !new_password) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Current and new password are required',
    });
  }

  await changePassword(authUser.id, current_password, new_password);

  await createAuditLog({
    userId: authUser.id,
    action: 'password_change',
    entityType: 'user',
    entityId: authUser.id,
    ipAddress: event.context.clientIp,
    requestId: event.context.requestId,
  });

  return {
    success: true,
    message: 'Password changed successfully',
  };
});
