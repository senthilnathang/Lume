import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { ContactMessage } from '../models/index.js';
import { logger } from '../config/logger.js';

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const { status = 'all', page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const where = {};
    if (status !== 'all') where.status = status;

    const { count, rows } = await ContactMessage.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    res.json({
      messages: rows,
      pagination: { total: count, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(count / limit) }
    });
  } catch (error) {
    logger.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

router.put('/:id', authenticate, authorize('admin', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reply } = req.body;

    const message = await ContactMessage.findByPk(id);
    if (!message) return res.status(404).json({ error: 'Message not found' });

    const updateData = { status };
    if (reply) {
      updateData.reply = reply;
      updateData.replied_by = req.userId;
      updateData.replied_at = new Date();
    }

    await message.update(updateData);
    logger.info(`Message ${id} updated, status: ${status}`);
    res.json({ message: 'Message updated successfully', data: message });
  } catch (error) {
    logger.error('Error updating message:', error);
    res.status(500).json({ error: 'Failed to update message' });
  }
});

router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const message = await ContactMessage.findByPk(id);
    if (!message) return res.status(404).json({ error: 'Message not found' });

    await message.destroy();
    logger.info(`Message ${id} deleted`);
    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    logger.error('Error deleting message:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

export default router;
