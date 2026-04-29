import { defineWorkflow } from '@core/workflow/define-workflow';

export const LeadAssignmentWorkflow = defineWorkflow({
  name: 'lead-assignment',
  version: '1.0.0',
  entity: 'Lead',
  trigger: {
    type: 'record.created',
  },
  steps: [
    // Check if lead status is 'new'
    {
      type: 'condition',
      if: { field: 'status', operator: '==', value: 'new' },
      then: [
        // Set status to 'assigned' if condition is true
        {
          type: 'set_field',
          field: 'status',
          value: 'assigned',
        },
        // Send notification to admin
        {
          type: 'send_notification',
          to: 'admin',
          template: 'new_lead_assigned',
        },
      ],
      else: [
        // Log that lead is already assigned
        {
          type: 'custom',
          handler: 'log_existing_lead',
        },
      ],
    },
  ],
  onError: 'continue',
  maxRetries: 2,
});

export const LeadScoringSendNotification = defineWorkflow({
  name: 'lead-scoring-notification',
  version: '1.0.0',
  entity: 'Lead',
  trigger: {
    type: 'field_changed',
    field: 'score',
  },
  steps: [
    // Check if score is high (>80)
    {
      type: 'condition',
      if: { field: 'score', operator: '>', value: 80 },
      then: [
        {
          type: 'send_notification',
          to: 'sales_team',
          template: 'high_score_lead',
        },
      ],
    },
    // Add delay
    {
      type: 'delay',
      duration: 5,
      unit: 'seconds',
    },
  ],
  onError: 'stop',
});
