import type { H3Event } from 'h3';

interface AuthUser {
  id: number;
  email: string;
  username: string;
  is_superuser: boolean;
  current_company_id: number | null;
}

/**
 * Extract and verify the JWT token from the Authorization header.
 * Returns the decoded user payload or null.
 */
export async function getAuthUser(event: H3Event): Promise<AuthUser | null> {
  const authHeader = getHeader(event, 'authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  if (!payload || payload.type !== 'access') {
    return null;
  }

  // Load user from DB
  const db = useDB();
  const { User } = await import('../models/index');

  const user = await User.findByPk(payload.sub, {
    attributes: ['id', 'email', 'username', 'is_superuser', 'is_active', 'current_company_id'],
  });

  if (!user || !user.getDataValue('is_active')) {
    return null;
  }

  return {
    id: user.getDataValue('id'),
    email: user.getDataValue('email'),
    username: user.getDataValue('username'),
    is_superuser: user.getDataValue('is_superuser'),
    current_company_id: payload.company_id || user.getDataValue('current_company_id'),
  };
}

/**
 * Require authentication. Throws 401 if not authenticated.
 */
export async function requireAuth(event: H3Event): Promise<AuthUser> {
  const user = await getAuthUser(event);
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Authentication required',
    });
  }
  return user;
}

/**
 * Require a specific permission. Throws 403 if not authorized.
 */
export async function requirePermission(
  event: H3Event,
  permissionCodename: string,
): Promise<AuthUser> {
  const user = await requireAuth(event);

  // Superusers have all permissions
  if (user.is_superuser) {
    return user;
  }

  // Check permission via RBAC service
  const { checkUserPermission } = await import('../services/rbac.service');
  const hasPermission = await checkUserPermission(
    user.id,
    permissionCodename,
    user.current_company_id,
  );

  if (!hasPermission) {
    throw createError({
      statusCode: 403,
      statusMessage: `Permission denied: ${permissionCodename}`,
    });
  }

  return user;
}
