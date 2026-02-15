import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { validateRequest } from '../../api/validators/validateRequest.js';
import { TeamService } from './team.service.js';
import { authenticate, authorize } from '../../core/middleware/auth.js';
import { responseUtil } from '../../shared/utils/index.js';

const router = Router();

const getTeamService = () => new TeamService();

const createMemberValidation = [
  body('first_name').notEmpty().withMessage('First name is required'),
  body('last_name').notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('position').optional().isString()
];

router.get('/active', async (req, res) => {
  try {
    const result = await getTeamService().getActive();
    res.json(result);
  } catch (error) {
    console.error('Get active team error:', error);
    res.status(500).json(responseUtil.error('Failed to fetch team members'));
  }
});

router.get('/leaders', async (req, res) => {
  try {
    const result = await getTeamService().getLeaders();
    res.json(result);
  } catch (error) {
    console.error('Get leaders error:', error);
    res.status(500).json(responseUtil.error('Failed to fetch leaders'));
  }
});

router.get('/departments', async (req, res) => {
  try {
    const result = await getTeamService().getDepartments();
    res.json(result);
  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json(responseUtil.error('Failed to fetch departments'));
  }
});

router.get('/department/:department', async (req, res) => {
  try {
    const result = await getTeamService().getByDepartment(req.params.department);
    res.json(result);
  } catch (error) {
    console.error('Get team by department error:', error);
    res.status(500).json(responseUtil.error('Failed to fetch team members'));
  }
});

router.get('/', async (req, res) => {
  try {
    const result = await getTeamService().findAll({
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      department: req.query.department,
      search: req.query.search,
      is_active: req.query.is_active,
      is_leader: req.query.is_leader
    });
    res.json(result);
  } catch (error) {
    console.error('Get team members error:', error);
    res.status(500).json(responseUtil.error('Failed to fetch team members'));
  }
});

router.get('/:id', [param('id').isInt().withMessage('Team Member ID must be an integer')], validateRequest, async (req, res) => {
  try {
    const result = await getTeamService().findById(parseInt(req.params.id));
    res.json(result);
  } catch (error) {
    console.error('Get team member error:', error);
    res.status(500).json(responseUtil.error('Failed to fetch team member'));
  }
});

router.post('/', authenticate, authorize('team', 'write'), createMemberValidation, validateRequest, async (req, res) => {
  try {
    const result = await getTeamService().create(req.body);
    res.status(result.success ? 201 : 400).json(result);
  } catch (error) {
    console.error('Create team member error:', error);
    res.status(500).json(responseUtil.error('Failed to create team member'));
  }
});

router.put('/:id', authenticate, authorize('team', 'write'), [param('id').isInt().withMessage('Team Member ID must be an integer')], validateRequest, async (req, res) => {
  try {
    const result = await getTeamService().update(parseInt(req.params.id), req.body);
    res.json(result);
  } catch (error) {
    console.error('Update team member error:', error);
    res.status(500).json(responseUtil.error('Failed to update team member'));
  }
});

router.delete('/:id', authenticate, authorize('team', 'delete'), [param('id').isInt().withMessage('Team Member ID must be an integer')], validateRequest, async (req, res) => {
  try {
    const result = await getTeamService().delete(parseInt(req.params.id));
    res.json(result);
  } catch (error) {
    console.error('Delete team member error:', error);
    res.status(500).json(responseUtil.error('Failed to delete team member'));
  }
});

router.post('/reorder', authenticate, authorize('team', 'write'), async (req, res) => {
  try {
    const result = await getTeamService().reorder(req.body.members);
    res.json(result);
  } catch (error) {
    console.error('Reorder team members error:', error);
    res.status(500).json(responseUtil.error('Failed to reorder team members'));
  }
});

export default router;
