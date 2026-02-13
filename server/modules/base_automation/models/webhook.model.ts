import { DataTypes, Model, type Sequelize } from 'sequelize';

/**
 * Webhook Definition — outgoing webhook configurations.
 */
export class WebhookDefinition extends Model {
  declare id: number;
  declare name: string;
  declare code: string;
  declare description: string | null;
  declare url: string;
  declare method: string;
  declare headers: object;
  declare payload_template: string | null;
  declare model_name: string | null;
  declare event: string;
  declare filter_domain: object;
  declare auth_type: string;
  declare auth_config: object;
  declare secret_key: string | null;
  declare timeout_seconds: number;
  declare max_retries: number;
  declare retry_delay_seconds: number;
  declare is_active: boolean;
  declare company_id: number | null;
  declare created_at: Date;
  declare updated_at: Date;

  static initModel(sequelize: Sequelize) {
    WebhookDefinition.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name: { type: DataTypes.STRING(255), allowNull: false },
        code: { type: DataTypes.STRING(100), allowNull: false, unique: true },
        description: { type: DataTypes.TEXT, allowNull: true },
        url: { type: DataTypes.STRING(1000), allowNull: false },
        method: {
          type: DataTypes.ENUM('GET', 'POST', 'PUT', 'PATCH', 'DELETE'),
          defaultValue: 'POST',
        },
        headers: { type: DataTypes.JSON, defaultValue: {} },
        payload_template: { type: DataTypes.TEXT, allowNull: true },
        model_name: { type: DataTypes.STRING(255), allowNull: true },
        event: {
          type: DataTypes.ENUM('create', 'update', 'delete', 'workflow_change', 'custom'),
          allowNull: false,
        },
        filter_domain: { type: DataTypes.JSON, defaultValue: [] },
        auth_type: {
          type: DataTypes.ENUM('none', 'basic', 'bearer', 'signature', 'api_key'),
          defaultValue: 'none',
        },
        auth_config: { type: DataTypes.JSON, defaultValue: {} },
        secret_key: { type: DataTypes.STRING(255), allowNull: true },
        timeout_seconds: { type: DataTypes.INTEGER, defaultValue: 30 },
        max_retries: { type: DataTypes.INTEGER, defaultValue: 3 },
        retry_delay_seconds: { type: DataTypes.INTEGER, defaultValue: 60 },
        is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
        company_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'companies', key: 'id' },
        },
      },
      {
        sequelize,
        tableName: 'base_webhook_definitions',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
          { fields: ['model_name', 'event'] },
          { fields: ['is_active'] },
        ],
      },
    );
  }
}

/**
 * Webhook Log — delivery attempt records.
 */
export class WebhookLog extends Model {
  declare id: number;
  declare webhook_id: number;
  declare record_id: number | null;
  declare event: string;
  declare url: string;
  declare request_headers: object;
  declare request_body: string | null;
  declare response_status: number | null;
  declare response_body: string | null;
  declare status: string;
  declare attempt_number: number;
  declare execution_time_ms: number | null;
  declare error_message: string | null;
  declare created_at: Date;

  static initModel(sequelize: Sequelize) {
    WebhookLog.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        webhook_id: { type: DataTypes.INTEGER, allowNull: false },
        record_id: { type: DataTypes.INTEGER, allowNull: true },
        event: { type: DataTypes.STRING(50), allowNull: false },
        url: { type: DataTypes.STRING(1000), allowNull: false },
        request_headers: { type: DataTypes.JSON, defaultValue: {} },
        request_body: { type: DataTypes.TEXT, allowNull: true },
        response_status: { type: DataTypes.INTEGER, allowNull: true },
        response_body: { type: DataTypes.TEXT, allowNull: true },
        status: {
          type: DataTypes.ENUM('pending', 'success', 'failed', 'retrying'),
          defaultValue: 'pending',
        },
        attempt_number: { type: DataTypes.INTEGER, defaultValue: 1 },
        execution_time_ms: { type: DataTypes.INTEGER, allowNull: true },
        error_message: { type: DataTypes.TEXT, allowNull: true },
      },
      {
        sequelize,
        tableName: 'base_webhook_logs',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false,
        indexes: [
          { fields: ['webhook_id', 'created_at'] },
          { fields: ['status'] },
        ],
      },
    );
  }
}
