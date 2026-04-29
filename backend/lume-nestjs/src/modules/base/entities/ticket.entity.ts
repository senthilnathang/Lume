import { defineEntity } from '@core/entity/define-entity';

export const TicketEntity = defineEntity('Ticket', {
  label: 'Ticket',
  description: 'A support ticket representing a customer issue or request',
  icon: 'ticket',
  fields: {
    id: {
      name: 'id',
      type: 'int',
      label: 'ID',
      required: true,
    },
    subject: {
      name: 'subject',
      type: 'string',
      label: 'Subject',
      required: true,
      isIndexed: true,
    },
    description: {
      name: 'description',
      type: 'text',
      label: 'Description',
      required: true,
    },
    priority: {
      name: 'priority',
      type: 'string',
      label: 'Priority',
      required: true,
      isIndexed: true,
      defaultValue: 'medium',
    },
    status: {
      name: 'status',
      type: 'string',
      label: 'Status',
      required: true,
      isIndexed: true,
      defaultValue: 'open',
    },
    category: {
      name: 'category',
      type: 'string',
      label: 'Category',
      isIndexed: true,
    },
    assignee: {
      name: 'assignee',
      type: 'int',
      label: 'Assignee',
      isIndexed: true,
    },
    reporter: {
      name: 'reporter',
      type: 'int',
      label: 'Reporter',
      isIndexed: true,
    },
    dueDate: {
      name: 'dueDate',
      type: 'date',
      label: 'Due Date',
    },
    tags: {
      name: 'tags',
      type: 'json',
      label: 'Tags',
    },
    createdAt: {
      name: 'createdAt',
      type: 'datetime',
      label: 'Created At',
    },
    updatedAt: {
      name: 'updatedAt',
      type: 'datetime',
      label: 'Updated At',
    },
    deletedAt: {
      name: 'deletedAt',
      type: 'datetime',
      label: 'Deleted At',
    },
  },
  hooks: {
    beforeCreate: async (data, ctx) => {
      // Auto-assign reporter if not provided
      if (!data.reporter && ctx.userId) {
        data.reporter = ctx.userId;
      }
      return data;
    },
    afterCreate: async (record, ctx) => {
      // Log ticket creation
      console.log(`Ticket created: ${record.subject} by user ${ctx.userId}`);
    },
  },
  aiMetadata: {
    description: 'A support ticket with subject, description, priority, status, and assignee',
    sensitiveFields: [],
    summarizeWith: 'Return the ticket subject, priority, status, and next action',
  },
});
