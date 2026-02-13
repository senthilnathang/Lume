import { register } from '~/server/services/auth.service';
import { logActivity } from '~/server/services/activity.service';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { email, username, password, full_name, company_id } = body;

  if (!email || !username || !password) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Email, username, and password are required',
    });
  }

  const result = await register({
    email,
    username,
    password,
    full_name,
    company_id,
  });

  await logActivity({
    userId: result.user.id,
    action: 'register',
    category: 'authentication',
    entityType: 'user',
    entityId: result.user.id,
    ipAddress: event.context.clientIp,
    description: `New user registered: ${email}`,
  });

  return {
    success: true,
    message: 'Registration successful',
    data: result,
  };
});
