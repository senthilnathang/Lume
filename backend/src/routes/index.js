import express from 'express';
import publicRoutes from './publicRoutes.js';
import authRoutes from './authRoutes.js';
import adminRoutes from './adminRoutes.js';

const router = express.Router();

router.use('/public', publicRoutes);
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);

export default router;
