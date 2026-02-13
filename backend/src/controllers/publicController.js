import { Op } from 'sequelize';
import { Organization, TeamMember, Programme, Activity, Document, ContactMessage } from '../models/index.js';
import { logger } from '../config/logger.js';

export const getHomeData = async (req, res) => {
  try {
    const organization = await Organization.findOne({ where: { status: 'active' } });
    const programmes = await Programme.findAll({ 
      where: { status: 'active' },
      order: [['sort_order', 'ASC'], ['id', 'DESC']],
      limit: 6
    });
    const recentActivities = await Activity.findAll({
      where: { status: 'published' },
      order: [['activity_date', 'DESC'], ['id', 'DESC']],
      limit: 4,
      include: [{ model: Programme, as: 'programme', attributes: ['title', 'icon'] }]
    });
    const documents = await Document.findAll({
      where: { status: 'active', type: 'annual_report' },
      order: [['year', 'DESC']],
      limit: 5
    });
    const teamMembers = await TeamMember.findAll({
      where: { status: 'active' },
      order: [['sort_order', 'ASC']],
      limit: 4
    });

    res.json({
      organization,
      programmes,
      recentActivities,
      documents,
      teamMembers
    });
  } catch (error) {
    logger.error('Error fetching home data:', error);
    res.status(500).json({ error: 'Failed to fetch home data' });
  }
};

export const getAboutData = async (req, res) => {
  try {
    const organization = await Organization.findOne({ where: { status: 'active' } });
    const teamMembers = await TeamMember.findAll({
      where: { status: 'active' },
      order: [['sort_order', 'ASC']]
    });

    res.json({
      organization,
      teamMembers
    });
  } catch (error) {
    logger.error('Error fetching about data:', error);
    res.status(500).json({ error: 'Failed to fetch about data' });
  }
};

export const getProgrammes = async (req, res) => {
  try {
    const { status = 'active' } = req.query;
    const where = {};
    
    if (status !== 'all') {
      where.status = status;
    }

    const programmes = await Programme.findAll({
      where,
      order: [['sort_order', 'ASC'], ['id', 'DESC']]
    });

    res.json({ programmes });
  } catch (error) {
    logger.error('Error fetching programmes:', error);
    res.status(500).json({ error: 'Failed to fetch programmes' });
  }
};

export const getProgrammeBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const programme = await Programme.findOne({
      where: { slug },
      include: [
        {
          model: Activity,
          as: 'activities',
          where: { status: 'published' },
          required: false,
          order: [['activity_date', 'DESC']]
        },
        {
          model: Document,
          as: 'documents',
          where: { status: 'active' },
          required: false
        }
      ]
    });

    if (!programme) {
      return res.status(404).json({ error: 'Programme not found' });
    }

    res.json({ programme });
  } catch (error) {
    logger.error('Error fetching programme:', error);
    res.status(500).json({ error: 'Failed to fetch programme' });
  }
};

export const getActivities = async (req, res) => {
  try {
    const { page = 1, limit = 10, programme_id, featured } = req.query;
    const offset = (page - 1) * limit;

    const where = { status: 'published' };
    
    if (programme_id) {
      where.programme_id = programme_id;
    }
    
    if (featured === 'true') {
      where.featured = true;
    }

    const { count, rows: activities } = await Activity.findAndCountAll({
      where,
      include: [
        { model: Programme, as: 'programme', attributes: ['id', 'title', 'icon', 'color'] }
      ],
      order: [['activity_date', 'DESC'], ['id', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    res.json({
      activities,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching activities:', error);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
};

export const getActivityById = async (req, res) => {
  try {
    const { id } = req.params;

    const activity = await Activity.findByPk(id, {
      include: [
        { model: Programme, as: 'programme', attributes: ['id', 'title', 'slug', 'icon'] }
      ]
    });

    if (!activity) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    res.json({ activity });
  } catch (error) {
    logger.error('Error fetching activity:', error);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
};

export const getDocuments = async (req, res) => {
  try {
    const { type = 'all' } = req.query;
    const where = { status: 'active' };

    if (type !== 'all') {
      where.type = type;
    }

    const documents = await Document.findAll({
      where,
      order: [['year', 'DESC'], ['id', 'DESC']]
    });

    res.json({ documents });
  } catch (error) {
    logger.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
};

export const submitContact = async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Name, email and message are required' });
    }

    const contactMessage = await ContactMessage.create({
      name,
      email,
      phone,
      subject,
      message,
      status: 'new'
    });

    logger.info(`New contact message from ${email}`);

    res.status(201).json({
      message: 'Message sent successfully',
      data: contactMessage
    });
  } catch (error) {
    logger.error('Error submitting contact form:', error);
    res.status(500).json({ error: 'Failed to submit message' });
  }
};
