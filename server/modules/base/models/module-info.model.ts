import { DataTypes, Model, type Sequelize } from 'sequelize';

/**
 * ModuleInfo — tracks installed modules and their state in the database.
 */
export class ModuleInfo extends Model {
  declare id: number;
  declare name: string;
  declare display_name: string;
  declare version: string;
  declare description: string | null;
  declare category: string;
  declare author: string | null;
  declare depends: string[];
  declare icon: string | null;
  declare color: string | null;
  declare is_installed: boolean;
  declare is_core: boolean;
  declare installed_at: Date | null;
  declare updated_at_version: string | null;
  declare state: string;
  declare created_at: Date;
  declare updated_at: Date;

  static initModel(sequelize: Sequelize) {
    ModuleInfo.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name: { type: DataTypes.STRING(100), allowNull: false, unique: true },
        display_name: { type: DataTypes.STRING(255), allowNull: false },
        version: { type: DataTypes.STRING(20), allowNull: false },
        description: { type: DataTypes.TEXT, allowNull: true },
        category: { type: DataTypes.STRING(50), defaultValue: 'custom' },
        author: { type: DataTypes.STRING(100), allowNull: true },
        depends: { type: DataTypes.JSON, defaultValue: [] },
        icon: { type: DataTypes.STRING(50), allowNull: true },
        color: { type: DataTypes.STRING(20), allowNull: true },
        is_installed: { type: DataTypes.BOOLEAN, defaultValue: false },
        is_core: { type: DataTypes.BOOLEAN, defaultValue: false },
        installed_at: { type: DataTypes.DATE, allowNull: true },
        updated_at_version: { type: DataTypes.STRING(20), allowNull: true },
        state: { type: DataTypes.ENUM('uninstalled', 'installed', 'to_install', 'to_upgrade', 'to_remove'), defaultValue: 'uninstalled' },
      },
      {
        sequelize,
        tableName: 'module_info',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
          { fields: ['name'], unique: true },
          { fields: ['state'] },
          { fields: ['category'] },
        ],
      },
    );
  }
}
