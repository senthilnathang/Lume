/**
 * Global Search API
 * Searches across multiple Prisma models for a query term.
 * GET /api/search?q=term&limit=20
 */

import { Router } from 'express';
import prisma from '../db/prisma.js';

const searchRouter = Router();

// Define searchable models and their fields
const SEARCHABLE_MODELS = [
  {
    model: 'activities',
    label: 'Activities',
    fields: ['title', 'description', 'slug'],
    display: (r) => ({ id: r.id, title: r.title, description: r.description?.substring(0, 100) }),
  },
  {
    model: 'donations',
    label: 'Donations',
    fields: ['notes'],
    display: (r) => ({ id: r.id, title: `Donation #${r.id}`, description: `Amount: ${r.amount}` }),
  },
  {
    model: 'donors',
    label: 'Donors',
    fields: ['first_name', 'last_name', 'email'],
    display: (r) => ({ id: r.id, title: `${r.first_name} ${r.last_name}`, description: r.email }),
  },
  {
    model: 'user',
    label: 'Users',
    fields: ['email', 'firstName', 'lastName'],
    display: (r) => ({ id: r.id, title: `${r.firstName} ${r.lastName}`, description: r.email }),
  },
  {
    model: 'team_members',
    label: 'Team',
    fields: ['first_name', 'last_name', 'email', 'position'],
    display: (r) => ({ id: r.id, title: `${r.first_name} ${r.last_name}`, description: r.position }),
  },
  {
    model: 'documents',
    label: 'Documents',
    fields: ['title', 'description'],
    display: (r) => ({ id: r.id, title: r.title, description: r.description?.substring(0, 100) }),
  },
  {
    model: 'messages',
    label: 'Messages',
    fields: ['subject', 'body'],
    display: (r) => ({ id: r.id, title: r.subject, description: r.body?.substring(0, 100) }),
  },
  {
    model: 'campaigns',
    label: 'Campaigns',
    fields: ['name', 'description'],
    display: (r) => ({ id: r.id, title: r.name, description: r.description?.substring(0, 100) }),
  },
];

searchRouter.get('/', async (req, res) => {
  try {
    const { q, limit: limitStr, models: modelFilter } = req.query;

    if (!q || q.trim().length < 2) {
      return res.json({ success: true, data: { results: [], total: 0 } });
    }

    const limit = Math.min(parseInt(limitStr) || 20, 50);
    const query = q.trim();

    // Filter to specific models if requested
    const allowedModels = modelFilter ? modelFilter.split(',').map(m => m.trim()) : null;
    const modelsToSearch = allowedModels
      ? SEARCHABLE_MODELS.filter(m => allowedModels.includes(m.model) || allowedModels.includes(m.label.toLowerCase()))
      : SEARCHABLE_MODELS;

    const results = [];

    for (const config of modelsToSearch) {
      try {
        const prismaModel = prisma[config.model];
        if (!prismaModel) continue;

        // Build OR conditions for each searchable field
        const orConditions = config.fields.map(field => ({
          [field]: { contains: query }
        }));

        const rows = await prismaModel.findMany({
          where: { OR: orConditions },
          take: Math.ceil(limit / modelsToSearch.length) + 2,
          orderBy: { id: 'desc' },
        });

        for (const row of rows) {
          results.push({
            ...config.display(row),
            model: config.model,
            group: config.label,
          });
        }
      } catch {
        // Model may not exist or have different fields — skip
      }
    }

    // Sort by relevance (exact title match first)
    results.sort((a, b) => {
      const aExact = a.title?.toLowerCase().includes(query.toLowerCase()) ? 0 : 1;
      const bExact = b.title?.toLowerCase().includes(query.toLowerCase()) ? 0 : 1;
      return aExact - bExact;
    });

    res.json({
      success: true,
      data: {
        results: results.slice(0, limit),
        total: results.length,
        query,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default searchRouter;
