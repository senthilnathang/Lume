import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { DocumentService } from '../../src/modules/documents/services/document.service.js';
import { DocumentVersioningService } from '../../src/modules/documents/services/document-versioning.js';

describe('Document Management & Versioning', () => {
  let documentService;
  let versioningService;
  let mockModels;

  beforeEach(() => {
    mockModels = {
      Document: {
        create: jest.fn(),
        findById: jest.fn(),
        update: jest.fn(),
        findAll: jest.fn(),
      },
      DocumentVersion: {
        create: jest.fn(),
        findById: jest.fn(),
        findAll: jest.fn(),
      },
      DocumentAccess: {
        create: jest.fn(),
      },
    };
    documentService = new DocumentService(mockModels);
    versioningService = new DocumentVersioningService(mockModels);
  });

  describe('createDocument', () => {
    it('should create a new document with initial version', async () => {
      const doc = {
        id: 1,
        title: 'Policy Document',
        content: '## Policies',
        status: 'draft',
        currentVersionId: 1,
      };

      mockModels.DocumentVersion.create.mockResolvedValue({
        id: 1,
        versionNumber: 1,
        content: '## Policies',
        changesSummary: 'Initial version',
      });

      mockModels.Document.create.mockResolvedValue(doc);

      const result = await documentService.createDocument('Policy Document', '## Policies', 'user123');

      expect(result.id).toBe(1);
      expect(result.status).toBe('draft');
      expect(mockModels.DocumentVersion.create).toHaveBeenCalled();
      expect(mockModels.Document.create).toHaveBeenCalled();
    });
  });

  describe('createVersion', () => {
    it('should create version when document is updated', async () => {
      const version = {
        id: 2,
        documentId: 1,
        content: 'Updated content',
        versionNumber: 2,
        createdBy: 'user123',
        changesSummary: 'Updated section 2',
      };

      mockModels.DocumentVersion.findAll.mockResolvedValue({
        rows: [
          {
            id: 1,
            documentId: 1,
            versionNumber: 1,
            content: 'Original content',
          },
        ],
      });

      mockModels.DocumentVersion.create.mockResolvedValue(version);
      mockModels.Document.update.mockResolvedValue({ id: 1, content: 'Updated content' });

      const result = await documentService.createVersion(
        1,
        'Updated content',
        'user123',
        'Updated section 2'
      );

      expect(result.versionNumber).toBe(2);
      expect(mockModels.DocumentVersion.create).toHaveBeenCalled();
      expect(mockModels.Document.update).toHaveBeenCalled();
    });
  });

  describe('getVersionHistory', () => {
    it('should retrieve version history', async () => {
      const versions = [
        { id: 1, documentId: 1, versionNumber: 1, createdAt: new Date('2026-05-01') },
        { id: 2, documentId: 1, versionNumber: 2, createdAt: new Date('2026-05-02') },
      ];

      mockModels.DocumentVersion.findAll.mockResolvedValue({ rows: versions });

      const result = await documentService.getVersionHistory(1);

      expect(result).toHaveLength(2);
      expect(result[0].versionNumber).toBe(2); // Sorted descending
      expect(result[1].versionNumber).toBe(1);
    });
  });

  describe('grantAccess', () => {
    it('should grant document access to users or roles', async () => {
      mockModels.DocumentAccess.create.mockResolvedValue({
        id: 1,
        documentId: 1,
        grantedToRole: 'viewer_role',
        grantedToType: 'ROLE',
        permission: 'view',
      });

      const result = await documentService.grantAccess(1, 'viewer_role', 'ROLE', 'view');

      expect(result.permission).toBe('view');
      expect(mockModels.DocumentAccess.create).toHaveBeenCalledWith({
        documentId: 1,
        grantedToRole: 'viewer_role',
        permission: 'view',
      });
    });

    it('should grant access to individual users', async () => {
      mockModels.DocumentAccess.create.mockResolvedValue({
        id: 2,
        documentId: 1,
        grantedToUserId: 'user123',
        grantedToType: 'USER',
        permission: 'edit',
      });

      const result = await documentService.grantAccess(1, 'user123', 'USER', 'edit');

      expect(result.permission).toBe('edit');
      expect(mockModels.DocumentAccess.create).toHaveBeenCalledWith({
        documentId: 1,
        grantedToUserId: 'user123',
        permission: 'edit',
      });
    });
  });

  describe('submitForApproval', () => {
    it('should submit document for approval', async () => {
      mockModels.Document.update.mockResolvedValue({
        id: 1,
        status: 'pending_approval',
        approvalChainId: 5,
      });

      const result = await documentService.submitForApproval(1, 5);

      expect(result.status).toBe('pending_approval');
      expect(mockModels.Document.update).toHaveBeenCalledWith(1, {
        status: 'pending_approval',
        approvalChainId: 5,
      });
    });
  });

  describe('publishDocument', () => {
    it('should publish a document', async () => {
      const now = new Date();
      mockModels.Document.update.mockResolvedValue({
        id: 1,
        status: 'published',
        publishedAt: now,
      });

      const result = await documentService.publishDocument(1, 'user123');

      expect(result.status).toBe('published');
      expect(mockModels.Document.update).toHaveBeenCalled();
    });
  });

  describe('compareVersions', () => {
    it('should compare two versions and show differences', async () => {
      const version1 = {
        id: 1,
        content: 'Line 1\nLine 2\nLine 3',
      };

      const version2 = {
        id: 2,
        content: 'Line 1\nLine 2 Modified\nLine 3',
      };

      mockModels.DocumentVersion.findById.mockImplementation((id) => {
        if (id === 1) return Promise.resolve(version1);
        if (id === 2) return Promise.resolve(version2);
      });

      const result = await versioningService.compareVersions(1, 2);

      expect(result.versionId1).toBe(1);
      expect(result.versionId2).toBe(2);
      expect(result.changes).toBeDefined();
      expect(Array.isArray(result.changes)).toBe(true);
      expect(result.changes.length).toBeGreaterThan(0);
    });
  });

  describe('rollbackToVersion', () => {
    it('should rollback to a previous version', async () => {
      const targetVersion = {
        id: 1,
        documentId: 1,
        versionNumber: 1,
        content: 'Original content',
      };

      mockModels.DocumentVersion.findAll.mockResolvedValue({
        rows: [targetVersion],
      });

      mockModels.DocumentVersion.create.mockResolvedValue({
        id: 3,
        documentId: 1,
        versionNumber: 2,
        content: 'Original content',
        changesSummary: 'Rolled back from version 1',
      });

      const result = await versioningService.rollbackToVersion(1, 1, 'user123');

      expect(result.versionNumber).toBe(2);
      expect(result.content).toBe('Original content');
      expect(result.changesSummary).toContain('Rolled back');
    });
  });
});
