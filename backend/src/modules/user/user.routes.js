import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { validateRequest } from '../../api/validators/validateRequest.js';
import { UserService } from './user.service.js';
import { authenticate, authorize } from '../../core/middleware/auth.js';
import { responseUtil } from '../../shared/utils/index.js';
import prisma from '../../core/db/prisma.js';

const router = Router();

const getUserService = () => new UserService();

// Validation rules
const createUserValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('first_name').notEmpty().withMessage('First name is required'),
  body('last_name').notEmpty().withMessage('Last name is required'),
  body('role_id').optional().isInt().withMessage('Role must be an integer')
];

const updateUserValidation = [
  param('id').isInt().withMessage('User ID must be an integer'),
  body('first_name').optional().notEmpty().withMessage('First name cannot be empty'),
  body('last_name').optional().notEmpty().withMessage('Last name cannot be empty'),
  body('phone').optional().isMobilePhone().withMessage('Invalid phone number')
];

const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
];

// Get current user info (protected, no special permission needed)
router.get('/me', authenticate, async (req, res) => {
  try {
    // req.user is set by authenticate middleware
    if (!req.user) {
      return res.status(401).json(responseUtil.error('Not authenticated'));
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        createdAt: true,
        role: { select: { name: true, display_name: true } }
      }
    });

    if (!user) {
      return res.status(404).json(responseUtil.error('User not found'));
    }

    res.json(responseUtil.success(user, 'Current user retrieved'));
  } catch (error) {
    console.error('Get current user error:', error.message);
    console.error('Get current user full error:', error);
    res.status(500).json(responseUtil.error('Failed to fetch user', { errorDetails: error.message }));
  }
});

// Public routes
router.post('/login', loginValidation, validateRequest, async (req, res) => {
  try {
    const { email, password, twoFactorToken } = req.body;
    const result = await getUserService().login(email, password, {
      twoFactorToken,
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers['user-agent'],
    });

    if (result.success) {
      res.json(result);
    } else {
      res.status(result.error.code === 'UNAUTHORIZED' ? 401 : 400).json(result);
    }
  } catch (error) {
    console.error('Login error:', error.message, error.stack);
    res.status(500).json(responseUtil.error('Login failed'));
  }
});

// 2FA verification for pending login (when login returns requires2FA)
router.post('/login/verify-2fa', [
  body('tempToken').notEmpty().withMessage('Temporary token is required'),
  body('twoFactorToken').notEmpty().withMessage('2FA code is required'),
], validateRequest, async (req, res) => {
  try {
    const { tempToken, twoFactorToken } = req.body;
    const { jwtUtil: jwt } = await import('../../shared/utils/index.js');
    const decoded = jwt.verifyToken(tempToken);

    if (!decoded || !decoded.pending2FA) {
      return res.status(401).json(responseUtil.error('Invalid or expired temporary token', null, 'UNAUTHORIZED'));
    }

    // Look up user and re-run login with 2FA token (skip password check via direct flow)
    const user = await (await import('../../core/db/prisma.js')).default.user.findUnique({ where: { id: decoded.id } });
    if (!user) {
      return res.status(401).json(responseUtil.error('User not found', null, 'UNAUTHORIZED'));
    }

    // We use a special internal method to complete the login with 2FA
    const result = await getUserService().completeTwoFactorLogin(user, twoFactorToken, {
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers['user-agent'],
    });

    if (result.success) {
      res.json(result);
    } else {
      res.status(401).json(result);
    }
  } catch (error) {
    console.error('2FA verification error:', error);
    res.status(500).json(responseUtil.error('2FA verification failed'));
  }
});

router.post('/register', createUserValidation, validateRequest, async (req, res) => {
  try {
    const result = await getUserService().create(req.body);
    res.status(result.success ? 201 : 400).json(result);
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json(responseUtil.error('Registration failed'));
  }
});

// Protected routes
router.get('/', authenticate, authorize('user_management', 'read'), async (req, res) => {
  try {
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      search: req.query.search,
      role_id: req.query.role_id,
      is_active: req.query.is_active
    };
    
    const result = await getUserService().findAll(options);
    res.json(result);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json(responseUtil.error('Failed to fetch users'));
  }
});

router.get('/stats', authenticate, authorize('user_management', 'read'), async (req, res) => {
  try {
    const result = await getUserService().getStats();
    res.json(result);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json(responseUtil.error('Failed to fetch statistics'));
  }
});

router.get('/:id', authenticate, authorize('user_management', 'read'), updateUserValidation[0], validateRequest, async (req, res) => {
  try {
    const result = await getUserService().findById(parseInt(req.params.id));
    res.json(result);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json(responseUtil.error('Failed to fetch user'));
  }
});

router.put('/:id', authenticate, authorize('user_management', 'write'), updateUserValidation, validateRequest, async (req, res) => {
  try {
    const result = await getUserService().update(parseInt(req.params.id), req.body);
    res.json(result);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json(responseUtil.error('Failed to update user'));
  }
});

router.delete('/:id', authenticate, authorize('user_management', 'delete'), updateUserValidation[0], validateRequest, async (req, res) => {
  try {
    const result = await getUserService().delete(parseInt(req.params.id), req.user.id);
    res.json(result);
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json(responseUtil.error('Failed to delete user'));
  }
});

router.post('/:id/change-password', authenticate, authorize(), [
  param('id').isInt().withMessage('User ID must be an integer'),
  body('old_password').notEmpty().withMessage('Old password is required'),
  body('new_password').isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
], validateRequest, async (req, res) => {
  try {
    const { old_password, new_password } = req.body;
    const result = await getUserService().changePassword(
      parseInt(req.params.id),
      old_password,
      new_password
    );
    res.json(result);
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json(responseUtil.error('Failed to change password'));
  }
});

router.post('/logout', authenticate, async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const result = await getUserService().logout(req.user.id, token);
    res.json(result);
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json(responseUtil.error('Logout failed'));
  }
});

export default router;