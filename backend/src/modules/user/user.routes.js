import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { validateRequest } from '../../api/validators/validateRequest.js';
import { UserService } from './user.service.js';
import { authenticate, authorize } from '../../core/middleware/auth.js';

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

// Public routes
router.post('/login', loginValidation, validateRequest, async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await getUserService().login(email, password);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(result.error.code === 'UNAUTHORIZED' ? 401 : 400).json(result);
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json(responseUtil.error('Login failed'));
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
    const result = await getUserService().logout(req.user.id);
    res.json(result);
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json(responseUtil.error('Logout failed'));
  }
});

export default router;