import { Injectable } from '@nestjs/common';
import { DrizzleService } from '@core/services/drizzle.service';
import { eq } from 'drizzle-orm';

@Injectable()
export class CatalogSeederService {
  private marketplacePlugins: any;
  private marketplaceCategories: any;

  constructor(private drizzle: DrizzleService) {
    this.initializeSchema();
  }

  private async initializeSchema() {
    try {
      const schema = await import('../models/schema');
      this.marketplacePlugins = schema.marketplacePlugins;
      this.marketplaceCategories = schema.marketplaceCategories;
    } catch (error) {
      console.error('Failed to load schema:', error);
    }
  }

  async seed() {
    try {
      const db = this.drizzle.getDrizzle();

      // Check if already seeded
      const existing = await db
        .select()
        .from(this.marketplaceCategories)
        .limit(1);

      if (existing && existing.length > 0) {
        console.log('Catalog already seeded, skipping');
        return { success: true, message: 'Catalog already exists' };
      }

      // Seed categories
      const categories = [
        {
          name: 'CRM',
          slug: 'crm',
          icon: '👥',
          description: 'Customer Relationship Management plugins',
        },
        {
          name: 'HR',
          slug: 'hr',
          icon: '👔',
          description: 'Human Resources and employee management',
        },
        {
          name: 'Finance',
          slug: 'finance',
          icon: '💰',
          description: 'Financial management and accounting tools',
        },
        {
          name: 'Productivity',
          slug: 'productivity',
          icon: '⚡',
          description: 'Workflow automation and productivity tools',
        },
        {
          name: 'Integrations',
          slug: 'integrations',
          icon: '🔗',
          description: 'Third-party service integrations',
        },
        {
          name: 'Analytics',
          slug: 'analytics',
          icon: '📊',
          description: 'Data analytics and reporting',
        },
        {
          name: 'Forms',
          slug: 'forms',
          icon: '📝',
          description: 'Form builders and data collection',
        },
        {
          name: 'E-commerce',
          slug: 'ecommerce',
          icon: '🛒',
          description: 'E-commerce and sales tools',
        },
      ];

      for (const cat of categories) {
        await db.insert(this.marketplaceCategories).values({
          name: cat.name,
          slug: cat.slug,
          icon: cat.icon,
          description: cat.description,
          pluginCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      // Seed plugins
      const plugins = [
        {
          name: 'sales-assistant',
          displayName: 'Sales Assistant',
          version: '1.0.0',
          author: 'Lume Team',
          description: 'AI-powered sales pipeline management and forecasting',
          category: 'CRM',
          tags: ['sales', 'ai', 'automation'],
          pricing: 'premium',
          icon: '📈',
          rating: '4.8',
          reviewCount: 125,
          downloadCount: 2540,
          status: 'active',
        },
        {
          name: 'hr-onboarding',
          displayName: 'HR Onboarding Suite',
          version: '2.1.0',
          author: 'People First',
          description: 'Streamlined employee onboarding and offboarding workflows',
          category: 'HR',
          tags: ['onboarding', 'employee', 'workflow'],
          pricing: 'premium',
          icon: '🎯',
          rating: '4.6',
          reviewCount: 89,
          downloadCount: 1834,
          status: 'active',
        },
        {
          name: 'invoice-pro',
          displayName: 'Invoice Pro',
          version: '1.5.2',
          author: 'FinTech Labs',
          description: 'Professional invoicing with automated payment reminders',
          category: 'Finance',
          tags: ['invoicing', 'payments', 'accounting'],
          pricing: 'free',
          icon: '💵',
          rating: '4.7',
          reviewCount: 256,
          downloadCount: 5120,
          status: 'active',
        },
        {
          name: 'workflow-engine',
          displayName: 'Workflow Engine',
          version: '3.0.0',
          author: 'Automation Corp',
          description: 'Visual workflow builder with 500+ integrations',
          category: 'Productivity',
          tags: ['automation', 'workflow', 'integrations'],
          pricing: 'premium',
          icon: '⚙️',
          rating: '4.9',
          reviewCount: 512,
          downloadCount: 8900,
          status: 'active',
        },
        {
          name: 'slack-connector',
          displayName: 'Slack Connector',
          version: '1.2.1',
          author: 'Integration Experts',
          description: 'Seamless Slack integration for notifications and commands',
          category: 'Integrations',
          tags: ['slack', 'messaging', 'notifications'],
          pricing: 'free',
          icon: '💬',
          rating: '4.5',
          reviewCount: 178,
          downloadCount: 3456,
          status: 'active',
        },
        {
          name: 'analytics-dashboard',
          displayName: 'Analytics Dashboard',
          version: '2.3.0',
          author: 'Data Insights Inc',
          description: 'Real-time analytics with 100+ pre-built reports',
          category: 'Analytics',
          tags: ['analytics', 'reporting', 'dashboards'],
          pricing: 'premium',
          icon: '📊',
          rating: '4.8',
          reviewCount: 334,
          downloadCount: 6234,
          status: 'active',
        },
        {
          name: 'form-builder-pro',
          displayName: 'Form Builder Pro',
          version: '1.8.3',
          author: 'Form Technologies',
          description: 'Drag-and-drop form builder with conditional logic',
          category: 'Forms',
          tags: ['forms', 'surveys', 'data-collection'],
          pricing: 'premium',
          icon: '📋',
          rating: '4.7',
          reviewCount: 223,
          downloadCount: 4567,
          status: 'active',
        },
        {
          name: 'inventory-manager',
          displayName: 'Inventory Manager',
          version: '1.4.0',
          author: 'Supply Chain Hub',
          description: 'Real-time inventory tracking and management',
          category: 'E-commerce',
          tags: ['inventory', 'stock', 'ecommerce'],
          pricing: 'premium',
          icon: '📦',
          rating: '4.6',
          reviewCount: 145,
          downloadCount: 2891,
          status: 'active',
        },
        {
          name: 'email-marketing',
          displayName: 'Email Marketing Pro',
          version: '2.0.0',
          author: 'Marketing Solutions',
          description: 'Email campaigns with advanced segmentation and automation',
          category: 'Productivity',
          tags: ['email', 'marketing', 'campaigns'],
          pricing: 'premium',
          icon: '📧',
          rating: '4.5',
          reviewCount: 267,
          downloadCount: 5678,
          status: 'active',
        },
        {
          name: 'payment-gateway',
          displayName: 'Payment Gateway',
          version: '1.3.2',
          author: 'PayTech Solutions',
          description: 'Multi-currency payment processing with fraud detection',
          category: 'Finance',
          tags: ['payments', 'transactions', 'security'],
          pricing: 'premium',
          icon: '💳',
          rating: '4.9',
          reviewCount: 456,
          downloadCount: 7234,
          status: 'active',
        },
      ];

      for (const plugin of plugins) {
        await db.insert(this.marketplacePlugins).values({
          name: plugin.name,
          displayName: plugin.displayName,
          version: plugin.version,
          author: plugin.author,
          description: plugin.description,
          category: plugin.category,
          tags: plugin.tags,
          pricing: plugin.pricing,
          icon: plugin.icon,
          rating: plugin.rating,
          reviewCount: plugin.reviewCount,
          downloadCount: plugin.downloadCount,
          status: plugin.status,
          publishedAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000),
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      console.log('Catalog seeded successfully with 8 categories and 10 plugins');
      return { success: true, message: 'Catalog seeded' };
    } catch (error) {
      console.error('Catalog seed error:', error);
      return { success: false, error: error.message };
    }
  }
}
