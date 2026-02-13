import { Router } from 'express';
import { param, query } from 'express-validator';
import { validateRequest } from '../../api/validators/validateRequest.js';
import { AuditService } from './audit.service.js';
import { authenticate, authorize } from '../../core/middleware/auth.js';
import { responseUtil } from '../../shared/utils/index.js';

const router = Router();
let auditService;

const getAuditService = () => {
  if (!auditService) {
    auditService = new AuditService();
  }
  return auditService;
};

router.get('/', authenticate, authorize('audit', 'read'), async (req, res) => {
  try {
    const result = await getAuditService().findAll({
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 50,
      user_id: req.query.user_id,
      action: req.query.action,
      resource_type: req.query.resource_type,
      start_date: req.query.start_date,
      end_date: req.query.end_date
    });
    res.json(result);
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json(responseUtil.error('Failed to fetch audit logs'));
  }
});

router.get('/:id', authenticate, authorize('audit', 'read'), [param('id').isInt().withMessage('Audit log ID must be an integer')], validateRequest, async (req, res) => {
  try {
    const result = await getAuditService().findById(parseInt(req.params.id));
    res.json(result);
  } catch (error) {
    console.error('Get audit log error:', error);
    res.status(500).json(responseUtil.error('Failed to fetch audit log'));
  }
});

router.post('/cleanup', authenticate, authorize('audit', 'delete'), async (req, res) => {
  try {
    const daysToKeep = parseInt(req.body.days) || 90;
    const result = await getAuditService().cleanup(daysToKeep);
    res.json(result);
  } catch (error) {
    console.error('Cleanup audit logs error:', error);
    res.status(500).json(responseUtil.error('Failed to cleanup audit logs'));
  }
});

export default router;
