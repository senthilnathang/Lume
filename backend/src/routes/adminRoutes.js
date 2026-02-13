import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { getDashboardStats, getProfile, updateProfile } from '../controllers/adminController.js';
import programmeRoutes from './programmeRoutes.js';
import activityRoutes from './activityRoutes.js';
import documentRoutes from './documentRoutes.js';
import contactRoutes from './contactRoutes.js';
import donorRoutes from './donorRoutes.js';
import donationRoutes from './donationRoutes.js';
import teamRoutes from './teamRoutes.js';
import organizationRoutes from './organizationRoutes.js';

const router = express.Router();

router.use(authenticate);

router.get('/dashboard', getDashboardStats);
router.get('/profile', getProfile);
router.put('/profile', updateProfile);

router.use('/programmes', programmeRoutes);
router.use('/activities', activityRoutes);
router.use('/documents', documentRoutes);
router.use('/contact-messages', contactRoutes);
router.use('/donors', donorRoutes);
router.use('/donations', donationRoutes);
router.use('/team-members', teamRoutes);
router.use('/organization', organizationRoutes);

export default router;
