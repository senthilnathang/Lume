/**
 * CRM Module Example
 *
 * This example demonstrates a complete CRM module with:
 * - Three core entities (Lead, Contact, Opportunity)
 * - Relationship between entities
 * - Automated workflows
 * - ABAC policies for access control
 * - Views for different use cases
 * - Computed/formula fields
 */

import { defineModule } from '@core/module/define-module';
import { defineEntity } from '@core/entity/define-entity';
import { defineWorkflow } from '@core/workflow/define-workflow';
import { definePolicy } from '@core/permission/define-policy';
import { defineView } from '@core/view/define-view';

// ============ ENTITIES ============

export const LeadEntity = defineEntity('Lead', {
  name: 'Lead',
  label: 'Lead',
  description: 'A prospective customer who has shown interest in products/services',
  icon: 'users',
  fields: {
    id: { name: 'id', type: 'int', required: true },
    firstName: { name: 'firstName', type: 'string', required: true },
    lastName: { name: 'lastName', type: 'string', required: true },
    email: { name: 'email', type: 'email', required: true },
    phone: { name: 'phone', type: 'string' },
    company: { name: 'company', type: 'string' },
    industry: { name: 'industry', type: 'string' },
    status: { name: 'status', type: 'string', defaultValue: 'new' },
    leadScore: { name: 'leadScore', type: 'int', defaultValue: 0 },
    source: { name: 'source', type: 'string' }, // web, email, trade-show, referral
    owner: { name: 'owner', type: 'int', isIndexed: true }, // user ID
    convertedAt: { name: 'convertedAt', type: 'datetime' },
    convertedToContactId: { name: 'convertedToContactId', type: 'int' },
    notes: { name: 'notes', type: 'text' },
    createdAt: { name: 'createdAt', type: 'datetime' },
    updatedAt: { name: 'updatedAt', type: 'datetime' },
  },
  computed: {
    fullName: {
      formula: "CONCAT(firstName, ' ', lastName)",
      type: 'string',
      label: 'Full Name',
    },
    qualificationScore: {
      formula: "IF(status='qualified', leadScore * 1.5, leadScore)",
      type: 'int',
      label: 'Qualification Score',
    },
  },
  hooks: {
    beforeCreate: async (data, ctx) => {
      // Auto-assign leads based on round-robin or load-balancing
      if (!data.owner) {
        const assignedUser = await ctx.services.assignmentService.getNextAvailableUser();
        data.owner = assignedUser.id;
      }
      return data;
    },
    afterCreate: async (record, ctx) => {
      // Emit event for lead creation
      await ctx.eventBus.emit({
        type: 'lead.created',
        data: { leadId: record.id, email: record.email },
      });
    },
    beforeUpdate: async (id, data, ctx) => {
      // Track status changes
      const current = await ctx.services.recordService.get('Lead', id);
      if (current.status !== data.status) {
        ctx.auditLog.track('lead_status_changed', {
          leadId: id,
          from: current.status,
          to: data.status,
        });
      }
      return data;
    },
  },
  permissions: {
    read: ['crm.leads.read', 'crm.admin'],
    write: ['crm.leads.write'],
    delete: ['crm.leads.delete'],
  },
  aiMetadata: {
    description: 'Prospective customers with contact info, company context, engagement level, and conversion status',
    sensitiveFields: ['email', 'phone'],
    summarizeWith: 'Summarize as: [Name] from [Company], status=[status], score=[leadScore], owner=[owner]',
  },
});

export const ContactEntity = defineEntity('Contact', {
  name: 'Contact',
  label: 'Contact',
  description: 'A person contact at a company who is involved in sales opportunities',
  icon: 'user-circle',
  fields: {
    id: { name: 'id', type: 'int', required: true },
    firstName: { name: 'firstName', type: 'string', required: true },
    lastName: { name: 'lastName', type: 'string', required: true },
    email: { name: 'email', type: 'email', required: true },
    phone: { name: 'phone', type: 'string' },
    jobTitle: { name: 'jobTitle', type: 'string' },
    department: { name: 'department', type: 'string' },
    accountId: { name: 'accountId', type: 'int', isIndexed: true }, // Account/Company ID
    reportingTo: { name: 'reportingTo', type: 'int' }, // Another contact ID
    primaryDecisionMaker: { name: 'primaryDecisionMaker', type: 'boolean', defaultValue: false },
    preferredContactMethod: { name: 'preferredContactMethod', type: 'string' }, // email, phone, linkedin
    lastContactedAt: { name: 'lastContactedAt', type: 'datetime' },
    notes: { name: 'notes', type: 'text' },
    createdAt: { name: 'createdAt', type: 'datetime' },
    updatedAt: { name: 'updatedAt', type: 'datetime' },
  },
  computed: {
    fullName: {
      formula: "CONCAT(firstName, ' ', lastName)",
      type: 'string',
      label: 'Full Name',
    },
  },
  aiMetadata: {
    description: 'Individual decision makers and contacts at customer accounts with role, department, and communication preferences',
    sensitiveFields: ['email', 'phone'],
  },
});

export const OpportunityEntity = defineEntity('Opportunity', {
  name: 'Opportunity',
  label: 'Opportunity',
  description: 'A potential sale or deal with a customer, tracking value and stage',
  icon: 'briefcase',
  fields: {
    id: { name: 'id', type: 'int', required: true },
    name: { name: 'name', type: 'string', required: true },
    accountId: { name: 'accountId', type: 'int', required: true, isIndexed: true },
    primaryContactId: { name: 'primaryContactId', type: 'int' },
    amount: { name: 'amount', type: 'decimal', required: true },
    currency: { name: 'currency', type: 'string', defaultValue: 'USD' },
    stage: { name: 'stage', type: 'string', required: true }, // prospect, negotiation, proposal, closing, won, lost
    probability: { name: 'probability', type: 'int', defaultValue: 0 }, // 0-100%
    expectedCloseDate: { name: 'expectedCloseDate', type: 'date', required: true },
    actualCloseDate: { name: 'actualCloseDate', type: 'date' },
    owner: { name: 'owner', type: 'int', isIndexed: true },
    description: { name: 'description', type: 'text' },
    nextAction: { name: 'nextAction', type: 'string' },
    nextActionDate: { name: 'nextActionDate', type: 'date' },
    createdAt: { name: 'createdAt', type: 'datetime' },
    updatedAt: { name: 'updatedAt', type: 'datetime' },
  },
  computed: {
    expectedRevenue: {
      formula: 'amount * (probability / 100)',
      type: 'decimal',
      label: 'Expected Revenue',
    },
    daysToClose: {
      formula: 'DATEDIFF(expectedCloseDate, NOW())',
      type: 'int',
      label: 'Days to Close',
    },
  },
  aiMetadata: {
    description: 'Sales deals tracked by stage, probability, and financial value with timeline',
    sensitiveFields: [],
  },
});

// ============ WORKFLOWS ============

export const LeadAssignmentWorkflow = defineWorkflow({
  name: 'lead-assignment',
  version: '1.0.0',
  entity: 'Lead',
  trigger: { type: 'record.created' },
  steps: [
    {
      type: 'condition',
      if: { field: 'owner', operator: '==', value: null },
      then: [
        {
          type: 'ai',
          prompt: 'Suggest the best sales rep for this lead based on: firstName, lastName, company, industry, source',
          outputField: 'suggestedOwner',
        },
        {
          type: 'set_field',
          field: 'owner',
          value: '$suggestedOwner',
        },
      ],
    },
  ],
  onError: 'continue',
  maxRetries: 1,
});

export const LeadScoringWorkflow = defineWorkflow({
  name: 'lead-scoring',
  version: '1.0.0',
  entity: 'Lead',
  trigger: { type: 'record.updated', field: 'status' },
  steps: [
    {
      type: 'condition',
      if: { field: 'status', operator: '==', value: 'interested' },
      then: [
        { type: 'set_field', field: 'leadScore', value: 50 },
        {
          type: 'send_notification',
          to: '$owner',
          template: 'lead_interested_notification',
        },
      ],
    },
    {
      type: 'condition',
      if: { field: 'status', operator: '==', value: 'qualified' },
      then: [
        { type: 'set_field', field: 'leadScore', value: 100 },
        {
          type: 'create_record',
          entity: 'Opportunity',
          data: {
            name: '$firstName $lastName - Opportunity',
            accountId: null, // Would link to account lookup
            amount: 0,
            stage: 'prospect',
            owner: '$owner',
          },
        },
      ],
    },
  ],
  onError: 'continue',
});

export const OpportunityNurturingWorkflow = defineWorkflow({
  name: 'opportunity-nurturing',
  version: '1.0.0',
  entity: 'Opportunity',
  trigger: { type: 'schedule', cron: '0 9 * * 1-5' }, // Weekday mornings
  steps: [
    {
      type: 'condition',
      if: { field: 'stage', operator: '!=', value: 'won' },
      then: [
        {
          type: 'condition',
          if: { field: 'nextActionDate', operator: '<=', value: 'TODAY()' },
          then: [
            {
              type: 'send_notification',
              to: '$owner',
              template: 'opportunity_follow_up',
            },
          ],
        },
      ],
    },
  ],
  onError: 'continue',
});

// ============ POLICIES ============

export const LeadViewerPolicy = definePolicy({
  name: 'lead-viewer-policy',
  entity: 'Lead',
  actions: ['read'],
  conditions: [
    // Can view leads assigned to self
    { field: 'owner', operator: '==', value: '$userId' },
  ],
  roles: ['sales_rep'],
  deny: false,
});

export const LeadOwnerWritePolicy = definePolicy({
  name: 'lead-owner-write-policy',
  entity: 'Lead',
  actions: ['write', 'update'],
  conditions: [
    // Can write only own assigned leads
    { field: 'owner', operator: '==', value: '$userId' },
  ],
  roles: ['sales_rep'],
  deny: false,
});

export const AdminAllAccessPolicy = definePolicy({
  name: 'admin-all-access',
  entity: 'Lead',
  actions: ['*'],
  roles: ['admin', 'super_admin'],
  deny: false,
});

// ============ VIEWS ============

export const LeadsTableView = defineView({
  name: 'leads-table',
  entity: 'Lead',
  type: 'table',
  label: 'Leads Table',
  isDefault: true,
  config: {
    columns: [
      { field: 'firstName', label: 'First Name', sortable: true, filterable: true },
      { field: 'lastName', label: 'Last Name', sortable: true },
      { field: 'company', label: 'Company', sortable: true, filterable: true },
      { field: 'status', label: 'Status', sortable: true, filterable: true },
      { field: 'leadScore', label: 'Score', type: 'number', sortable: true },
      { field: 'owner', label: 'Owner', sortable: true, filterable: true },
      { field: 'createdAt', label: 'Created', type: 'date', sortable: true },
    ],
    pageSize: 25,
  },
});

export const LeadsKanbanView = defineView({
  name: 'leads-kanban',
  entity: 'Lead',
  type: 'kanban',
  label: 'Leads Pipeline',
  config: {
    groupByField: 'status',
    groupOptions: ['new', 'contacted', 'interested', 'qualified', 'closed'],
    cardFields: ['firstName', 'company', 'leadScore', 'owner'],
    summaryField: 'leadScore',
  },
});

export const OpportunitiesDashboard = defineView({
  name: 'opportunities-dashboard',
  entity: 'Opportunity',
  type: 'dashboard',
  label: 'Sales Pipeline Dashboard',
  config: {
    widgets: [
      {
        type: 'counter',
        field: 'id',
        aggregation: 'count',
        label: 'Total Opportunities',
        filter: { stage: { $ne: 'lost' } },
      },
      {
        type: 'counter',
        field: 'amount',
        aggregation: 'sum',
        label: 'Pipeline Value',
        filter: { stage: { $ne: 'lost' } },
      },
      {
        type: 'chart',
        chartType: 'pie',
        field: 'stage',
        aggregation: 'count',
        label: 'Opportunities by Stage',
      },
      {
        type: 'chart',
        chartType: 'bar',
        field: 'owner',
        aggregation: 'sum:amount',
        label: 'Revenue by Owner',
      },
    ],
  },
});

// ============ MODULE DEFINITION ============

export const CRMModule = defineModule({
  name: 'crm',
  version: '2.0.0',
  description: 'Complete Customer Relationship Management system with lead tracking, contact management, and sales pipeline',
  depends: ['base'], // Depends on the base module

  entities: [LeadEntity, ContactEntity, OpportunityEntity],

  workflows: [
    LeadAssignmentWorkflow,
    LeadScoringWorkflow,
    OpportunityNurturingWorkflow,
  ],

  views: [
    LeadsTableView,
    LeadsKanbanView,
    OpportunitiesDashboard,
  ],

  permissions: [
    'crm.leads.read',
    'crm.leads.write',
    'crm.leads.delete',
    'crm.contacts.read',
    'crm.contacts.write',
    'crm.contacts.delete',
    'crm.opportunities.read',
    'crm.opportunities.write',
    'crm.opportunities.delete',
  ],

  hooks: {
    onInstall: async (db) => {
      console.log('Installing CRM module...');
      // Would run SQL migrations specific to CRM
    },
    onLoad: async () => {
      console.log('CRM module loaded');
    },
    onUninstall: async (db) => {
      console.log('Uninstalling CRM module...');
      // Clean up CRM data
    },
  },

  frontend: {
    routes: [
      { path: '/crm/leads', component: 'LeadsPage' },
      { path: '/crm/contacts', component: 'ContactsPage' },
      { path: '/crm/opportunities', component: 'OpportunitiesPage' },
    ],
    menu: [
      {
        label: 'CRM',
        icon: 'briefcase',
        children: [
          { label: 'Leads', path: '/crm/leads' },
          { label: 'Contacts', path: '/crm/contacts' },
          { label: 'Opportunities', path: '/crm/opportunities' },
        ],
      },
    ],
  },
});

// Export for use in application
export default CRMModule;
