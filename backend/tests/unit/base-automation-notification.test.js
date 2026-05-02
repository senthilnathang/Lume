/**
 * Base Automation Notification Service Tests
 * Test suite for enhanced notification system with templates, scheduling, and delivery tracking
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { EnhancedNotificationService } from '../../src/modules/base_automation/services/notification-enhanced.js';
import { NotificationSchedulerJob } from '../../src/modules/base_automation/jobs/notification-scheduler.js';

describe('EnhancedNotificationService', () => {
  let service;
  let mockModels;

  beforeEach(() => {
    // Mock adapter methods
    mockModels = {
      NotificationTemplate: {
        findById: jest.fn(),
        findAll: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        find: jest.fn()
      },
      NotificationDelivery: {
        findById: jest.fn(),
        findAll: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        find: jest.fn()
      }
    };

    service = new EnhancedNotificationService(mockModels);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendFromTemplate', () => {
    it('should send notification using template with variable substitution', async () => {
      const templateId = 1;
      const recipient = 'user@example.com';
      const variables = { approval_id: '123', approver_name: 'John Doe' };

      const template = {
        id: templateId,
        name: 'Approval Notification',
        channel: 'email',
        subject: 'Approval Request for {{approval_id}}',
        body: 'Please review the approval for {{approval_id}}. Assigned to {{approver_name}}.',
        variables: { approval_id: '', approver_name: '' },
        enabled: true
      };

      mockModels.NotificationTemplate.findById.mockResolvedValue(template);
      mockModels.NotificationDelivery.create.mockResolvedValue({
        id: 1,
        notificationId: templateId,
        channel: 'email',
        recipient,
        status: 'pending'
      });

      jest.spyOn(service, '_sendByChannel').mockResolvedValue({ success: true });
      jest.spyOn(service, '_substituteVariables').mockReturnValue('Substituted text');

      const result = await service.sendFromTemplate(templateId, recipient, variables);

      expect(mockModels.NotificationTemplate.findById).toHaveBeenCalledWith(templateId);
      expect(result.success).toBe(true);
      expect(result.deliveryId).toBeDefined();
    });

    it('should throw error when template not found', async () => {
      mockModels.NotificationTemplate.findById.mockResolvedValue(null);

      await expect(service.sendFromTemplate(999, 'user@example.com', {}))
        .rejects
        .toThrow('Notification template not found');
    });

    it('should throw error when template is disabled', async () => {
      const template = {
        id: 1,
        enabled: false,
        name: 'Test'
      };

      mockModels.NotificationTemplate.findById.mockResolvedValue(template);

      await expect(service.sendFromTemplate(1, 'user@example.com', {}))
        .rejects
        .toThrow('Notification template is disabled');
    });

    it('should skip sending if channel is not supported', async () => {
      const template = {
        id: 1,
        channel: 'unsupported_channel',
        enabled: true
      };

      mockModels.NotificationTemplate.findById.mockResolvedValue(template);

      await expect(service.sendFromTemplate(1, 'user@example.com', {}))
        .rejects
        .toThrow('Unsupported notification channel');
    });
  });

  describe('createDeliveryRecord', () => {
    it('should create delivery tracking record', async () => {
      const template = {
        id: 1,
        name: 'Test Template',
        channel: 'email'
      };
      const recipient = 'test@example.com';
      const status = 'pending';

      mockModels.NotificationDelivery.create.mockResolvedValue({
        id: 1,
        notificationId: 1,
        channel: 'email',
        recipient,
        status
      });

      const result = await service.createDeliveryRecord(template, recipient, status);

      expect(mockModels.NotificationDelivery.create).toHaveBeenCalledWith(
        expect.objectContaining({
          notificationId: template.id,
          channel: template.channel,
          recipient,
          status
        })
      );
      expect(result.id).toBeDefined();
    });

    it('should update delivery record with sent timestamp on success', async () => {
      const delivery = { id: 1, status: 'pending' };
      mockModels.NotificationDelivery.update.mockResolvedValue({
        ...delivery,
        status: 'sent',
        sentAt: expect.any(Date)
      });

      const result = await service.updateDeliveryStatus(1, 'sent');

      expect(mockModels.NotificationDelivery.update).toHaveBeenCalledWith(1, {
        status: 'sent',
        sentAt: expect.any(Date)
      });
    });

    it('should update delivery record with failure reason on failure', async () => {
      const failureReason = 'SMTP connection failed';
      mockModels.NotificationDelivery.update.mockResolvedValue({
        id: 1,
        status: 'failed',
        failureReason
      });

      const result = await service.updateDeliveryStatus(1, 'failed', failureReason);

      expect(mockModels.NotificationDelivery.update).toHaveBeenCalledWith(1, {
        status: 'failed',
        failureReason
      });
    });
  });

  describe('getDeliveryHistory', () => {
    it('should retrieve delivery history with filters', async () => {
      const filters = { notificationId: 1, status: 'sent' };
      const deliveries = [
        { id: 1, notificationId: 1, status: 'sent', recipient: 'user@example.com' },
        { id: 2, notificationId: 1, status: 'sent', recipient: 'admin@example.com' }
      ];

      mockModels.NotificationDelivery.findAll.mockResolvedValue({
        rows: deliveries,
        count: 2
      });

      const result = await service.getDeliveryHistory(filters);

      expect(mockModels.NotificationDelivery.findAll).toHaveBeenCalled();
      expect(result.rows).toHaveLength(2);
      expect(result.count).toBe(2);
    });

    it('should return empty result when no deliveries found', async () => {
      mockModels.NotificationDelivery.findAll.mockResolvedValue({
        rows: [],
        count: 0
      });

      const result = await service.getDeliveryHistory({ notificationId: 999 });

      expect(result.rows).toHaveLength(0);
      expect(result.count).toBe(0);
    });
  });

  describe('_substituteVariables', () => {
    it('should replace template variables with actual values', () => {
      const text = 'Hello {{approver_name}}, please review approval {{approval_id}}';
      const variables = { approver_name: 'John Doe', approval_id: '123' };

      const result = service._substituteVariables(text, variables);

      expect(result).toBe('Hello John Doe, please review approval 123');
    });

    it('should handle missing variables gracefully', () => {
      const text = 'Hello {{approver_name}}, approval {{approval_id}} waiting for {{unknown_var}}';
      const variables = { approver_name: 'John Doe', approval_id: '123' };

      const result = service._substituteVariables(text, variables);

      // Should leave unknown variables as-is
      expect(result).toContain('John Doe');
      expect(result).toContain('123');
    });

    it('should handle empty variable object', () => {
      const text = 'No variables here';
      const result = service._substituteVariables(text, {});

      expect(result).toBe('No variables here');
    });
  });

  describe('_sendByChannel', () => {
    it('should send email notification', async () => {
      jest.spyOn(service, '_sendEmail').mockResolvedValue({ success: true });

      const result = await service._sendByChannel('email', 'user@example.com', 'Test Subject', 'Test Body', 1);

      expect(service._sendEmail).toHaveBeenCalledWith('user@example.com', 'Test Subject', 'Test Body');
      expect(result.success).toBe(true);
    });

    it('should send Slack notification', async () => {
      jest.spyOn(service, '_sendSlack').mockResolvedValue({ success: true });

      const result = await service._sendByChannel('slack', 'user123', 'Test Subject', 'Test Body', 1);

      expect(service._sendSlack).toHaveBeenCalledWith('user123', 'Test Body');
      expect(result.success).toBe(true);
    });

    it('should send SMS notification', async () => {
      jest.spyOn(service, '_sendSMS').mockResolvedValue({ success: true });

      const result = await service._sendByChannel('sms', '+1234567890', 'Test Subject', 'Test Body', 1);

      expect(service._sendSMS).toHaveBeenCalledWith('+1234567890', 'Test Body');
      expect(result.success).toBe(true);
    });

    it('should send in-app notification', async () => {
      jest.spyOn(service, '_sendInApp').mockResolvedValue({ success: true });

      const result = await service._sendByChannel('in_app', 'user123', 'Test Subject', 'Test Body', 1);

      expect(service._sendInApp).toHaveBeenCalledWith('user123', 'Test Subject', 'Test Body');
      expect(result.success).toBe(true);
    });

    it('should throw error for unsupported channel', async () => {
      await expect(service._sendByChannel('invalid_channel', 'recipient', 'subject', 'body', 1))
        .rejects
        .toThrow('Unsupported notification channel');
    });
  });

  describe('createTemplate', () => {
    it('should create a new notification template', async () => {
      const templateData = {
        name: 'Approval Request',
        channel: 'email',
        subject: 'New Approval: {{approval_id}}',
        body: 'Please review {{approval_id}}',
        variables: { approval_id: '', approval_type: '' },
        enabled: true
      };

      mockModels.NotificationTemplate.create.mockResolvedValue({
        id: 1,
        ...templateData,
        metadata: {}
      });

      const result = await service.createTemplate(templateData);

      expect(mockModels.NotificationTemplate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Approval Request',
          channel: 'email',
          subject: 'New Approval: {{approval_id}}',
          body: 'Please review {{approval_id}}'
        })
      );
      expect(result.id).toBeDefined();
      expect(result.name).toBe('Approval Request');
    });
  });

  describe('updateTemplate', () => {
    it('should update notification template', async () => {
      const updates = { name: 'Updated Name', enabled: false };

      // Mock findById to return an existing template
      mockModels.NotificationTemplate.findById.mockResolvedValue({
        id: 1,
        name: 'Old Name',
        channel: 'email'
      });

      mockModels.NotificationTemplate.update.mockResolvedValue({
        id: 1,
        ...updates
      });

      const result = await service.updateTemplate(1, updates);

      expect(mockModels.NotificationTemplate.update).toHaveBeenCalledWith(1, updates);
    });
  });

  describe('listTemplates', () => {
    it('should retrieve all templates', async () => {
      const templates = [
        { id: 1, name: 'Template 1', channel: 'email' },
        { id: 2, name: 'Template 2', channel: 'slack' }
      ];

      mockModels.NotificationTemplate.findAll.mockResolvedValue({
        rows: templates,
        count: 2
      });

      const result = await service.listTemplates();

      expect(mockModels.NotificationTemplate.findAll).toHaveBeenCalled();
      expect(result.rows).toHaveLength(2);
    });
  });
});

describe('NotificationSchedulerJob', () => {
  let job;
  let mockNotificationService;

  beforeEach(() => {
    mockNotificationService = {
      sendFromTemplate: jest.fn()
    };

    job = new NotificationSchedulerJob(mockNotificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('process', () => {
    it('should send scheduled notifications', async () => {
      const jobData = {
        templateId: 1,
        recipient: 'user@example.com',
        variables: { approval_id: '123' }
      };

      mockNotificationService.sendFromTemplate.mockResolvedValue({
        success: true,
        deliveryId: 1
      });

      const result = await job.process({ data: jobData });

      expect(mockNotificationService.sendFromTemplate).toHaveBeenCalledWith(
        jobData.templateId,
        jobData.recipient,
        jobData.variables
      );
      expect(result.success).toBe(true);
    });

    it('should handle missing required fields', async () => {
      const jobData = { recipient: 'user@example.com' };

      await expect(job.process({ data: jobData }))
        .rejects
        .toThrow('Missing required fields');
    });

    it('should implement retry logic on failure', async () => {
      const jobData = {
        templateId: 1,
        recipient: 'user@example.com',
        variables: {}
      };

      mockNotificationService.sendFromTemplate
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce({ success: true, deliveryId: 1 });

      // First call fails
      await expect(job.process({ data: jobData }))
        .rejects
        .toThrow('Temporary failure');

      // Second call succeeds (retry)
      const result = await job.process({ data: jobData });
      expect(result.success).toBe(true);
    });

    it('should include retry count in result', async () => {
      const jobData = {
        templateId: 1,
        recipient: 'user@example.com',
        variables: {}
      };

      mockNotificationService.sendFromTemplate.mockResolvedValue({
        success: true,
        deliveryId: 1
      });

      const result = await job.process({ data: jobData, attemptsMade: 2 });

      expect(result.attempts).toBe(3); // attemptsMade (2) + 1
    });
  });

  describe('startProcessor', () => {
    it('should start automatic scheduled notification processing', async () => {
      const spy = jest.spyOn(job, 'process').mockResolvedValue({ success: true });

      job.startProcessor(5);

      // Verify processor is running (just check interval is set)
      expect(job.processingInterval).toBeDefined();

      job.stopProcessor();
      spy.mockRestore();
    });
  });

  describe('stopProcessor', () => {
    it('should stop automatic processing', async () => {
      job.startProcessor(5);
      expect(job.processingInterval).toBeDefined();

      job.stopProcessor();
      expect(job.processingInterval).toBeNull();
    });
  });
});
