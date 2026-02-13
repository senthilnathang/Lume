/**
 * Core Module API Routes
 */

import { Router } from 'express';
import userRoutes from '../../modules/user/user.routes.js';
import authRoutes from '../../modules/auth/auth.routes.js';

const router = Router();

// Mount user routes
router.use('/users', userRoutes);

// Mount auth routes
router.use('/auth', authRoutes);

// Module info endpoint
router.get('/info', (req, res) => {
  res.json({
    name: 'Core Module',
    version: '1.0.0',
    description: 'Essential system functionality'
  });
});

export default router;
