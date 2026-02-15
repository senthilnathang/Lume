/**
 * Advanced Features Module Initialization
 */

import {
  webhooks,
  webhookLogs,
  notifications,
  notificationChannels,
  tags,
  taggings,
  comments,
  attachments
} from './models/schema.js';
import { DrizzleAdapter } from '../../core/db/adapters/drizzle-adapter.js';
import { AdvancedFeaturesService } from './services/index.js';
import { WebhookService } from '../../core/services/webhook.service.js';
import { NotificationService } from '../../core/services/notification.service.js';
import createRoutes from './api/index.js';

const initializeAdvancedFeatures = async (context) => {
  const { app } = context;

  console.log('🔧 Initializing Advanced Features Module...');

  const adapters = {
    Webhook: new DrizzleAdapter(webhooks),
    WebhookLog: new DrizzleAdapter(webhookLogs),
    Notification: new DrizzleAdapter(notifications),
    NotificationChannel: new DrizzleAdapter(notificationChannels),
    Tag: new DrizzleAdapter(tags),
    Tagging: new DrizzleAdapter(taggings),
    Comment: new DrizzleAdapter(comments),
    Attachment: new DrizzleAdapter(attachments)
  };
  console.log(`✅ Advanced Features adapters created: ${Object.keys(adapters).join(', ')}`);

  const webhookService = new WebhookService(adapters.Webhook, adapters.WebhookLog);
  const notificationService = new NotificationService(adapters.Notification, adapters.NotificationChannel);

  const services = {
    advancedFeaturesService: new AdvancedFeaturesService(adapters),
    webhookService,
    notificationService
  };
  console.log('✅ Advanced Features services created (including webhook trigger + notification dispatch)');

  const routes = createRoutes(adapters, services);
  app.use('/api/advanced_features', routes);
  console.log('✅ Advanced Features API routes registered: /api/advanced_features');

  console.log('✅ Advanced Features Module initialized');

  return { models: adapters, services };
};

export default initializeAdvancedFeatures;
