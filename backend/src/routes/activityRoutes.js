import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { Activity, Programme } from '../models/index.cjs';
import { logger } from '../config/logger.js';

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const { status = 'all', search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const where = {};

    if (status !== 'all') where.status = status;
    if (search) where.title = { $like: `%${search}%` };

    const { count, rows } = await Activity.findAndCountAll({
      where,
      order: [['activity_date', 'DESC'], ['id', 'DESC']],
      limit: parseInt(limit),
      offset,
      include: [{ model: Programme, as: 'programme', attributes: ['id', 'title'] }]
    });

    res.json({
      activities: rows,
      pagination: { total: count, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(count / limit) }
    });
  } catch (error) {
    logger.error('Error fetching activities:', error);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

router.post('/', authenticate, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { title, description, programme_id, activity_date, location, beneficiaries_count, images, status, featured } = req.body;
    
    const activity = await Activity.create({
      title, description, programme_id, activity_date, location, beneficiaries_count, images, status: status || 'draft', featured: featured || false
    });

    logger.info(`Activity created: ${activity.id} - ${activity.title}`);
    res.status(201).json({ message: 'Activity created successfully', activity });
  } catch (error) {
    logger.error('Error creating activity:', error);
    res.status(500).json({ error: 'Failed to create activity' });
  }
});

router.put('/:id', authenticate, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;
    const activity = await Activity.findByPk(id);
    if (!activity) return res.status(404).json({ error: 'Activity not found' });

    await activity.update(req.body);
    logger.info(`Activity updated: ${id}`);
    res.json({ message: 'Activity updated successfully', activity });
  } catch (error) {
    logger.error('Error updating activity:', error);
    res.status(500).json({ error: 'Failed to update activity' });
  }
});

router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const activity = await Activity.findByPk(id);
    if (!activity) return res.status(404).json({ error: 'Activity not found' });

    await activity.destroy();
    logger.info(`Activity deleted: ${id}`);
    res.json({ message: 'Activity deleted successfully' });
  } catch (error) {
    logger.error('Error deleting activity:', error);
    res.status(500).json({ error: 'Failed to delete activity' });
  }
});

export default router;
