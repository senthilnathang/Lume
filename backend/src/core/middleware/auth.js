import { jwtUtil, responseUtil } from '../../shared/utils/index.js';
import prisma, { setAuditContext } from '../db/prisma.js';
import { MESSAGES } from '../../shared/constants/index.js';
import crypto from 'crypto';

// Lazy-loaded DrizzleAdapter for API keys and sessions
let _apiKeyAdapter = null;
let _sessionAdapter = null;

async function getApiKeyAdapter() {
  if (!_apiKeyAdapter) {
    const { DrizzleAdapter } = await import('../db/adapters/drizzle-adapter.js');
    const { apiKeys } = await import('../../modules/base_security/models/schema.js');
    _apiKeyAdapter = new DrizzleAdapter(apiKeys);
  }
  return _apiKeyAdapter;
}

async function getSessionAdapter() {
  if (!_sessionAdapter) {
    const { DrizzleAdapter } = await import('../db/adapters/drizzle-adapter.js');
    const { sessions } = await import('../../modules/base_security/models/schema.js');
    _sessionAdapter = new DrizzleAdapter(sessions);
  }
  return _sessionAdapter;
}

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const apiKeyHeader = req.headers['x-api-key'];

    // ─── API Key Authentication ───
    if (apiKeyHeader) {
      try {
        const adapter = await getApiKeyAdapter();
        const hash = crypto.createHash('sha256').update(apiKeyHeader).digest('hex');
        const apiKey = await adapter.findOne([['key', '=', hash], ['status', '=', 'active']]);

        if (!apiKey) {
          return res.status(401).json(responseUtil.unauthorized('Invalid API key'));
        }

        if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
          await adapter.update(apiKey.id, { status: 'expired' });
          return res.status(401).json(responseUtil.unauthorized('API key expired'));
        }

        // Update last used
        adapter.update(apiKey.id, { lastUsedAt: new Date() }).catch(() => {});

        // Resolve user from API key
        const user = apiKey.userId ? await prisma.user.findUnique({ where: { id: apiKey.userId } }) : null;
        if (!user || !user.isActive) {
          return res.status(401).json(responseUtil.unauthorized('API key user not found or inactive'));
        }

        const role = await prisma.role.findUnique({ where: { id: user.role_id } });
        req.user = {
          id: user.id,
          email: user.email,
          role: role?.name || 'viewer',
          role_id: user.role_id,
          authMethod: 'api_key',
          apiKeyScopes: typeof apiKey.scopes === 'string' ? JSON.parse(apiKey.scopes) : (apiKey.scopes || []),
        };

        setAuditContext({
          userId: user.id,
          ipAddress: req.ip || req.connection?.remoteAddress,
          userAgent: req.headers['user-agent'],
        });

        return next();
      } catch (err) {
        console.error('API key auth error:', err.message);
        return res.status(401).json(responseUtil.unauthorized('API key authentication failed'));
      }
    }

    // ─── Bearer Token Authentication ───
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json(responseUtil.unauthorized(MESSAGES.UNAUTHORIZED));
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwtUtil.verifyToken(token);

    if (!decoded) {
      return res.status(401).json(responseUtil.unauthorized(MESSAGES.TOKEN_EXPIRED));
    }

    // Reject pending 2FA tokens from being used as auth
    if (decoded.pending2FA) {
      return res.status(401).json(responseUtil.unauthorized('Two-factor authentication not completed'));
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });

    if (!user) {
      return res.status(401).json(responseUtil.unauthorized('User not found'));
    }

    if (!user.isActive) {
      return res.status(403).json(responseUtil.forbidden(MESSAGES.ACCOUNT_DEACTIVATED));
    }

    // Validate session is still active
    try {
      const sessAdapter = await getSessionAdapter();
      const session = await sessAdapter.findOne([['token', '=', token], ['status', '=', 'active']]);
      if (session) {
        // Update last activity (fire-and-forget)
        sessAdapter.update(session.id, { lastActivityAt: new Date() }).catch(() => {});
      }
      // Note: if no session record found, we still allow access (backward compat for tokens issued before sessions)
    } catch (err) {
      // Session validation is non-blocking — don't reject auth if session table fails
    }

    // Look up role name from roles table via FK
    const role = await prisma.role.findUnique({ where: { id: user.role_id } });
    req.user = {
      id: user.id,
      email: user.email,
      role: role?.name || 'viewer',
      role_id: user.role_id,
      authMethod: 'bearer',
    };

    // Set audit context for Prisma middleware
    setAuditContext({
      userId: user.id,
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers['user-agent'],
    });

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json(responseUtil.unauthorized('Authentication failed'));
  }
};

export const authorize = (resource = null, action = null) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json(responseUtil.unauthorized());
      }

      if (!resource && !action) {
        return next();
      }

      const userRole = req.user.role;

      // Admin and super_admin bypass all permission checks
      if (userRole === 'admin' || userRole === 'super_admin') {
        return next();
      }

      // For non-admin users, check role-based permissions via the roles/permissions tables
      const permissionName = resource && action ? `${resource}.${action}` : resource;

      const roleRecord = await prisma.role.findFirst({
        where: { name: userRole, isActive: true },
      });

      if (!roleRecord) {
        return res.status(403).json(responseUtil.forbidden('Role not found'));
      }

      const rolePermission = await prisma.rolePermission.findFirst({
        where: { roleId: roleRecord.id },
        include: {
          permission: {
            select: { name: true },
          },
        },
      });

      // Check if the role has the required permission
      const hasPermission = await prisma.rolePermission.findFirst({
        where: {
          roleId: roleRecord.id,
          permission: { name: permissionName },
        },
      });

      if (!hasPermission) {
        return res.status(403).json(responseUtil.forbidden(`Access denied. Missing permission: ${permissionName}`));
      }

      req.user.roleRecord = roleRecord;
      next();
    } catch (error) {
      console.error('Authorization error:', error);
      return res.status(500).json(responseUtil.error('Authorization failed'));
    }
  };
};

export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwtUtil.verifyToken(token);

    if (decoded) {
      const user = await prisma.user.findUnique({ where: { id: decoded.id } });

      if (user && user.isActive) {
        const role = await prisma.role.findUnique({ where: { id: user.role_id } });
        req.user = {
          id: user.id,
          email: user.email,
          role: role?.name || 'viewer',
          role_id: user.role_id,
        };
      }
    }

    next();
  } catch (error) {
    next();
  }
};

export default {
  authenticate,
  authorize,
  optionalAuth
};
