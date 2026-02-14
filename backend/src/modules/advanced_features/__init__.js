/**
 * Advanced Features Module Initialization
 */

import {
  WebhookModel,
  WebhookLogModel,
  NotificationModel,
  NotificationChannelModel,
  TagModel,
  TaggingModel,
  CommentModel,
  AttachmentModel
} from './models/index.js';
import { AdvancedFeaturesService } from './services/index.js';
import createRoutes from './api/index.js';

const initializeAdvancedFeatures = async (context) => {
  const { sequelize, app } = context;

  console.log('🔧 Initializing Advanced Features Module...');

  const models = {
    Webhook: WebhookModel(sequelize),
    WebhookLog: WebhookLogModel(sequelize),
    Notification: NotificationModel(sequelize),
    NotificationChannel: NotificationChannelModel(sequelize),
    Tag: TagModel(sequelize),
    Tagging: TaggingModel(sequelize),
    Comment: CommentModel(sequelize),
    Attachment: AttachmentModel(sequelize)
  };
  console.log(`✅ Advanced Features models created: ${Object.keys(models).join(', ')}`);

  const services = {
    advancedFeaturesService: new AdvancedFeaturesService(models, sequelize)
  };
  console.log('✅ Advanced Features services created');

  const routes = createRoutes(models, services);
  app.use('/api/advanced_features', routes);
  console.log('✅ Advanced Features API routes registered: /api/advanced_features');

  console.log('✅ Advanced Features Module initialized');

  return { models, services };
};

export default initializeAdvancedFeatures;
