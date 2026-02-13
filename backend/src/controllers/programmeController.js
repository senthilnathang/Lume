import { Op } from 'sequelize';
import slugify from 'slugify';
import { Programme, Activity, Document } from '../models/index.js';
import { logger } from '../config/logger.js';
import { authenticate, authorize } from '../middleware/auth.js';

export const getProgrammesAdmin = async (req, res) => {
  try {
    const { status = 'all', search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (status !== 'all') {
      where.status = status;
    }
    if (search) {
      where.title = { [Op.like]: `%${search}%` };
    }

    const { count, rows: programmes } = await Programme.findAndCountAll({
      where,
      order: [['sort_order', 'ASC'], ['id', 'DESC']],
      limit: parseInt(limit),
      offset,
      include: [
        { model: Activity, as: 'activities', attributes: ['id'] },
        { model: Document, as: 'documents', attributes: ['id'] }
      ]
    });

    res.json({
      programmes: programmes.map(p => ({
        ...p.toJSON(),
        activitiesCount: p.activities?.length || 0,
        documentsCount: p.documents?.length || 0
      })),
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching programmes:', error);
    res.status(500).json({ error: 'Failed to fetch programmes' });
  }
};

export const createProgramme = async (req, res) => {
  try {
    const { title, description, icon, color, objectives, target_beneficiaries, outcomes, sort_order, status } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const slug = slugify(title, { lower: true, strict: true });

    const existingSlug = await Programme.findOne({ where: { slug } });
    const finalSlug = existingSlug ? `${slug}-${Date.now()}` : slug;

    const programme = await Programme.create({
      title,
      slug: finalSlug,
      description,
      icon,
      color,
      objectives,
      target_beneficiaries,
      outcomes,
      sort_order: sort_order || 0,
      status: status || 'active'
    });

    logger.info(`Programme created: ${programme.id} - ${programme.title}`);

    res.status(201).json({
      message: 'Programme created successfully',
      programme
    });
  } catch (error) {
    logger.error('Error creating programme:', error);
    res.status(500).json({ error: 'Failed to create programme' });
  }
};

export const updateProgramme = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, icon, color, objectives, target_beneficiaries, outcomes, sort_order, status } = req.body;

    const programme = await Programme.findByPk(id);

    if (!programme) {
      return res.status(404).json({ error: 'Programme not found' });
    }

    const updateData = {
      title: title || programme.title,
      description: description !== undefined ? description : programme.description,
      icon: icon !== undefined ? icon : programme.icon,
      color: color !== undefined ? color : programme.color,
      objectives: objectives !== undefined ? objectives : programme.objectives,
      target_beneficiaries: target_beneficiaries !== undefined ? target_beneficiaries : programme.target_beneficiaries,
      outcomes: outcomes !== undefined ? outcomes : programme.outcomes,
      sort_order: sort_order !== undefined ? sort_order : programme.sort_order,
      status: status || programme.status
    };

    if (title && title !== programme.title) {
      updateData.slug = slugify(title, { lower: true, strict: true });
    }

    await programme.update(updateData);

    logger.info(`Programme updated: ${programme.id}`);

    res.json({
      message: 'Programme updated successfully',
      programme
    });
  } catch (error) {
    logger.error('Error updating programme:', error);
    res.status(500).json({ error: 'Failed to update programme' });
  }
};

export const deleteProgramme = async (req, res) => {
  try {
    const { id } = req.params;

    const programme = await Programme.findByPk(id);

    if (!programme) {
      return res.status(404).json({ error: 'Programme not found' });
    }

    await programme.destroy();

    logger.info(`Programme deleted: ${id}`);

    res.json({ message: 'Programme deleted successfully' });
  } catch (error) {
    logger.error('Error deleting programme:', error);
    res.status(500).json({ error: 'Failed to delete programme' });
  }
};
