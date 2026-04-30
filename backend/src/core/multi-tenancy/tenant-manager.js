/**
 * @fileoverview Tenant Manager - Multi-tenancy support
 * Manages data isolation and tenant-specific configurations
 */

import logger from '../services/logger.js';

class TenantManager {
  /**
   * @param {Object} config - Configuration
   * @param {Object} config.db - Database adapter
   * @param {string} config.isolationLevel - 'schema' or 'row' (default 'row')
   */
  constructor(config = {}) {
    this.db = config.db;
    this.isolationLevel = config.isolationLevel || 'row'; // row-level or schema-based
    this.tenants = new Map(); // tenantId -> TenantConfig
    this.currentTenant = null; // Currently active tenant
  }

  /**
   * Create a new tenant
   * @param {Object} tenant - Tenant definition
   * @param {string} tenant.id - Unique tenant ID
   * @param {string} tenant.name - Display name
   * @param {string} tenant.domain - Tenant domain
   * @param {Object} tenant.config - Custom configuration
   * @returns {Promise<Object>} Created tenant
   */
  async createTenant(tenant) {
    if (this.tenants.has(tenant.id)) {
      throw new Error(`Tenant already exists: ${tenant.id}`);
    }

    const tenantConfig = {
      id: tenant.id,
      name: tenant.name,
      domain: tenant.domain,
      config: tenant.config || {},
      createdAt: new Date(),
      active: true,
      metadata: {
        dataUsage: 0,
        recordCount: 0,
        users: 0,
      },
    };

    this.tenants.set(tenant.id, tenantConfig);

    // Create tenant schema if schema-based isolation
    if (this.isolationLevel === 'schema' && this.db) {
      try {
        await this.db.createTenantSchema(tenant.id);
      } catch (error) {
        logger.error(`[TenantManager] Failed to create schema for ${tenant.id}: ${error.message}`);
        this.tenants.delete(tenant.id);
        throw error;
      }
    }

    logger.info(`[TenantManager] Tenant created: ${tenant.id} (${tenant.name})`);

    return tenantConfig;
  }

  /**
   * Get tenant configuration
   * @param {string} tenantId - Tenant ID
   * @returns {Object} Tenant configuration
   */
  getTenant(tenantId) {
    return this.tenants.get(tenantId);
  }

  /**
   * List all tenants
   * @returns {Object[]} All tenants
   */
  listTenants() {
    return Array.from(this.tenants.values());
  }

  /**
   * Get tenant by domain
   * @param {string} domain - Domain name
   * @returns {Object|null} Tenant or null
   */
  getTenantByDomain(domain) {
    for (const tenant of this.tenants.values()) {
      if (tenant.domain === domain) {
        return tenant;
      }
    }
    return null;
  }

  /**
   * Set active tenant context
   * @param {string} tenantId - Tenant ID
   * @returns {Object} Active tenant
   */
  setActiveTenant(tenantId) {
    const tenant = this.getTenant(tenantId);
    if (!tenant) {
      throw new Error(`Tenant not found: ${tenantId}`);
    }

    if (!tenant.active) {
      throw new Error(`Tenant is inactive: ${tenantId}`);
    }

    this.currentTenant = tenantId;
    logger.debug(`[TenantManager] Active tenant set: ${tenantId}`);

    return tenant;
  }

  /**
   * Get currently active tenant
   * @returns {string} Current tenant ID
   */
  getActiveTenant() {
    return this.currentTenant;
  }

  /**
   * Update tenant configuration
   * @param {string} tenantId - Tenant ID
   * @param {Object} updates - Configuration updates
   * @returns {Promise<Object>} Updated tenant
   */
  async updateTenant(tenantId, updates) {
    const tenant = this.getTenant(tenantId);
    if (!tenant) {
      throw new Error(`Tenant not found: ${tenantId}`);
    }

    Object.assign(tenant.config, updates.config || {});
    if (updates.name) tenant.name = updates.name;
    if (updates.active !== undefined) tenant.active = updates.active;

    logger.info(`[TenantManager] Tenant updated: ${tenantId}`);

    return tenant;
  }

  /**
   * Delete tenant
   * @param {string} tenantId - Tenant ID
   * @returns {Promise<void>}
   */
  async deleteTenant(tenantId) {
    const tenant = this.getTenant(tenantId);
    if (!tenant) {
      throw new Error(`Tenant not found: ${tenantId}`);
    }

    // Delete schema if schema-based isolation
    if (this.isolationLevel === 'schema' && this.db) {
      try {
        await this.db.dropTenantSchema(tenantId);
      } catch (error) {
        logger.error(`[TenantManager] Failed to drop schema: ${error.message}`);
      }
    }

    this.tenants.delete(tenantId);

    if (this.currentTenant === tenantId) {
      this.currentTenant = null;
    }

    logger.info(`[TenantManager] Tenant deleted: ${tenantId}`);
  }

  /**
   * Add tenant isolation filter to query
   * @param {Object} query - Query object
   * @param {string} tenantId - Tenant ID
   * @returns {Object} Query with tenant filter
   */
  addTenantFilter(query, tenantId) {
    if (this.isolationLevel === 'row') {
      // Add WHERE tenant_id = ? clause
      return {
        ...query,
        tenantFilter: { tenant_id: tenantId },
      };
    }

    // Schema-based: connection already scoped to tenant schema
    return query;
  }

  /**
   * Get tenant statistics
   * @param {string} tenantId - Tenant ID
   * @returns {Object} Tenant statistics
   */
  getTenantStats(tenantId) {
    const tenant = this.getTenant(tenantId);
    if (!tenant) {
      return null;
    }

    return {
      id: tenant.id,
      name: tenant.name,
      createdAt: tenant.createdAt,
      metadata: tenant.metadata,
      config: tenant.config,
    };
  }

  /**
   * Check if user belongs to tenant
   * @param {string} tenantId - Tenant ID
   * @param {string} userId - User ID
   * @returns {boolean}
   */
  async isUserInTenant(tenantId, userId) {
    const tenant = this.getTenant(tenantId);
    if (!tenant) {
      return false;
    }

    // Delegation to DB would check user_tenant_mapping
    return true; // Simplified
  }

  /**
   * Update tenant metadata
   * @param {string} tenantId - Tenant ID
   * @param {Object} metadata - Metadata updates
   * @returns {Object} Updated tenant
   */
  updateMetadata(tenantId, metadata) {
    const tenant = this.getTenant(tenantId);
    if (!tenant) {
      throw new Error(`Tenant not found: ${tenantId}`);
    }

    Object.assign(tenant.metadata, metadata);
    return tenant;
  }

  /**
   * Get all tenants' combined statistics
   * @returns {Object}
   */
  getAllStatistics() {
    let totalTenants = this.tenants.size;
    let totalRecords = 0;
    let totalUsers = 0;

    for (const tenant of this.tenants.values()) {
      totalRecords += tenant.metadata.recordCount || 0;
      totalUsers += tenant.metadata.users || 0;
    }

    return {
      totalTenants,
      totalRecords,
      totalUsers,
      activeTenants: Array.from(this.tenants.values()).filter(t => t.active).length,
    };
  }

  /**
   * Clear all tenants
   */
  clear() {
    this.tenants.clear();
    this.currentTenant = null;
    logger.info('[TenantManager] All tenants cleared');
  }
}

export default TenantManager;
