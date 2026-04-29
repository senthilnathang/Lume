/**
 * RelationshipService - Entity-to-entity linking operations
 *
 * Manages relationships between custom entity records using EntityRelationshipRecord.
 * Provides link creation, deletion, querying, and relationship resolution.
 *
 * Usage:
 *   import { RelationshipService } from '../services/relationship.service.js';
 *   import { PrismaAdapter } from '../db/adapters/prisma-adapter.js';
 *
 *   const adapter = new PrismaAdapter('EntityRelationshipRecord');
 *   const relationshipAdapter = new PrismaAdapter('EntityRelationship');
 *   const service = new RelationshipService(adapter, relationshipAdapter);
 *
 *   // Link two records
 *   const link = await service.linkRecords(1, 100, 200);
 *
 *   // Get all targets linked from a source
 *   const targets = await service.getLinkedRecords(1, 100);
 *
 *   // Get all sources linking to a target
 *   const sources = await service.getReverseLinks(1, 200);
 *
 *   // Populate records with their linked IDs
 *   const resolved = await service.resolveRelationships(records, 1);
 */

export class RelationshipService {
  /**
   * @param {PrismaAdapter} adapter - PrismaAdapter instance for EntityRelationshipRecord
   * @param {PrismaAdapter} relationshipAdapter - PrismaAdapter instance for EntityRelationship
   */
  constructor(adapter, relationshipAdapter) {
    this.adapter = adapter;
    this.relationshipAdapter = relationshipAdapter;
  }

  /**
   * Create a link between two records
   *
   * Prevents self-links (sourceRecordId === targetRecordId).
   * Validates that the relationship exists in the database.
   *
   * @param {number} relationshipId - EntityRelationship ID
   * @param {number} sourceRecordId - Source record ID
   * @param {number} targetRecordId - Target record ID
   * @returns {Promise<Object>} Created EntityRelationshipRecord
   * @throws {Error} Throws "circular relationship" for self-links, "Relationship not found" if relationship doesn't exist
   */
  async linkRecords(relationshipId, sourceRecordId, targetRecordId) {
    // Prevent self-links (circular relationships)
    if (sourceRecordId === targetRecordId) {
      const err = new Error('circular relationship');
      err.code = 'CIRCULAR_RELATIONSHIP';
      throw err;
    }

    // Validate that relationship exists
    const relationship = await this.relationshipAdapter.findById(relationshipId);
    if (!relationship) {
      const err = new Error('Relationship not found');
      err.code = 'RELATIONSHIP_NOT_FOUND';
      throw err;
    }

    // Create the link
    const linkData = {
      relationshipId: Number(relationshipId),
      sourceRecordId: Number(sourceRecordId),
      targetRecordId: Number(targetRecordId),
    };

    return this.adapter.create(linkData);
  }

  /**
   * Remove a link between two records
   *
   * Deletes EntityRelationshipRecord where all three IDs match.
   * Returns count of deleted records.
   *
   * @param {number} relationshipId - EntityRelationship ID
   * @param {number} sourceRecordId - Source record ID
   * @param {number} targetRecordId - Target record ID
   * @returns {Promise<Object>} Delete result with count property
   */
  async unlinkRecords(relationshipId, sourceRecordId, targetRecordId) {
    const { count } = await this.adapter.findAll({
      where: [
        ['relationshipId', '=', Number(relationshipId)],
        ['sourceRecordId', '=', Number(sourceRecordId)],
        ['targetRecordId', '=', Number(targetRecordId)],
      ],
      limit: 1,
      offset: 0,
    });

    // If found, delete it
    if (count > 0) {
      // Find the record ID first, then delete
      const { rows } = await this.adapter.findAll({
        where: [
          ['relationshipId', '=', Number(relationshipId)],
          ['sourceRecordId', '=', Number(sourceRecordId)],
          ['targetRecordId', '=', Number(targetRecordId)],
        ],
        limit: 1,
        offset: 0,
      });

      if (rows.length > 0) {
        await this.adapter.destroy(rows[0].id);
      }
    }

    return { count };
  }

  /**
   * Get all target record IDs linked from a source record
   *
   * Queries EntityRelationshipRecord for all records where
   * relationshipId and sourceRecordId match.
   *
   * @param {number} relationshipId - EntityRelationship ID
   * @param {number} sourceRecordId - Source record ID
   * @returns {Promise<Array<number>>} Array of targetRecordIds
   */
  async getLinkedRecords(relationshipId, sourceRecordId) {
    const { rows } = await this.adapter.findAll({
      where: [
        ['relationshipId', '=', Number(relationshipId)],
        ['sourceRecordId', '=', Number(sourceRecordId)],
      ],
      limit: 10000,
      offset: 0,
    });

    return rows.map(record => record.targetRecordId);
  }

  /**
   * Get all source record IDs linking to a target record
   *
   * Queries EntityRelationshipRecord for all records where
   * relationshipId and targetRecordId match (reverse direction).
   *
   * @param {number} relationshipId - EntityRelationship ID
   * @param {number} targetRecordId - Target record ID
   * @returns {Promise<Array<number>>} Array of sourceRecordIds
   */
  async getReverseLinks(relationshipId, targetRecordId) {
    const { rows } = await this.adapter.findAll({
      where: [
        ['relationshipId', '=', Number(relationshipId)],
        ['targetRecordId', '=', Number(targetRecordId)],
      ],
      limit: 10000,
      offset: 0,
    });

    return rows.map(record => record.sourceRecordId);
  }

  /**
   * Resolve relationships for a set of records
   *
   * Adds a 'linkedIds' array to each record containing all target record IDs
   * linked from that record via the specified relationship.
   *
   * @param {Array<Object>} records - Array of records to enrich (must have 'id' field)
   * @param {number} relationshipId - EntityRelationship ID
   * @param {any} linkedEntity - Unused parameter (for compatibility)
   * @returns {Promise<Array<Object>>} Records with 'linkedIds' array added
   */
  async resolveRelationships(records, relationshipId, linkedEntity) {
    if (!Array.isArray(records) || records.length === 0) {
      return records;
    }

    // Get all record IDs from input
    const recordIds = records.map(r => r.id);

    // Query all links for these source records
    const { rows } = await this.adapter.findAll({
      where: [
        ['relationshipId', '=', Number(relationshipId)],
        ['sourceRecordId', 'in', recordIds],
      ],
      limit: 100000,
      offset: 0,
    });

    // Group by sourceRecordId
    const linkMap = new Map();
    for (const link of rows) {
      if (!linkMap.has(link.sourceRecordId)) {
        linkMap.set(link.sourceRecordId, []);
      }
      linkMap.get(link.sourceRecordId).push(link.targetRecordId);
    }

    // Add linkedIds to each record
    return records.map(record => ({
      ...record,
      linkedIds: linkMap.get(record.id) || [],
    }));
  }
}

export default RelationshipService;
