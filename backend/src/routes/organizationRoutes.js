import express from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { authenticate, authorize } from '../middleware/auth.js';
import { Organization } from '../models/index.js';
import { logger } from '../config/logger.js';

const router = express.Router();
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/organization/'),
  filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/', authenticate, async (req, res) => {
  try {
    const org = await Organization.findOne();
    res.json({ organization: org });
  } catch (error) {
    logger.error('Error fetching organization:', error);
    res.status(500).json({ error: 'Failed to fetch organization' });
  }
});

router.put('/', authenticate, authorize('admin'), upload.single('logo'), async (req, res) => {
  try {
    let org = await Organization.findOne();
    const updateData = { ...req.body };

    if (req.file) {
      updateData.logo = `uploads/organization/${req.file.filename}`;
    }

    if (org) {
      await org.update(updateData);
      logger.info('Organization updated');
      res.json({ message: 'Organization updated successfully', organization: org });
    } else {
      org = await Organization.create(updateData);
      logger.info('Organization created');
      res.status(201).json({ message: 'Organization created successfully', organization: org });
    }
  } catch (error) {
    logger.error('Error updating organization:', error);
    res.status(500).json({ error: 'Failed to update organization' });
  }
});

export default router;
