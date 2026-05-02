import { DrizzleAdapter } from '../../../core/db/adapters/drizzle-adapter.js';
import { complianceRules, auditLogs, complianceReports } from './schema.js';

const complianceRuleAdapter = new DrizzleAdapter(complianceRules);
const auditLogAdapter = new DrizzleAdapter(auditLogs);
const complianceReportAdapter = new DrizzleAdapter(complianceReports);

export {
  complianceRuleAdapter,
  auditLogAdapter,
  complianceReportAdapter,
  complianceRules,
  auditLogs,
  complianceReports,
};

export default {
  complianceRuleAdapter,
  auditLogAdapter,
  complianceReportAdapter,
  complianceRules,
  auditLogs,
  complianceReports,
};
