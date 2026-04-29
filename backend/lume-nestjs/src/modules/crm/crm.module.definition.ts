import { defineModule } from '@core/module/define-module';
import { defineEntity } from '@core/entity/define-entity';

// CRM entities
const ContactEntity = defineEntity('Contact', {
  label: 'Contact',
  description: 'A contact representing a person in the CRM system',
  icon: 'user',
  fields: {
    id: { name: 'id', type: 'int', label: 'ID', required: true },
    firstName: { name: 'firstName', type: 'string', label: 'First Name', required: true, isIndexed: true },
    lastName: { name: 'lastName', type: 'string', label: 'Last Name', required: true, isIndexed: true },
    email: { name: 'email', type: 'email', label: 'Email', unique: true, isIndexed: true },
    phone: { name: 'phone', type: 'phone', label: 'Phone', isIndexed: true },
    company: { name: 'company', type: 'int', label: 'Company' },
    createdAt: { name: 'createdAt', type: 'datetime', label: 'Created At' },
    updatedAt: { name: 'updatedAt', type: 'datetime', label: 'Updated At' },
    deletedAt: { name: 'deletedAt', type: 'datetime', label: 'Deleted At' },
  },
  aiMetadata: {
    description: 'A contact with first name, last name, email, and phone',
    sensitiveFields: ['email', 'phone'],
  },
});

const OpportunityEntity = defineEntity('Opportunity', {
  label: 'Opportunity',
  description: 'A sales opportunity or deal in the CRM system',
  icon: 'briefcase',
  fields: {
    id: { name: 'id', type: 'int', label: 'ID', required: true },
    name: { name: 'name', type: 'string', label: 'Name', required: true, isIndexed: true },
    stage: { name: 'stage', type: 'string', label: 'Stage', isIndexed: true, defaultValue: 'prospect' },
    amount: { name: 'amount', type: 'number', label: 'Amount' },
    probability: { name: 'probability', type: 'number', label: 'Probability', defaultValue: 0 },
    closeDate: { name: 'closeDate', type: 'date', label: 'Close Date' },
    accountId: { name: 'accountId', type: 'int', label: 'Account', isIndexed: true },
    ownerId: { name: 'ownerId', type: 'int', label: 'Owner', isIndexed: true },
    createdAt: { name: 'createdAt', type: 'datetime', label: 'Created At' },
    updatedAt: { name: 'updatedAt', type: 'datetime', label: 'Updated At' },
    deletedAt: { name: 'deletedAt', type: 'datetime', label: 'Deleted At' },
  },
  aiMetadata: {
    description: 'A sales opportunity with name, stage, amount, and close date',
    sensitiveFields: [],
  },
});

export const CRMModule = defineModule({
  name: 'crm',
  version: '1.0.0',
  description: 'CRM module with Leads, Contacts, and Opportunities',
  depends: ['base'],
  entities: [ContactEntity, OpportunityEntity],
  permissions: [
    'crm.contacts.read',
    'crm.contacts.write',
    'crm.contacts.delete',
    'crm.opportunities.read',
    'crm.opportunities.write',
    'crm.opportunities.delete',
  ],
  hooks: {
    onLoad: async () => {
      console.log('CRM module loaded');
    },
  },
});
