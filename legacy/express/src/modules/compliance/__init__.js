/**
 * Compliance Module Initialization
 */

import {
  complianceRules,
  auditLogs,
  complianceReports,
} from './models/schema.js';
import { DrizzleAdapter } from '../../core/db/adapters/drizzle-adapter.js';
import { ComplianceService } from './services/compliance.service.js';
import { AuditService } from './services/audit.service.js';
import createRoutes from './api/index.js';

const initializeCompliance = async (context) => {
  const { app } = context;

  console.log('🔧 Initializing Compliance Module...');

  // Create adapters
  const adapters = {
    complianceRuleAdapter: new DrizzleAdapter(complianceRules),
    auditLogAdapter: new DrizzleAdapter(auditLogs),
    complianceReportAdapter: new DrizzleAdapter(complianceReports),
  };
  console.log(`✅ Compliance adapters created: ${Object.keys(adapters).join(', ')}`);

  // Instantiate services
  const services = {
    ComplianceService: new ComplianceService(adapters),
    AuditService: new AuditService(adapters),
  };
  console.log('✅ Compliance services created');

  // Create and register routes
  const routes = createRoutes(adapters, services);
  app.use('/api/compliance', routes);
  console.log('✅ Compliance API routes registered: /api/compliance');

  console.log('✅ Compliance Module initialized');

  return { models: adapters, services };
};

export default initializeCompliance;
