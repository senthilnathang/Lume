import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { validateRequest } from '../../api/validators/validateRequest.js';
import { MessageService } from './message.service.js';
import { authenticate, authorize } from '../../core/middleware/auth.js';
import { responseUtil } from '../../shared/utils/index.js';

const router = Router();

const getMessageService = () => new MessageService();

const createMessageValidation = [
  body('content').notEmpty().withMessage('Message content is required'),
  body('sender_email').isEmail().withMessage('Valid sender email is required'),
  body('type').optional().isIn(['contact', 'inquiry', 'support', 'feedback', 'other'])
];

router.get('/stats', authenticate, authorize('messages', 'read'), async (req, res) => {
  try {
    const result = await getMessageService().getStats();
    res.json(result);
  } catch (error) {
    console.error('Get message stats error:', error);
    res.status(500).json(responseUtil.error('Failed to fetch statistics'));
  }
});

router.get('/', authenticate, authorize('messages', 'read'), async (req, res) => {
  try {
    const result = await getMessageService().findAll({
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      status: req.query.status,
      type: req.query.type,
      priority: req.query.priority,
      search: req.query.search,
      assigned_to: req.query.assigned_to
    });
    res.json(result);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json(responseUtil.error('Failed to fetch messages'));
  }
});

router.get('/email/:email', authenticate, authorize('messages', 'read'), async (req, res) => {
  try {
    const result = await getMessageService().getByEmail(req.params.email);
    res.json(result);
  } catch (error) {
    console.error('Get messages by email error:', error);
    res.status(500).json(responseUtil.error('Failed to fetch messages'));
  }
});

router.get('/:id', authenticate, authorize('messages', 'read'), [param('id').isInt().withMessage('Message ID must be an integer')], validateRequest, async (req, res) => {
  try {
    const result = await getMessageService().findById(parseInt(req.params.id));
    if (result.success && result.data.status === 'new') {
      await getMessageService().markAsRead(parseInt(req.params.id));
    }
    res.json(result);
  } catch (error) {
    console.error('Get message error:', error);
    res.status(500).json(responseUtil.error('Failed to fetch message'));
  }
});

router.post('/', createMessageValidation, validateRequest, async (req, res) => {
  try {
    const result = await getMessageService().create(req.body);
    res.status(result.success ? 201 : 400).json(result);
  } catch (error) {
    console.error('Create message error:', error);
    res.status(500).json(responseUtil.error('Failed to create message'));
  }
});

router.put('/:id', authenticate, authorize('messages', 'write'), [param('id').isInt().withMessage('Message ID must be an integer')], validateRequest, async (req, res) => {
  try {
    const result = await getMessageService().update(parseInt(req.params.id), req.body);
    res.json(result);
  } catch (error) {
    console.error('Update message error:', error);
    res.status(500).json(responseUtil.error('Failed to update message'));
  }
});

router.post('/:id/read', authenticate, authorize('messages', 'write'), [param('id').isInt().withMessage('Message ID must be an integer')], validateRequest, async (req, res) => {
  try {
    const result = await getMessageService().markAsRead(parseInt(req.params.id));
    res.json(result);
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json(responseUtil.error('Failed to mark message as read'));
  }
});

router.post('/:id/reply', authenticate, authorize('messages', 'write'), [param('id').isInt().withMessage('Message ID must be an integer')], validateRequest, async (req, res) => {
  try {
    const result = await getMessageService().reply(parseInt(req.params.id), req.body);
    res.json(result);
  } catch (error) {
    console.error('Reply to message error:', error);
    res.status(500).json(responseUtil.error('Failed to reply to message'));
  }
});

router.delete('/:id', authenticate, authorize('messages', 'delete'), [param('id').isInt().withMessage('Message ID must be an integer')], validateRequest, async (req, res) => {
  try {
    const result = await getMessageService().delete(parseInt(req.params.id));
    res.json(result);
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json(responseUtil.error('Failed to delete message'));
  }
});

export default router;
