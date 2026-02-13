import { DataTypes, Model, type Sequelize } from 'sequelize';

/**
 * Duplicate Rule — duplicate detection rules for models.
 */
export class DuplicateRule extends Model {
  declare id: number;
  declare name: string;
  declare model_name: string;
  declare match_fields: object;
  declare match_type: string;
  declare threshold: number;
  declare action_on_match: string;
  declare is_active: boolean;
  declare company_id: number | null;
  declare created_at: Date;
  declare updated_at: Date;

  static initModel(sequelize: Sequelize) {
    DuplicateRule.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name: { type: DataTypes.STRING(255), allowNull: false },
        model_name: { type: DataTypes.STRING(255), allowNull: false },
        match_fields: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
        match_type: {
          type: DataTypes.ENUM('exact', 'fuzzy', 'soundex', 'custom'),
          defaultValue: 'exact',
        },
        threshold: { type: DataTypes.FLOAT, defaultValue: 0.8 },
        action_on_match: {
          type: DataTypes.ENUM('block', 'warn', 'log'),
          defaultValue: 'warn',
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
        tableName: 'base_duplicate_rules',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [{ fields: ['model_name'] }],
      },
    );
  }
}

/**
 * Duplicate Match — found duplicate records.
 */
export class DuplicateMatch extends Model {
  declare id: number;
  declare rule_id: number;
  declare model_name: string;
  declare record_id: number;
  declare duplicate_record_id: number;
  declare match_score: number;
  declare matched_fields: object;
  declare status: string;
  declare resolved_by: number | null;
  declare resolved_at: Date | null;
  declare created_at: Date;

  static initModel(sequelize: Sequelize) {
    DuplicateMatch.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        rule_id: { type: DataTypes.INTEGER, allowNull: false },
        model_name: { type: DataTypes.STRING(255), allowNull: false },
        record_id: { type: DataTypes.INTEGER, allowNull: false },
        duplicate_record_id: { type: DataTypes.INTEGER, allowNull: false },
        match_score: { type: DataTypes.FLOAT, allowNull: false },
        matched_fields: { type: DataTypes.JSON, defaultValue: {} },
        status: {
          type: DataTypes.ENUM('pending', 'confirmed', 'rejected', 'merged'),
          defaultValue: 'pending',
        },
        resolved_by: { type: DataTypes.INTEGER, allowNull: true },
        resolved_at: { type: DataTypes.DATE, allowNull: true },
      },
      {
        sequelize,
        tableName: 'base_duplicate_matches',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false,
        indexes: [
          { fields: ['model_name', 'record_id'] },
          { fields: ['status'] },
        ],
      },
    );
  }
}
