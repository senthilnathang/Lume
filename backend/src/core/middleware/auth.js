import { jwtUtil, responseUtil } from '../../shared/utils/index.js';
import prisma, { setAuditContext } from '../db/prisma.js';
import { MESSAGES } from '../../shared/constants/index.js';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json(responseUtil.unauthorized(MESSAGES.UNAUTHORIZED));
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwtUtil.verifyToken(token);

    if (!decoded) {
      return res.status(401).json(responseUtil.unauthorized(MESSAGES.TOKEN_EXPIRED));
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });

    if (!user) {
      return res.status(401).json(responseUtil.unauthorized('User not found'));
    }

    if (!user.isActive) {
      return res.status(403).json(responseUtil.forbidden(MESSAGES.ACCOUNT_DEACTIVATED));
    }

    // Look up role name from roles table via FK
    const role = await prisma.role.findUnique({ where: { id: user.role_id } });
    req.user = {
      id: user.id,
      email: user.email,
      role: role?.name || 'viewer',
      role_id: user.role_id,
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
