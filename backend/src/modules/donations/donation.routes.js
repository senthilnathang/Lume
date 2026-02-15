import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { validateRequest } from '../../api/validators/validateRequest.js';
import { DonationService } from './donation.service.js';
import { authenticate, authorize } from '../../core/middleware/auth.js';
import { responseUtil } from '../../shared/utils/index.js';

const router = Router();

const getDonationService = () => new DonationService();

const createDonationValidation = [
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),
  body('currency').optional().isLength({ min: 3, max: 3 }).withMessage('Currency must be 3 characters'),
  body('payment_method').optional().isIn(['cash', 'cheque', 'bank_transfer', 'online', 'other'])
];

const createDonorValidation = [
  body('first_name').notEmpty().withMessage('First name is required'),
  body('last_name').notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Valid email is required')
];

router.get('/stats', authenticate, authorize('donations', 'read'), async (req, res) => {
  try {
    const result = await getDonationService().getStats();
    res.json(result);
  } catch (error) {
    console.error('Get donation stats error:', error);
    res.status(500).json(responseUtil.error('Failed to fetch statistics'));
  }
});

router.get('/donors', authenticate, authorize('donations', 'read'), async (req, res) => {
  try {
    const result = await getDonationService().findAllDonors({
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      search: req.query.search
    });
    res.json(result);
  } catch (error) {
    console.error('Get donors error:', error);
    res.status(500).json(responseUtil.error('Failed to fetch donors'));
  }
});

router.get('/donors/:id', authenticate, authorize('donations', 'read'), [param('id').isInt().withMessage('Donor ID must be an integer')], validateRequest, async (req, res) => {
  try {
    const result = await getDonationService().findDonorById(parseInt(req.params.id));
    res.json(result);
  } catch (error) {
    console.error('Get donor error:', error);
    res.status(500).json(responseUtil.error('Failed to fetch donor'));
  }
});

router.get('/donors/:id/stats', authenticate, authorize('donations', 'read'), [param('id').isInt().withMessage('Donor ID must be an integer')], validateRequest, async (req, res) => {
  try {
    const result = await getDonationService().getDonorStats(parseInt(req.params.id));
    res.json(result);
  } catch (error) {
    console.error('Get donor stats error:', error);
    res.status(500).json(responseUtil.error('Failed to fetch donor statistics'));
  }
});

router.post('/donors', authenticate, authorize('donations', 'write'), createDonorValidation, validateRequest, async (req, res) => {
  try {
    const result = await getDonationService().createDonor(req.body);
    res.status(result.success ? 201 : 400).json(result);
  } catch (error) {
    console.error('Create donor error:', error);
    res.status(500).json(responseUtil.error('Failed to create donor'));
  }
});

router.get('/campaigns', async (req, res) => {
  try {
    const result = await getDonationService().findAllCampaigns();
    res.json(result);
  } catch (error) {
    console.error('Get campaigns error:', error);
    res.status(500).json(responseUtil.error('Failed to fetch campaigns'));
  }
});

router.post('/campaigns', authenticate, authorize('donations', 'write'), async (req, res) => {
  try {
    const result = await getDonationService().createCampaign(req.body);
    res.status(result.success ? 201 : 400).json(result);
  } catch (error) {
    console.error('Create campaign error:', error);
    res.status(500).json(responseUtil.error('Failed to create campaign'));
  }
});

router.get('/', async (req, res) => {
  try {
    const result = await getDonationService().findAll({
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      status: req.query.status,
      donor_id: req.query.donor_id,
      campaign_id: req.query.campaign_id,
      start_date: req.query.start_date,
      end_date: req.query.end_date
    });
    res.json(result);
  } catch (error) {
    console.error('Get donations error:', error);
    res.status(500).json(responseUtil.error('Failed to fetch donations'));
  }
});

router.get('/:id', authenticate, authorize('donations', 'read'), [param('id').isInt().withMessage('Donation ID must be an integer')], validateRequest, async (req, res) => {
  try {
    const result = await getDonationService().findById(parseInt(req.params.id));
    res.json(result);
  } catch (error) {
    console.error('Get donation error:', error);
    res.status(500).json(responseUtil.error('Failed to fetch donation'));
  }
});

router.post('/', authenticate, authorize('donations', 'write'), createDonationValidation, validateRequest, async (req, res) => {
  try {
    const result = await getDonationService().create(req.body);
    res.status(result.success ? 201 : 400).json(result);
  } catch (error) {
    console.error('Create donation error:', error);
    res.status(500).json(responseUtil.error('Failed to create donation'));
  }
});

router.put('/:id', authenticate, authorize('donations', 'write'), [param('id').isInt().withMessage('Donation ID must be an integer')], validateRequest, async (req, res) => {
  try {
    const result = await getDonationService().update(parseInt(req.params.id), req.body);
    res.json(result);
  } catch (error) {
    console.error('Update donation error:', error);
    res.status(500).json(responseUtil.error('Failed to update donation'));
  }
});

router.patch('/:id/status', authenticate, authorize('donations', 'write'), [param('id').isInt().withMessage('Donation ID must be an integer'), body('status').isIn(['pending', 'completed', 'failed', 'refunded'])], validateRequest, async (req, res) => {
  try {
    const result = await getDonationService().updateStatus(parseInt(req.params.id), req.body.status);
    res.json(result);
  } catch (error) {
    console.error('Update donation status error:', error);
    res.status(500).json(responseUtil.error('Failed to update donation status'));
  }
});

export default router;
