import { jwtUtil, responseUtil } from '../../shared/utils/index.js';
import { getDatabase } from '../../config.js';
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

    const db = getDatabase();
    const User = db.models.User;

    const user = await User.findByPk(decoded.id);

    if (!user) {
      return res.status(401).json(responseUtil.unauthorized('User not found'));
    }

    if (!user.is_active) {
      return res.status(403).json(responseUtil.forbidden(MESSAGES.ACCOUNT_DEACTIVATED));
    }

    req.user = {
      id: user.id,
      email: user.email,
      role_id: user.role_id
    };

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

      const db = getDatabase();
      const Role = db.models.Role;
      const Permission = db.models.Permission;
      const RolePermission = db.models.RolePermission;

      const role = await Role.findByPk(req.user.role_id);

      if (!role) {
        return res.status(403).json(responseUtil.forbidden('Role not found'));
      }

      if (role.name === 'super_admin') {
        return next();
      }

      const permissionName = resource && action ? `${resource}.${action}` : resource;

      const rolePermission = await RolePermission.findOne({
        where: { role_id: role.id },
        include: [{ model: Permission, where: { name: permissionName } }]
      });

      if (!rolePermission) {
        return res.status(403).json(responseUtil.forbidden(`Access denied. Missing permission: ${permissionName}`));
      }

      if (action && rolePermission.action !== action && rolePermission.action !== 'admin') {
        return res.status(403).json(responseUtil.forbidden(`Access denied. Insufficient permission: ${rolePermission.action}`));
      }

      req.user.role = role;
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
      const db = getDatabase();
      const User = db.models.User;
      const user = await User.findByPk(decoded.id);

      if (user && user.is_active) {
        req.user = {
          id: user.id,
          email: user.email,
          role_id: user.role_id
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
