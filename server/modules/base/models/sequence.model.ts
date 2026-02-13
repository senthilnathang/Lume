import { DataTypes, Model, type Sequelize } from 'sequelize';

/**
 * Sequence — auto-incrementing sequence generator (like Odoo ir.sequence).
 * Used for generating employee IDs, invoice numbers, etc.
 */
export class Sequence extends Model {
  declare id: number;
  declare name: string;
  declare code: string;
  declare prefix: string | null;
  declare suffix: string | null;
  declare padding: number;
  declare step: number;
  declare current_value: number;
  declare company_id: number | null;
  declare use_date_range: boolean;
  declare reset_period: string;
  declare is_active: boolean;
  declare created_at: Date;
  declare updated_at: Date;

  /**
   * Get the next value from this sequence
   */
  async getNextValue(): Promise<string> {
    this.current_value += this.step;
    await this.save();

    const num = String(this.current_value).padStart(this.padding, '0');
    const now = new Date();

    let prefix = this.prefix || '';
    let suffix = this.suffix || '';

    // Replace date placeholders
    prefix = prefix
      .replace('{YYYY}', String(now.getFullYear()))
      .replace('{MM}', String(now.getMonth() + 1).padStart(2, '0'))
      .replace('{DD}', String(now.getDate()).padStart(2, '0'));
    suffix = suffix
      .replace('{YYYY}', String(now.getFullYear()))
      .replace('{MM}', String(now.getMonth() + 1).padStart(2, '0'))
      .replace('{DD}', String(now.getDate()).padStart(2, '0'));

    return `${prefix}${num}${suffix}`;
  }

  static initModel(sequelize: Sequelize) {
    Sequence.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name: { type: DataTypes.STRING(255), allowNull: false },
        code: { type: DataTypes.STRING(100), allowNull: false, unique: true },
        prefix: { type: DataTypes.STRING(50), allowNull: true },
        suffix: { type: DataTypes.STRING(50), allowNull: true },
        padding: { type: DataTypes.INTEGER, defaultValue: 5 },
        step: { type: DataTypes.INTEGER, defaultValue: 1 },
        current_value: { type: DataTypes.INTEGER, defaultValue: 0 },
        company_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'companies', key: 'id' } },
        use_date_range: { type: DataTypes.BOOLEAN, defaultValue: false },
        reset_period: { type: DataTypes.ENUM('never', 'daily', 'monthly', 'yearly'), defaultValue: 'never' },
        is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
      },
      {
        sequelize,
        tableName: 'sequences',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
          { fields: ['code'], unique: true },
          { fields: ['company_id'] },
        ],
      },
    );
  }
}
