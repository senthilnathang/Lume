import { login } from '~/server/services/auth.service';
import { logActivity } from '~/server/services/activity.service';
import { createAuditLog } from '~/server/services/audit.service';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { identifier, password } = body;

  if (!identifier || !password) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Email/username and password are required',
    });
  }

  const ipAddress = event.context.clientIp;

  try {
    const result = await login(identifier, password, ipAddress);

    await logActivity({
      userId: result.user.id,
      action: 'login',
      category: 'authentication',
      entityType: 'user',
      entityId: result.user.id,
      ipAddress,
      description: result.requires2FA ? 'Login initiated (2FA required)' : 'Login successful',
    });

    if (!result.requires2FA) {
      await createAuditLog({
        userId: result.user.id,
        action: 'login',
        entityType: 'user',
        entityId: result.user.id,
        ipAddress,
        requestId: event.context.requestId,
      });
    }

    return {
      success: true,
      data: result,
    };
  } catch (error: any) {
    await logActivity({
      action: 'login_failed',
      category: 'authentication',
      level: 'warning',
      entityType: 'user',
      ipAddress,
      description: `Login failed for: ${identifier}`,
      success: false,
      errorMessage: error.statusMessage || 'Invalid credentials',
    });

    throw error;
  }
});
