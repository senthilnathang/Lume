import express from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { authenticate, authorize } from '../middleware/auth.js';
import { Document } from '../models/index.js';
import { logger } from '../config/logger.js';

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/documents/'),
  filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`)
});

const upload = multer({ 
  storage, 
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    cb(null, allowedTypes.includes(file.mimetype));
  }
});

router.get('/', authenticate, async (req, res) => {
  try {
    const { type = 'all', status = 'all' } = req.query;
    const where = {};
    if (type !== 'all') where.type = type;
    if (status !== 'all') where.status = status;

    const documents = await Document.findAll({ where, order: [['year', 'DESC'], ['id', 'DESC']] });
    res.json({ documents });
  } catch (error) {
    logger.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

router.post('/', authenticate, authorize('admin', 'manager'), upload.single('file'), async (req, res) => {
  try {
    const { title, type, year, description } = req.body;
    
    const document = await Document.create({
      title,
      type: type || 'other',
      file_path: req.file ? `uploads/documents/${req.file.filename}` : null,
      file_size: req.file?.size,
      file_type: req.file?.mimetype,
      year,
      description,
      status: 'active'
    });

    logger.info(`Document uploaded: ${document.id} - ${document.title}`);
    res.status(201).json({ message: 'Document uploaded successfully', document });
  } catch (error) {
    logger.error('Error uploading document:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const document = await Document.findByPk(id);
    if (!document) return res.status(404).json({ error: 'Document not found' });

    await document.destroy();
    logger.info(`Document deleted: ${id}`);
    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    logger.error('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

export default router;
