import { logActivity } from '~/server/services/activity.service';
import { createAuditLog } from '~/server/services/audit.service';

export default defineEventHandler(async (event) => {
  const authUser = await requireAuth(event);

  await logActivity({
    userId: authUser.id,
    action: 'logout',
    category: 'authentication',
    entityType: 'user',
    entityId: authUser.id,
    ipAddress: event.context.clientIp,
  });

  await createAuditLog({
    userId: authUser.id,
    action: 'logout',
    entityType: 'user',
    entityId: authUser.id,
    ipAddress: event.context.clientIp,
    requestId: event.context.requestId,
  });

  // Token invalidation would happen here if using a blocklist (Redis)
  return {
    success: true,
    message: 'Logged out successfully',
  };
});
