import { Model, DataTypes, Sequelize, ModelStatic } from 'sequelize';
import type { Optional } from 'sequelize';

// ============================================================================
// Mixin Interfaces
// ============================================================================

export interface TimestampAttributes {
  created_at: Date;
  updated_at: Date;
}

export interface SoftDeleteAttributes {
  deleted_at: Date | null;
  is_deleted: boolean;
}

export interface AuditAttributes {
  created_by: number | null;
  updated_by: number | null;
}

export interface CompanyScopedAttributes {
  company_id: number;
}

export interface ActiveAttributes {
  is_active: boolean;
  deactivation_reason: string | null;
}

export interface MetadataAttributes {
  metadata: Record<string, unknown> | null;
  tags: string[] | null;
}

export interface VersionAttributes {
  version: number;
}

// ============================================================================
// Mixin Field Definitions (reusable in Model.init())
// ============================================================================

export const timestampFields = {
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
};

export const softDeleteFields = {
  deleted_at: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: null,
  },
  is_deleted: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
};

export const auditFields = {
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'users', key: 'id' },
  },
  updated_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'users', key: 'id' },
  },
};

export const companyScopedFields = {
  company_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'companies', key: 'id' },
  },
};

export const activeFields = {
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  deactivation_reason: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
};

export const metadataFields = {
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: null,
  },
  tags: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: null,
  },
};

export const versionFields = {
  version: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
};

// ============================================================================
// Base Model Options (common to all models)
// ============================================================================

export const baseModelOptions = {
  timestamps: true,
  underscored: true,
  freezeTableName: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  charset: 'utf8mb4',
  collate: 'utf8mb4_unicode_ci',
};

// ============================================================================
// Combined Mixins for Enterprise Models
// ============================================================================

/**
 * Enterprise model: Timestamp + SoftDelete + Audit + Active + Metadata + Version
 * Used for core entities like User, Company, Role, etc.
 */
export const enterpriseModelFields = {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  ...timestampFields,
  ...softDeleteFields,
  ...auditFields,
  ...activeFields,
  ...metadataFields,
  ...versionFields,
};

/**
 * Company-scoped enterprise model.
 * Used for entities that belong to a specific company (multi-tenant).
 */
export const companyScopedEnterpriseFields = {
  ...enterpriseModelFields,
  ...companyScopedFields,
};

// ============================================================================
// Soft Delete Scope Helper
// ============================================================================

/**
 * Add default scope to exclude soft-deleted records.
 */
export function addSoftDeleteScope(model: ModelStatic<any>) {
  model.addScope('defaultScope', {
    where: { is_deleted: false },
  }, { override: true });

  model.addScope('withDeleted', {});

  model.addScope('onlyDeleted', {
    where: { is_deleted: true },
  });
}

/**
 * Add company scope helper.
 */
export function addCompanyScope(model: ModelStatic<any>, companyId: number) {
  return model.scope({ method: ['byCompany', companyId] });
}
