import { MailService } from './services/mail.service.js';
import createMailRoutes from './api/routes.js';

const initializeMail = async (context) => {
  const { app } = context;
  const service = new MailService();
  app.use('/api/mail', createMailRoutes(service));
  console.log('✅ Mail API routes registered: /api/mail');
  return { services: { mailService: service } };
};

export default initializeMail;
export { initializeMail };
