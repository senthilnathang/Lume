import { SmsService } from './services/sms.service.js';
import createSmsRoutes from './api/routes.js';

const initializeSms = async (context) => {
  const { app } = context;
  const service = new SmsService();
  app.use('/api/sms', createSmsRoutes(service));
  console.log('✅ SMS Gateway API routes registered: /api/sms');
  return { services: { smsService: service } };
};

export default initializeSms;
export { initializeSms };
