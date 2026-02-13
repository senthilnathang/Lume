import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { Donor } from '../models/index.js';
import { logger } from '../config/logger.js';

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const { status = 'all', type, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const where = {};
    if (status !== 'all') where.status = status;
    if (type) where.type = type;
    if (search) where.name = { $like: `%${search}%` };

    const { count, rows } = await Donor.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    res.json({
      donors: rows,
      pagination: { total: count, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(count / limit) }
    });
  } catch (error) {
    logger.error('Error fetching donors:', error);
    res.status(500).json({ error: 'Failed to fetch donors' });
  }
});

router.post('/', authenticate, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { name, email, phone, address, pan_number, type, anonymous_donation } = req.body;
    const donor = await Donor.create({
      name, email, phone, address, pan_number, type: type || 'individual', anonymous_donation: anonymous_donation || false
    });
    logger.info(`Donor created: ${donor.id} - ${donor.name}`);
    res.status(201).json({ message: 'Donor created successfully', donor });
  } catch (error) {
    logger.error('Error creating donor:', error);
    res.status(500).json({ error: 'Failed to create donor' });
  }
});

router.put('/:id', authenticate, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;
    const donor = await Donor.findByPk(id);
    if (!donor) return res.status(404).json({ error: 'Donor not found' });

    await donor.update(req.body);
    logger.info(`Donor ${id} updated`);
    res.json({ message: 'Donor updated successfully', donor });
  } catch (error) {
    logger.error('Error updating donor:', error);
    res.status(500).json({ error: 'Failed to update donor' });
  }
});

export default router;
