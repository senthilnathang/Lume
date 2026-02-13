import { DataTypes, Model, type Sequelize } from 'sequelize';

/**
 * OPA-Style Policy — declarative policy evaluation.
 */
export class OPAPolicy extends Model {
  declare id: number;
  declare name: string;
  declare codename: string;
  declare description: string | null;
  declare effect: string;
  declare scope: string;
  declare target_model: string | null;
  declare target_field: string | null;
  declare target_action: string | null;
  declare conditions: object;
  declare priority: number;
  declare is_active: boolean;
  declare company_id: number | null;
  declare created_at: Date;
  declare updated_at: Date;

  static initModel(sequelize: Sequelize) {
    OPAPolicy.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name: { type: DataTypes.STRING(255), allowNull: false },
        codename: { type: DataTypes.STRING(100), allowNull: false, unique: true },
        description: { type: DataTypes.TEXT, allowNull: true },
        effect: {
          type: DataTypes.ENUM('allow', 'deny'),
          allowNull: false,
          defaultValue: 'deny',
        },
        scope: {
          type: DataTypes.ENUM('global', 'model', 'field', 'action', 'record'),
          allowNull: false,
          defaultValue: 'model',
        },
        target_model: { type: DataTypes.STRING(255), allowNull: true },
        target_field: { type: DataTypes.STRING(255), allowNull: true },
        target_action: { type: DataTypes.STRING(100), allowNull: true },
        conditions: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
        priority: { type: DataTypes.INTEGER, defaultValue: 0 },
        is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
        company_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'companies', key: 'id' },
        },
      },
      {
        sequelize,
        tableName: 'security_opa_policies',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
          { fields: ['scope', 'target_model'] },
          { fields: ['company_id'] },
          { fields: ['is_active', 'priority'] },
        ],
      },
    );
  }
}

/**
 * Policy Set — groups policies with a combining algorithm.
 */
export class PolicySet extends Model {
  declare id: number;
  declare name: string;
  declare description: string | null;
  declare combining_algorithm: string;
  declare is_active: boolean;
  declare company_id: number | null;

  static initModel(sequelize: Sequelize) {
    PolicySet.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name: { type: DataTypes.STRING(255), allowNull: false },
        description: { type: DataTypes.TEXT, allowNull: true },
        combining_algorithm: {
          type: DataTypes.ENUM('deny_overrides', 'permit_overrides', 'first_applicable', 'unanimous'),
          allowNull: false,
          defaultValue: 'deny_overrides',
        },
        is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
        company_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'companies', key: 'id' },
        },
      },
      {
        sequelize,
        tableName: 'security_policy_sets',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
      },
    );
  }
}

/**
 * Policy Set Member — links policies to a policy set.
 */
export class PolicySetMember extends Model {
  declare id: number;
  declare policy_set_id: number;
  declare policy_id: number;
  declare priority: number;

  static initModel(sequelize: Sequelize) {
    PolicySetMember.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        policy_set_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'security_policy_sets', key: 'id' },
        },
        policy_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'security_opa_policies', key: 'id' },
        },
        priority: { type: DataTypes.INTEGER, defaultValue: 0 },
      },
      {
        sequelize,
        tableName: 'security_policy_set_members',
        timestamps: false,
        indexes: [
          { unique: true, fields: ['policy_set_id', 'policy_id'] },
        ],
      },
    );
  }
}

/**
 * Policy Evaluation Log — audit trail for policy decisions.
 */
export class PolicyEvaluationLog extends Model {
  declare id: number;
  declare policy_id: number | null;
  declare policy_set_id: number | null;
  declare user_id: number;
  declare action: string;
  declare resource_model: string | null;
  declare resource_id: number | null;
  declare decision: string;
  declare evaluation_time_ms: number | null;
  declare context: object;
  declare created_at: Date;

  static initModel(sequelize: Sequelize) {
    PolicyEvaluationLog.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        policy_id: { type: DataTypes.INTEGER, allowNull: true },
        policy_set_id: { type: DataTypes.INTEGER, allowNull: true },
        user_id: { type: DataTypes.INTEGER, allowNull: false },
        action: { type: DataTypes.STRING(100), allowNull: false },
        resource_model: { type: DataTypes.STRING(255), allowNull: true },
        resource_id: { type: DataTypes.INTEGER, allowNull: true },
        decision: {
          type: DataTypes.ENUM('allow', 'deny', 'not_applicable'),
          allowNull: false,
        },
        evaluation_time_ms: { type: DataTypes.INTEGER, allowNull: true },
        context: { type: DataTypes.JSON, defaultValue: {} },
      },
      {
        sequelize,
        tableName: 'security_policy_evaluation_logs',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false,
        indexes: [
          { fields: ['user_id', 'created_at'] },
          { name: 'pel_resource_model_id', fields: ['resource_model', 'resource_id'] },
        ],
      },
    );
  }
}
