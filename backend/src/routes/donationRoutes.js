import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { Donation, Donor, Programme } from '../models/index.cjs';
import { logger } from '../config/logger.js';

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const { status = 'all', from_date, to_date, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const where = {};
    if (status !== 'all') where.status = status;
    if (from_date || to_date) where.donated_at = {};
    if (from_date) where.donated_at.$gte = new Date(from_date);
    if (to_date) where.donated_at.$lte = new Date(to_date);

    const { count, rows } = await Donation.findAndCountAll({
      where,
      order: [['donated_at', 'DESC']],
      limit: parseInt(limit),
      offset,
      include: [
        { model: Donor, as: 'donor', attributes: ['id', 'name', 'anonymous_donation'] },
        { model: Programme, as: 'programme', attributes: ['id', 'title'] }
      ]
    });

    const totalAmount = await Donation.sum('amount', { where: { status: 'completed' } }) || 0;

    res.json({
      donations: rows,
      totalAmount,
      pagination: { total: count, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(count / limit) }
    });
  } catch (error) {
    logger.error('Error fetching donations:', error);
    res.status(500).json({ error: 'Failed to fetch donations' });
  }
});

router.post('/', authenticate, authorize('admin', 'manager'), async (req, res) => {
  try {
    const receiptNumber = `GV/${new Date().getFullYear()}/${String(Date.now()).slice(-6)}`;
    const donation = await Donation.create({ ...req.body, receipt_number: receiptNumber, donated_at: new Date() });

    const donor = await Donor.findByPk(donation.donor_id);
    if (donor) {
      const newTotal = (parseFloat(donor.total_donations) || 0) + parseFloat(donation.amount);
      await donor.update({ total_donations: newTotal });
    }

    logger.info(`Donation created: ${donation.id} - ${receiptNumber}`);
    res.status(201).json({ message: 'Donation recorded successfully', donation });
  } catch (error) {
    logger.error('Error creating donation:', error);
    res.status(500).json({ error: 'Failed to record donation' });
  }
});

router.put('/:id', authenticate, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;
    const donation = await Donation.findByPk(id);
    if (!donation) return res.status(404).json({ error: 'Donation not found' });

    await donation.update(req.body);
    logger.info(`Donation ${id} updated`);
    res.json({ message: 'Donation updated successfully', donation });
  } catch (error) {
    logger.error('Error updating donation:', error);
    res.status(500).json({ error: 'Failed to update donation' });
  }
});

export default router;
