// Optimized Admin Controller with Prisma ORM and Zod Validation
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import prisma from '../config/prisma.js';
import { logger } from '../config/logger.js';

// Zod Schemas for Validation
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(2, 'First name must be at least 2 characters').optional(),
  lastName: z.string().min(2, 'Last name must be at least 2 characters').optional(),
});

export const profileUpdateSchema = z.object({
  firstName: z.string().min(2).optional(),
  lastName: z.string().min(2).optional(),
  phone: z.string().optional(),
  avatar: z.string().url().optional().or(z.string().max(255)),
}).partial();

// Login Controller - Optimized with Prisma
export const login = async (req, res) => {
  try {
    // Validate input
    const { email, password } = loginSchema.parse(req.body);

    // Find user with Prisma (optimized query)
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        firstName: true,
        lastName: true,
        role: true,
        avatar: true,
        isActive: true,
      },
    });

    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({ 
        error: 'Account is deactivated',
        code: 'ACCOUNT_DEACTIVATED'
      });
    }

    // Validate password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ 
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role 
      },
      process.env.JWT_SECRET || 'jwt-secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    logger.info(`User logged in: ${user.email}`);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: error.errors 
      });
    }
    logger.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

// Get Dashboard Stats - Optimized with Promise.all
export const getDashboardStats = async (req, res) => {
  try {
    const [
      totalProgrammes,
      totalActivities,
      totalDonors,
      totalDonations,
      totalContactMessages,
      newContactMessages,
      totalDonationAmount,
      thisMonthDonations,
      recentDonations
    ] = await Promise.all([
      prisma.programme.count({ where: { status: 'ACTIVE' } }),
      prisma.activity.count({ where: { status: 'PUBLISHED' } }),
      prisma.donor.count({ where: { status: 'ACTIVE' } }),
      prisma.donation.count({ where: { status: 'COMPLETED' } }),
      prisma.contactMessage.count(),
      prisma.contactMessage.count({ where: { status: 'NEW' } }),
      prisma.donation.aggregate({
        _sum: { amount: true },
        where: { status: 'COMPLETED' }
      }),
      prisma.donation.aggregate({
        _sum: { amount: true },
        where: {
          status: 'COMPLETED',
          donatedAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      }),
      prisma.donation.findMany({
        where: { status: 'COMPLETED' },
        orderBy: { donatedAt: 'desc' },
        take: 5,
        include: {
          donor: {
            select: { name: true, anonymousDonation: true }
          }
        }
      }),
    ]);

    res.json({
      stats: {
        totalProgrammes,
        totalActivities,
        totalDonors,
        totalDonations,
        totalContactMessages,
        newContactMessages,
        totalBeneficiaries: 1500, // Placeholder
        totalDonationAmount: totalDonationAmount._sum.amount || 0,
        thisMonthDonations: thisMonthDonations._sum.amount || 0,
        recentDonations
      }
    });
  } catch (error) {
    logger.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
};

// Get Profile - Optimized
export const getProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        role: true,
        lastLogin: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    logger.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

// Update Profile - With Zod Validation
export const updateProfile = async (req, res) => {
  try {
    const data = profileUpdateSchema.parse(req.body);

    const user = await prisma.user.update({
      where: { id: req.userId },
      data,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        role: true,
      },
    });

    res.json({
      message: 'Profile updated successfully',
      user,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: error.errors 
      });
    }
    logger.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};
