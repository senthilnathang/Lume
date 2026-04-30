/**
 * @fileoverview Ticket Entity Example
 * Complete end-to-end example demonstrating all Phase 1-7 features
 *
 * This single entity definition automatically provides:
 * - REST CRUD API with permission enforcement
 * - Field-level read/write permissions
 * - Workflow automation on events
 * - Agent-based auto-escalation
 * - Multiple view types (Table, Kanban)
 * - 5-layer caching
 * - Query optimization
 * - Rate limiting
 */

import {
  defineEntity,
  defineField,
  defineRelation,
  definePermission,
  defineWorkflow,
  defineAgent,
  defineView,
} from '../src/domains/entity/entity-builder.js';

/**
 * Complete Ticket entity with all Phase 1-7 features
 */
export const Ticket = defineEntity({
  slug: 'ticket',
  label: 'Support Ticket',
  description: 'Customer support tickets with auto-escalation and workflows',
  orm: 'drizzle',
  tableName: 'tickets',
  softDelete: true,
  auditable: true,

  // Phase 2: Field definitions
  fields: [
    defineField('title', 'text', {
      required: true,
      validation: [
        { rule: 'minLength', value: 3 },
        { rule: 'maxLength', value: 200 },
      ],
    }),

    defineField('description', 'rich-text', {
      required: false,
      validation: [{ rule: 'maxLength', value: 5000 }],
    }),

    defineField('status', 'select', {
      required: true,
      defaultValue: 'open',
      validation: [
        {
          rule: 'enum',
          values: ['open', 'in_progress', 'waiting', 'closed'],
        },
      ],
    }),

    defineField('priority', 'select', {
      required: true,
      defaultValue: 'medium',
      validation: [
        {
          rule: 'enum',
          values: ['low', 'medium', 'high', 'urgent'],
        },
      ],
    }),

    defineField('severity', 'number', {
      required: false,
      validation: [
        { rule: 'min', value: 1 },
        { rule: 'max', value: 10 },
      ],
    }),

    defineField('daysOpen', 'number', {
      computed: true,
      computed_expression: 'daysSince(createdAt)',
      label: 'Days Open',
    }),

    defineField('resolvedAt', 'datetime', {
      required: false,
    }),
  ],

  // Phase 2: Relations
  relations: [
    defineRelation('assignedTo', 'user', {
      type: 'many-to-one',
      label: 'Assigned To',
      required: false,
    }),

    defineRelation('createdBy', 'user', {
      type: 'many-to-one',
      label: 'Created By',
      required: false,
    }),
  ],

  // Phase 1: Hooks (beforeCreate, afterCreate, etc.)
  hooks: {
    beforeCreate: [
      async (record, context) => {
        // Auto-set status to 'open' on creation
        record.status = 'open';
        record.createdBy = context.userId;
      },
    ],
    beforeUpdate: [
      async (record, context) => {
        // Auto-set resolvedAt when status changes to closed
        if (record.status === 'closed' && !record.resolvedAt) {
          record.resolvedAt = new Date();
        }
      },
    ],
  },

  // Phase 4: Workflows
  workflows: {
    onCreate: ['ticket.notify_customer'],
    onUpdate: ['ticket.escalation_check'],
  },

  // Phase 6: Agents
  agents: [
    defineAgent({
      id: 'auto_escalate',
      triggerEvent: 'scheduled',
      schedule: '0 */4 * * *', // Every 4 hours
      trigger: 'data.status != "closed" AND data.daysOpen > 2',
      action: {
        type: 'escalate',
        config: {
          updates: {
            priority: 'urgent',
            escalatedAt: 'now',
          },
        },
      },
      description: 'Auto-escalate tickets open for more than 2 days',
      enabled: true,
    }),

    defineAgent({
      id: 'notify_on_high_severity',
      triggerEvent: 'onUpdate',
      trigger: 'data.severity > 8',
      action: {
        type: 'workflow',
        config: {
          workflowId: 'ticket.notify_critical',
        },
      },
      description: 'Notify team of high severity tickets',
      enabled: true,
    }),
  ],

  // Phase 3: Permissions
  permissions: [
    definePermission({
      resource: 'ticket',
      action: 'create',
      rule: 'user.role == "support_agent" OR user.role == "manager"',
      description: 'Support agents and managers can create tickets',
    }),

    definePermission({
      resource: 'ticket',
      action: 'read',
      rule: 'assignedTo == user.id OR user.role == "manager" OR user.role == "admin"',
      scope: 'return records matching condition',
      description: 'Users see their own tickets, managers/admins see all',
    }),

    definePermission({
      resource: 'ticket',
      action: 'update',
      rule: 'assignedTo == user.id OR user.role == "manager"',
      description: 'Assigned users can update, managers can update all',
    }),

    definePermission({
      resource: 'ticket',
      action: 'delete',
      rule: 'user.role == "manager" OR user.role == "admin"',
      description: 'Only managers and admins can delete',
    }),
  ],

  // Field-level permissions
  fieldPermissions: [
    {
      field: 'status',
      action: 'update',
      rule: 'user.role == "manager" OR user.role == "admin"',
      description: 'Only managers can change status',
    },

    {
      field: 'priority',
      action: 'update',
      rule: 'user.role == "manager" OR user.role == "admin"',
      description: 'Only managers can change priority',
    },

    {
      field: 'assignedTo',
      action: 'update',
      rule: 'user.role == "manager" OR user.role == "admin"',
      description: 'Only managers can reassign',
    },

    {
      field: 'severity',
      action: 'read',
      rule: 'user.role == "manager" OR user.role == "admin" OR assignedTo == user.id',
      description: 'Severity visible to assigned user and managers',
    },
  ],

  // Phase 5: Views
  views: [
    defineView({
      id: 'table',
      type: 'table',
      label: 'Table View',
      columns: ['title', 'status', 'priority', 'assignedTo', 'daysOpen'],
      defaultSort: {
        field: 'createdAt',
        order: 'desc',
      },
      filters: [
        { field: 'status', operator: 'enum' },
        { field: 'priority', operator: 'enum' },
        { field: 'assignedTo', operator: 'relation' },
      ],
      pageSize: 25,
    }),

    defineView({
      id: 'kanban',
      type: 'kanban',
      label: 'Kanban Board',
      groupBy: 'status',
      groupValues: ['open', 'in_progress', 'waiting', 'closed'],
      columns: ['title', 'priority', 'assignedTo', 'daysOpen'],
      cardHeight: 120,
    }),

    defineView({
      id: 'calendar',
      type: 'calendar',
      label: 'Timeline',
      dateField: 'createdAt',
      columns: ['title', 'priority', 'assignedTo'],
    }),

    defineView({
      id: 'my_tickets',
      type: 'table',
      label: 'My Tickets',
      columns: ['title', 'status', 'priority', 'daysOpen'],
      filters: [
        {
          field: 'assignedTo',
          operator: 'equals',
          value: 'user.id', // Dynamic filter
        },
      ],
      defaultSort: {
        field: 'priority',
        order: 'desc',
      },
    }),
  ],

  // Phase 7: Caching configuration
  cache: {
    l2Ttl: 300, // 5 minutes for entity metadata
    l3Ttl: 30, // 30 seconds for query results
    strategies: {
      list: 'public',
      single: 'private',
    },
  },

  // Phase 7: Rate limiting configuration
  rateLimit: {
    create: { requests: 100, window: 60 },
    read: { requests: 1000, window: 60 },
    update: { requests: 500, window: 60 },
    delete: { requests: 50, window: 60 },
  },
});

export default Ticket;
