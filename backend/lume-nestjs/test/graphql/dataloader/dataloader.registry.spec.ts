import { DataLoaderRegistry } from '../../../src/graphql/dataloader/dataloader.registry';
import { PrismaService } from '../../../src/core/services/prisma.service';
import { DrizzleService } from '../../../src/core/services/drizzle.service';

describe('DataLoaderRegistry', () => {
  let registry: DataLoaderRegistry;
  let mockPrisma: any;
  let mockDrizzle: any;

  beforeEach(() => {
    // Mock Prisma service
    mockPrisma = {
      user: {
        findMany: jest.fn(),
      },
      role: {
        findMany: jest.fn(),
      },
      entity: {
        findMany: jest.fn(),
      },
      entityField: {
        findMany: jest.fn(),
      },
    };

    // Mock Drizzle service
    mockDrizzle = {
      getDrizzle: jest.fn().mockReturnValue({}),
    };

    registry = new DataLoaderRegistry(
      mockPrisma as any,
      mockDrizzle as any,
      1,
    );
  });

  describe('userById', () => {
    it('should batch multiple user loads into a single database query', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 1, email: 'user1@test.com', name: 'User 1' },
        { id: 2, email: 'user2@test.com', name: 'User 2' },
        { id: 3, email: 'user3@test.com', name: 'User 3' },
      ]);

      // Load users in separate calls - should be batched
      const [user1, user2, user3] = await Promise.all([
        registry.userById.load(1),
        registry.userById.load(2),
        registry.userById.load(3),
      ]);

      // Should only call findMany once (batched)
      expect(mockPrisma.user.findMany).toHaveBeenCalledTimes(1);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: { id: { in: [1, 2, 3] } },
      });

      // Should return correct users
      expect(user1.id).toBe(1);
      expect(user2.id).toBe(2);
      expect(user3.id).toBe(3);
    });

    it('should return error for missing user', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 1, email: 'user1@test.com' },
      ]);

      const user1 = await registry.userById.load(1);
      const user2Result = await registry.userById.load(2).catch(e => e);

      expect(user1.id).toBe(1);
      expect(user2Result).toBeInstanceOf(Error);
      expect(user2Result.message).toContain('User 2 not found');
    });
  });

  describe('roleById', () => {
    it('should batch multiple role loads', async () => {
      mockPrisma.role.findMany.mockResolvedValue([
        { id: 1, name: 'admin' },
        { id: 2, name: 'user' },
      ]);

      const [role1, role2] = await Promise.all([
        registry.roleById.load(1),
        registry.roleById.load(2),
      ]);

      expect(mockPrisma.role.findMany).toHaveBeenCalledTimes(1);
      expect(role1.name).toBe('admin');
      expect(role2.name).toBe('user');
    });
  });

  describe('entityById', () => {
    it('should batch entity loads and exclude deleted entities', async () => {
      mockPrisma.entity.findMany.mockResolvedValue([
        { id: 1, name: 'Entity 1' },
        { id: 2, name: 'Entity 2' },
      ]);

      const [entity1, entity2] = await Promise.all([
        registry.entityById.load(1),
        registry.entityById.load(2),
      ]);

      expect(mockPrisma.entity.findMany).toHaveBeenCalledWith({
        where: { id: { in: [1, 2] }, deletedAt: null },
      });
      expect(entity1.name).toBe('Entity 1');
      expect(entity2.name).toBe('Entity 2');
    });
  });

  describe('entityFieldsByEntityId', () => {
    it('should batch entity field loads and group by entityId', async () => {
      mockPrisma.entityField.findMany.mockResolvedValue([
        { id: 1, entityId: 1, name: 'Field 1', sequence: 1 },
        { id: 2, entityId: 1, name: 'Field 2', sequence: 2 },
        { id: 3, entityId: 2, name: 'Field 3', sequence: 1 },
      ]);

      // Load fields for two entities
      const [fields1, fields2] = await Promise.all([
        registry.entityFieldsByEntityId.load(1),
        registry.entityFieldsByEntityId.load(2),
      ]);

      expect(mockPrisma.entityField.findMany).toHaveBeenCalledTimes(1);
      expect(mockPrisma.entityField.findMany).toHaveBeenCalledWith({
        where: {
          entityId: { in: [1, 2] },
          deletedAt: null,
        },
        orderBy: { sequence: 'asc' },
      });

      // Should group fields correctly
      expect(fields1).toHaveLength(2);
      expect(fields1[0].entityId).toBe(1);
      expect(fields2).toHaveLength(1);
      expect(fields2[0].entityId).toBe(2);
    });

    it('should return empty array for entity with no fields', async () => {
      mockPrisma.entityField.findMany.mockResolvedValue([
        { id: 1, entityId: 1, name: 'Field 1', sequence: 1 },
      ]);

      const [fields1, fields2] = await Promise.all([
        registry.entityFieldsByEntityId.load(1),
        registry.entityFieldsByEntityId.load(2),
      ]);

      expect(fields1).toHaveLength(1);
      expect(fields2).toEqual([]); // No fields for entity 2
    });
  });

  describe('per-request isolation', () => {
    it('should maintain separate cache per request', async () => {
      // Create two registries (simulating two requests)
      const registry1 = new DataLoaderRegistry(
        mockPrisma as any,
        mockDrizzle as any,
        1,
      );
      const registry2 = new DataLoaderRegistry(
        mockPrisma as any,
        mockDrizzle as any,
        2,
      );

      mockPrisma.user.findMany.mockResolvedValue([
        { id: 1, email: 'user1@test.com' },
      ]);

      // Load from both registries
      await registry1.userById.load(1);
      await registry2.userById.load(1);

      // Should call findMany twice (separate batches for each registry)
      expect(mockPrisma.user.findMany).toHaveBeenCalledTimes(2);
    });
  });
});
