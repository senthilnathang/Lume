import { DataTypes, Model, type Sequelize } from 'sequelize';

/**
 * Assignment Rule — automatic record assignment.
 */
export class AssignmentRule extends Model {
  declare id: number;
  declare name: string;
  declare code: string;
  declare description: string | null;
  declare model_name: string;
  declare assignment_type: string;
  declare trigger: string;
  declare conditions: object;
  declare assigned_user_id: number | null;
  declare assigned_role_id: number | null;
  declare assigned_field: string | null;
  declare round_robin_group: string | null;
  declare priority: number;
  declare is_active: boolean;
  declare company_id: number | null;
  declare created_at: Date;
  declare updated_at: Date;

  static initModel(sequelize: Sequelize) {
    AssignmentRule.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name: { type: DataTypes.STRING(255), allowNull: false },
        code: { type: DataTypes.STRING(100), allowNull: false, unique: true },
        description: { type: DataTypes.TEXT, allowNull: true },
        model_name: { type: DataTypes.STRING(255), allowNull: false },
        assignment_type: {
          type: DataTypes.ENUM(
            'user', 'role', 'team', 'round_robin',
            'least_loaded', 'manager', 'field_value', 'expression',
          ),
          allowNull: false,
        },
        trigger: {
          type: DataTypes.ENUM('create', 'update', 'create_update'),
          defaultValue: 'create',
        },
        conditions: { type: DataTypes.JSON, defaultValue: [] },
        assigned_user_id: { type: DataTypes.INTEGER, allowNull: true },
        assigned_role_id: { type: DataTypes.INTEGER, allowNull: true },
        assigned_field: { type: DataTypes.STRING(255), allowNull: true },
        round_robin_group: { type: DataTypes.STRING(100), allowNull: true },
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
        tableName: 'base_assignment_rules',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
          { fields: ['model_name', 'trigger'] },
          { fields: ['is_active', 'priority'] },
        ],
      },
    );
  }
}

/**
 * Round Robin State — tracks rotation for round-robin assignment.
 */
export class RoundRobinState extends Model {
  declare id: number;
  declare group_name: string;
  declare last_assigned_user_id: number | null;
  declare last_assigned_index: number;
  declare eligible_user_ids: number[];
  declare last_rotation_at: Date;

  static initModel(sequelize: Sequelize) {
    RoundRobinState.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        group_name: { type: DataTypes.STRING(100), allowNull: false, unique: true },
        last_assigned_user_id: { type: DataTypes.INTEGER, allowNull: true },
        last_assigned_index: { type: DataTypes.INTEGER, defaultValue: 0 },
        eligible_user_ids: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
        last_rotation_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
      },
      {
        sequelize,
        tableName: 'base_round_robin_states',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
      },
    );
  }
}
