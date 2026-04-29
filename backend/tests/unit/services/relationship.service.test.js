import { jest } from '@jest/globals';
import { RelationshipService } from '../../../src/core/services/relationship.service.js';

describe('RelationshipService', () => {
  let service;
  let mockAdapter;
  let mockRelationshipAdapter;

  beforeEach(() => {
    // Mock the adapters
    mockAdapter = {
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      destroy: jest.fn(),
    };

    mockRelationshipAdapter = {
      findById: jest.fn(),
    };

    service = new RelationshipService(mockAdapter, mockRelationshipAdapter);
  });

  describe('linkRecords', () => {
    it('should create a link between two different records', async () => {
      const relationshipId = 1;
      const sourceRecordId = 100;
      const targetRecordId = 200;

      // Mock relationship exists
      mockRelationshipAdapter.findById.mockResolvedValueOnce({
        id: relationshipId,
        name: 'test_relationship',
      });

      // Mock create
      const createdLink = {
        id: 1,
        relationshipId,
        sourceRecordId,
        targetRecordId,
      };
      mockAdapter.create.mockResolvedValueOnce(createdLink);

      const result = await service.linkRecords(relationshipId, sourceRecordId, targetRecordId);

      expect(mockRelationshipAdapter.findById).toHaveBeenCalledWith(relationshipId);
      expect(mockAdapter.create).toHaveBeenCalledWith({
        relationshipId,
        sourceRecordId,
        targetRecordId,
      });
      expect(result).toEqual(createdLink);
    });

    it('should throw circular relationship error when sourceRecordId === targetRecordId', async () => {
      const relationshipId = 1;
      const recordId = 100;

      await expect(
        service.linkRecords(relationshipId, recordId, recordId)
      ).rejects.toThrow('circular relationship');

      // Should not call create for circular relationships
      expect(mockAdapter.create).not.toHaveBeenCalled();
    });

    it('should throw Relationship not found error when relationship does not exist', async () => {
      const relationshipId = 999;
      const sourceRecordId = 100;
      const targetRecordId = 200;

      // Mock relationship not found
      mockRelationshipAdapter.findById.mockResolvedValueOnce(null);

      await expect(
        service.linkRecords(relationshipId, sourceRecordId, targetRecordId)
      ).rejects.toThrow('Relationship not found');

      // Should not call create
      expect(mockAdapter.create).not.toHaveBeenCalled();
    });
  });

  describe('unlinkRecords', () => {
    it('should delete a link between two records', async () => {
      const relationshipId = 1;
      const sourceRecordId = 100;
      const targetRecordId = 200;
      const linkId = 1;

      const linkData = {
        id: linkId,
        relationshipId,
        sourceRecordId,
        targetRecordId,
      };

      // Mock findAll for both calls (count check + find for delete)
      mockAdapter.findAll
        .mockResolvedValueOnce({
          rows: [linkData],
          count: 1,
        })
        .mockResolvedValueOnce({
          rows: [linkData],
          count: 1,
        });

      // Mock destroy
      mockAdapter.destroy.mockResolvedValueOnce(true);

      const result = await service.unlinkRecords(relationshipId, sourceRecordId, targetRecordId);

      expect(result).toEqual({ count: 1 });
      expect(mockAdapter.destroy).toHaveBeenCalledWith(linkId);
    });

    it('should return count 0 when no link is found', async () => {
      const relationshipId = 1;
      const sourceRecordId = 100;
      const targetRecordId = 200;

      // Mock findAll to return no results
      mockAdapter.findAll.mockResolvedValueOnce({
        rows: [],
        count: 0,
      });

      const result = await service.unlinkRecords(relationshipId, sourceRecordId, targetRecordId);

      expect(result).toEqual({ count: 0 });
      expect(mockAdapter.destroy).not.toHaveBeenCalled();
    });
  });

  describe('getLinkedRecords', () => {
    it('should return array of targetRecordIds for a source record', async () => {
      const relationshipId = 1;
      const sourceRecordId = 100;
      const targetIds = [200, 201, 202];

      // Mock findAll
      mockAdapter.findAll.mockResolvedValueOnce({
        rows: targetIds.map((targetRecordId, idx) => ({
          id: idx + 1,
          relationshipId,
          sourceRecordId,
          targetRecordId,
        })),
        count: 3,
      });

      const result = await service.getLinkedRecords(relationshipId, sourceRecordId);

      expect(result).toEqual(targetIds);
      expect(mockAdapter.findAll).toHaveBeenCalledWith({
        where: [
          ['relationshipId', '=', relationshipId],
          ['sourceRecordId', '=', sourceRecordId],
        ],
        limit: 10000,
        offset: 0,
      });
    });

    it('should return empty array when no links exist', async () => {
      const relationshipId = 1;
      const sourceRecordId = 100;

      // Mock findAll to return empty
      mockAdapter.findAll.mockResolvedValueOnce({
        rows: [],
        count: 0,
      });

      const result = await service.getLinkedRecords(relationshipId, sourceRecordId);

      expect(result).toEqual([]);
    });
  });

  describe('getReverseLinks', () => {
    it('should return array of sourceRecordIds linking to a target', async () => {
      const relationshipId = 1;
      const targetRecordId = 200;
      const sourceIds = [100, 101, 102];

      // Mock findAll
      mockAdapter.findAll.mockResolvedValueOnce({
        rows: sourceIds.map((sourceRecordId, idx) => ({
          id: idx + 1,
          relationshipId,
          sourceRecordId,
          targetRecordId,
        })),
        count: 3,
      });

      const result = await service.getReverseLinks(relationshipId, targetRecordId);

      expect(result).toEqual(sourceIds);
      expect(mockAdapter.findAll).toHaveBeenCalledWith({
        where: [
          ['relationshipId', '=', relationshipId],
          ['targetRecordId', '=', targetRecordId],
        ],
        limit: 10000,
        offset: 0,
      });
    });

    it('should return empty array when no reverse links exist', async () => {
      const relationshipId = 1;
      const targetRecordId = 200;

      // Mock findAll to return empty
      mockAdapter.findAll.mockResolvedValueOnce({
        rows: [],
        count: 0,
      });

      const result = await service.getReverseLinks(relationshipId, targetRecordId);

      expect(result).toEqual([]);
    });
  });

  describe('resolveRelationships', () => {
    it('should populate linkedIds for records based on relationships', async () => {
      const relationshipId = 1;
      const records = [
        { id: 100, name: 'Record 100' },
        { id: 101, name: 'Record 101' },
      ];

      // Mock findAll to return links
      mockAdapter.findAll.mockResolvedValueOnce({
        rows: [
          { id: 1, relationshipId, sourceRecordId: 100, targetRecordId: 200 },
          { id: 2, relationshipId, sourceRecordId: 100, targetRecordId: 201 },
          { id: 3, relationshipId, sourceRecordId: 101, targetRecordId: 300 },
        ],
        count: 3,
      });

      const result = await service.resolveRelationships(records, relationshipId);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 100,
        name: 'Record 100',
        linkedIds: [200, 201],
      });
      expect(result[1]).toEqual({
        id: 101,
        name: 'Record 101',
        linkedIds: [300],
      });
    });

    it('should add empty linkedIds array for records with no links', async () => {
      const relationshipId = 1;
      const records = [
        { id: 100, name: 'Record 100' },
        { id: 101, name: 'Record 101' },
      ];

      // Mock findAll to return no links
      mockAdapter.findAll.mockResolvedValueOnce({
        rows: [],
        count: 0,
      });

      const result = await service.resolveRelationships(records, relationshipId);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 100,
        name: 'Record 100',
        linkedIds: [],
      });
      expect(result[1]).toEqual({
        id: 101,
        name: 'Record 101',
        linkedIds: [],
      });
    });

    it('should return empty array when input is empty', async () => {
      const relationshipId = 1;
      const records = [];

      const result = await service.resolveRelationships(records, relationshipId);

      expect(result).toEqual([]);
      expect(mockAdapter.findAll).not.toHaveBeenCalled();
    });

    it('should ignore linkedEntity parameter for compatibility', async () => {
      const relationshipId = 1;
      const linkedEntity = { id: 200, name: 'Linked Entity' };
      const records = [{ id: 100, name: 'Record 100' }];

      mockAdapter.findAll.mockResolvedValueOnce({
        rows: [],
        count: 0,
      });

      const result = await service.resolveRelationships(records, relationshipId, linkedEntity);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 100,
        name: 'Record 100',
        linkedIds: [],
      });
    });
  });

  describe('Error cases', () => {
    it('should throw Relationship not found with proper error code', async () => {
      const relationshipId = 999;
      const sourceRecordId = 100;
      const targetRecordId = 200;

      mockRelationshipAdapter.findById.mockResolvedValueOnce(null);

      try {
        await service.linkRecords(relationshipId, sourceRecordId, targetRecordId);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toBe('Relationship not found');
        expect(error.code).toBe('RELATIONSHIP_NOT_FOUND');
      }
    });

    it('should throw circular relationship error with proper error code', async () => {
      const relationshipId = 1;
      const recordId = 100;

      try {
        await service.linkRecords(relationshipId, recordId, recordId);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toBe('circular relationship');
        expect(error.code).toBe('CIRCULAR_RELATIONSHIP');
      }
    });
  });
});
