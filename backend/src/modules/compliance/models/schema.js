import { table, int, integer, varchar, text, boolean, json, timestamp, date } from '../../../core/db/dialect.js';
import { baseColumns, withSoftDelete } from '../../../core/db/drizzle-helpers.js';

const idCol = int || integer;

/**
 * Compliance Rules Table
 * Stores compliance requirements and policies (SOC2, GDPR, HIPAA, etc.)
 */
export const complianceRules = table('compliance_rules', {
  ...baseColumns(),
  ...withSoftDelete(),
  policy: varchar('policy', { length: 100 }).notNull(), // soc2, gdpr, hipaa, pci-dss, etc
  requirement: text('requirement').notNull(),
  status: varchar('status', { length: 50 }).default('active').notNull(), // active, inactive, archived
  enforcedByWorkflow: boolean('enforced_by_workflow').default(false).notNull(),
  metadata: json('metadata').$type().default({}),
});

/**
 * Audit Logs Table
 * Comprehensive logging for all compliance-relevant state changes and actions
 */
export const auditLogs = table('audit_logs', {
  ...baseColumns(),
  ...withSoftDelete(),
  action: varchar('action', { length: 255 }).notNull(), // approval_created, approval_approved, document_submitted, etc
  entityType: varchar('entity_type', { length: 100 }).notNull(), // ApprovalTask, Document, Workflow, ComplianceRule, etc
  entityId: varchar('entity_id', { length: 100 }).notNull(),
  userId: idCol('user_id').notNull(),
  changes: json('changes').$type().default({}), // What changed - before/after
  ipAddress: varchar('ip_address', { length: 45 }), // IPv4 or IPv6
  userAgent: text('user_agent'),
  metadata: json('metadata').$type().default({}),
});

/**
 * Compliance Reports Table
 * Generated reports showing compliance status across rules and policies
 */
export const complianceReports = table('compliance_reports', {
  ...baseColumns(),
  ...withSoftDelete(),
  reportName: varchar('report_name', { length: 255 }).notNull(),
  reportType: varchar('report_type', { length: 100 }).notNull(), // soc2, gdpr, hipaa, custom, etc
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  findings: json('findings').$type().default({}), // Compliance status per rule: { policy: { compliant, total, percentage }, ... }
  summary: text('summary'),
  generatedBy: idCol('generated_by').notNull(),
  metadata: json('metadata').$type().default({}),
});
