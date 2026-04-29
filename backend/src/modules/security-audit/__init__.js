/**
 * Security Audit Module Initialization
 */

import manifest from './manifest.js';
import { SecurityAuditService } from './services/security-audit.service.js';
import { createSecurityAuditRoutes } from './routes.js';
import securityHardening from './security-hardening.js';

export async function initializeSecurityAuditModule(app, prisma, drizzle) {
  console.log('🔐 Initializing Security Audit Module...');

  try {
    // Create service instance
    const auditService = new SecurityAuditService(prisma, drizzle);

    // Register routes
    const routes = createSecurityAuditRoutes(prisma, drizzle);
    app.use('/api/security', routes);

    // Export security utilities globally for other modules
    global.SecurityHardening = securityHardening;

    console.log('✅ Security Audit Module initialized');
    console.log('📝 Available endpoints:');
    console.log('   - GET /api/security/audit - Generate audit report');
    console.log('   - GET /api/security/owasp - OWASP Top 10 scan');
    console.log('   - GET /api/security/api-scan - API security scan');
    console.log('   - GET /api/security/dependencies - Dependency audit');
    console.log('   - GET /api/security/risk-score - Current risk score');

    return {
      service: auditService,
      hardening: securityHardening
    };
  } catch (error) {
    console.error('❌ Failed to initialize Security Audit Module:', error);
    throw error;
  }
}

export { SecurityAuditService, securityHardening };
export default manifest;
