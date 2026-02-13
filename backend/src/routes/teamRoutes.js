import express from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { authenticate, authorize } from '../middleware/auth.js';
import { TeamMember } from '../models/index.js';
import { logger } from '../config/logger.js';

const router = express.Router();
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/team/'),
  filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/', authenticate, async (req, res) => {
  try {
    const { status = 'all' } = req.query;
    const where = status !== 'all' ? { status } : {};
    const members = await TeamMember.findAll({ where, order: [['sort_order', 'ASC'], ['id', 'DESC']] });
    res.json({ members });
  } catch (error) {
    logger.error('Error fetching team members:', error);
    res.status(500).json({ error: 'Failed to fetch team members' });
  }
});

router.post('/', authenticate, authorize('admin', 'manager'), upload.single('photo'), async (req, res) => {
  try {
    const { name, designation, qualifications, message, phone, email, sort_order, status } = req.body;
    const member = await TeamMember.create({
      name, designation, qualifications, message, phone, email, sort_order: sort_order || 0,
      status: status || 'active', photo: req.file ? `uploads/team/${req.file.filename}` : null
    });
    logger.info(`Team member created: ${member.id} - ${member.name}`);
    res.status(201).json({ message: 'Team member added successfully', member });
  } catch (error) {
    logger.error('Error creating team member:', error);
    res.status(500).json({ error: 'Failed to add team member' });
  }
});

router.put('/:id', authenticate, authorize('admin', 'manager'), upload.single('photo'), async (req, res) => {
  try {
    const { id } = req.params;
    const member = await TeamMember.findByPk(id);
    if (!member) return res.status(404).json({ error: 'Team member not found' });

    const updateData = { ...req.body };
    if (req.file) updateData.photo = `uploads/team/${req.file.filename}`;

    await member.update(updateData);
    logger.info(`Team member ${id} updated`);
    res.json({ message: 'Team member updated successfully', member });
  } catch (error) {
    logger.error('Error updating team member:', error);
    res.status(500).json({ error: 'Failed to update team member' });
  }
});

router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const member = await TeamMember.findByPk(id);
    if (!member) return res.status(404).json({ error: 'Team member not found' });

    await member.destroy();
    logger.info(`Team member ${id} deleted`);
    res.json({ message: 'Team member deleted successfully' });
  } catch (error) {
    logger.error('Error deleting team member:', error);
    res.status(500).json({ error: 'Failed to delete team member' });
  }
});

export default router;
