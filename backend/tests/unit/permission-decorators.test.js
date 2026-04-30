/**
 * @fileoverview Unit tests for NestJS permission decorators
 */

import { describe, it, expect } from '@jest/globals';
import { CheckPermission, RequirePermission, SkipPermissionCheck } from '../../src/core/permissions/decorators.js';

/**
 * Helper to get metadata from function
 * Works with both Reflect.getMetadata and fallback __metadata__ property
 */
function getMetadata(key, func) {
  // Try Reflect.getMetadata if available
  if (typeof Reflect !== 'undefined' && Reflect.getMetadata) {
    return Reflect.getMetadata(key, func);
  }
  // Fallback to __metadata__ property
  if (func.__metadata__ && func.__metadata__.has(key)) {
    return func.__metadata__.get(key);
  }
  return undefined;
}

describe('Permission Decorators', () => {
  describe('CheckPermission', () => {
    it('should attach permission metadata to method', () => {
      function getUser() {
        return { id: 1, name: 'Test' };
      }

      CheckPermission('user:read')(null, 'getUser', { value: getUser });

      const metadata = getMetadata('permission:check', getUser);
      expect(metadata).toBe('user:read');
    });

    it('should attach different permissions to different methods', () => {
      function getUser() {
        return { id: 1, name: 'Test' };
      }

      function updateUser() {
        return { success: true };
      }

      CheckPermission('user:read')(null, 'getUser', { value: getUser });
      CheckPermission('user:write')(null, 'updateUser', { value: updateUser });

      const readMetadata = getMetadata('permission:check', getUser);
      const writeMetadata = getMetadata('permission:check', updateUser);

      expect(readMetadata).toBe('user:read');
      expect(writeMetadata).toBe('user:write');
    });
  });

  describe('RequirePermission', () => {
    it('should attach resource and action metadata to method', () => {
      function getTicket() {
        return { id: 1, title: 'Test Ticket' };
      }

      RequirePermission('ticket', 'read')(null, 'getTicket', { value: getTicket });

      const metadata = getMetadata('permission:require', getTicket);

      expect(metadata).toBeDefined();
      expect(metadata.resource).toBe('ticket');
      expect(metadata.action).toBe('read');
    });

    it('should attach different resource/action pairs to different methods', () => {
      function getTicket() {
        return { id: 1 };
      }

      function updateTicket() {
        return { success: true };
      }

      function deleteComment() {
        return { success: true };
      }

      RequirePermission('ticket', 'read')(null, 'getTicket', { value: getTicket });
      RequirePermission('ticket', 'write')(null, 'updateTicket', { value: updateTicket });
      RequirePermission('comment', 'delete')(null, 'deleteComment', { value: deleteComment });

      const readMeta = getMetadata('permission:require', getTicket);
      const writeMeta = getMetadata('permission:require', updateTicket);
      const deleteMeta = getMetadata('permission:require', deleteComment);

      expect(readMeta).toEqual({ resource: 'ticket', action: 'read' });
      expect(writeMeta).toEqual({ resource: 'ticket', action: 'write' });
      expect(deleteMeta).toEqual({ resource: 'comment', action: 'delete' });
    });
  });

  describe('SkipPermissionCheck', () => {
    it('should attach skip metadata to method', () => {
      function publicEndpoint() {
        return { message: 'public' };
      }

      SkipPermissionCheck()(null, 'publicEndpoint', { value: publicEndpoint });

      const metadata = getMetadata('permission:skip', publicEndpoint);

      expect(metadata).toBe(true);
    });

    it('should only skip for decorated methods', () => {
      function publicEndpoint() {
        return { message: 'public' };
      }

      function protectedEndpoint() {
        return { message: 'protected' };
      }

      SkipPermissionCheck()(null, 'publicEndpoint', { value: publicEndpoint });

      const publicMeta = getMetadata('permission:skip', publicEndpoint);
      const protectedMeta = getMetadata('permission:skip', protectedEndpoint);

      expect(publicMeta).toBe(true);
      expect(protectedMeta).toBeUndefined();
    });
  });

  describe('Decorator combinations', () => {
    it('should support multiple decorators on same method', () => {
      function updateTicket() {
        return { success: true };
      }

      CheckPermission('ticket:write')(null, 'updateTicket', { value: updateTicket });
      RequirePermission('ticket', 'update')(null, 'updateTicket', { value: updateTicket });

      const checkMeta = getMetadata('permission:check', updateTicket);
      const requireMeta = getMetadata('permission:require', updateTicket);

      expect(checkMeta).toBe('ticket:write');
      expect(requireMeta).toEqual({ resource: 'ticket', action: 'update' });
    });

    it('should allow SkipPermissionCheck with other decorators', () => {
      function adminEndpoint() {
        return { message: 'admin only' };
      }

      CheckPermission('admin:bypass')(null, 'adminEndpoint', { value: adminEndpoint });
      SkipPermissionCheck()(null, 'adminEndpoint', { value: adminEndpoint });

      const checkMeta = getMetadata('permission:check', adminEndpoint);
      const skipMeta = getMetadata('permission:skip', adminEndpoint);

      expect(checkMeta).toBe('admin:bypass');
      expect(skipMeta).toBe(true);
    });
  });
});
