import { Op } from 'sequelize';
import jwt from 'jsonwebtoken';
import { 
  Organization, TeamMember, Programme, Activity, Document, 
  ContactMessage, Donor, Donation, User 
} from '../models/index.cjs';
import { logger } from '../config/logger.js';
import { authenticate } from '../middleware/auth.js';

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.is_active) {
      return res.status(401).json({ error: 'Account is deactivated' });
    }

    const isValid = await user.validatePassword(password);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    user.last_login = new Date();
    await user.save();

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'jwt-secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        avatar: user.avatar
      }
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

export const getDashboardStats = async (req, res) => {
  try {
    const [
      totalProgrammes,
      totalActivities,
      totalDonors,
      totalDonations,
      totalContactMessages,
      newContactMessages,
      totalBeneficiaries,
      recentDonations
    ] = await Promise.all([
      Programme.count({ where: { status: 'active' } }),
      Activity.count({ where: { status: 'published' } }),
      Donor.count({ where: { status: 'active' } }),
      Donation.count({ where: { status: 'completed' } }),
      ContactMessage.count(),
      ContactMessage.count({ where: { status: 'new' } }),
      1500, // Placeholder for beneficiaries count
      Donation.findAll({
        where: { status: 'completed' },
        order: [['donated_at', 'DESC']],
        limit: 5,
        include: [{ model: Donor, as: 'donor', attributes: ['name', 'anonymous_donation'] }]
      })
    ]);

    const totalDonationAmount = await Donation.sum('amount', { where: { status: 'completed' } }) || 0;

    const thisMonth = await Donation.sum('amount', {
      where: {
        status: 'completed',
        donated_at: {
          [Op.gte]: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        }
      }
    }) || 0;

    res.json({
      stats: {
        totalProgrammes,
        totalActivities,
        totalDonors,
        totalDonations,
        totalContactMessages,
        newContactMessages,
        totalBeneficiaries,
        totalDonationAmount: totalDonationAmount,
        thisMonthDonations: thisMonth,
        recentDonations
      }
    });
  } catch (error) {
    logger.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
};

export const getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.userId, {
      attributes: { exclude: ['password'] }
    });

    res.json({ user });
  } catch (error) {
    logger.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { first_name, last_name, phone, avatar } = req.body;

    const user = await User.findByPk(req.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.first_name = first_name || user.first_name;
    user.last_name = last_name || user.last_name;
    user.phone = phone || user.phone;
    user.avatar = avatar || user.avatar;

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone,
        avatar: user.avatar,
        role: user.role
      }
    });
  } catch (error) {
    logger.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};
