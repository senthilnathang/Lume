import { defineEntity } from '@core/entity/define-entity';

export const LeadEntity = defineEntity('Lead', {
  label: 'Lead',
  description: 'A sales lead representing a potential customer interested in products or services',
  icon: 'users',
  fields: {
    id: {
      name: 'id',
      type: 'int',
      label: 'ID',
      required: true,
    },
    name: {
      name: 'name',
      type: 'string',
      label: 'Name',
      required: true,
      isIndexed: true,
    },
    email: {
      name: 'email',
      type: 'email',
      label: 'Email',
      required: true,
      unique: true,
      isIndexed: true,
    },
    phone: {
      name: 'phone',
      type: 'phone',
      label: 'Phone',
      isIndexed: true,
    },
    company: {
      name: 'company',
      type: 'string',
      label: 'Company',
      isIndexed: true,
    },
    status: {
      name: 'status',
      type: 'string',
      label: 'Status',
      required: true,
      isIndexed: true,
      defaultValue: 'new',
    },
    source: {
      name: 'source',
      type: 'string',
      label: 'Source',
      isIndexed: true,
    },
    score: {
      name: 'score',
      type: 'number',
      label: 'Lead Score',
      defaultValue: 0,
    },
    notes: {
      name: 'notes',
      type: 'text',
      label: 'Notes',
    },
    owner: {
      name: 'owner',
      type: 'int',
      label: 'Owner',
      isIndexed: true,
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
      // Auto-assign owner if not provided
      if (!data.owner && ctx.userId) {
        data.owner = ctx.userId;
      }
      return data;
    },
    afterCreate: async (record, ctx) => {
      // Log lead creation
      console.log(`Lead created: ${record.name} by user ${ctx.userId}`);
    },
    beforeUpdate: async (id, data, ctx) => {
      // Track status changes
      if (data.status) {
        console.log(`Lead ${id} status changing to: ${data.status}`);
      }
      return data;
    },
    afterUpdate: async (record, ctx) => {
      // Log lead update
      console.log(`Lead updated: ${record.name}`);
    },
  },
  aiMetadata: {
    description: 'A sales lead with name, email, phone, company, status, and lead score',
    sensitiveFields: ['email', 'phone'],
    summarizeWith: 'Return the lead name, status, company, and owner',
  },
});
