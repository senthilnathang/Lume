import { DataTypes, Model, type Sequelize } from 'sequelize';

/**
 * Email Template — Jinja2/Handlebars-based templates bound to models.
 */
export class EmailTemplate extends Model {
  declare id: number;
  declare name: string;
  declare code: string;
  declare description: string | null;
  declare model_name: string | null;
  declare subject_template: string;
  declare body_html: string;
  declare body_text: string | null;
  declare from_email: string | null;
  declare reply_to: string | null;
  declare cc_list: string | null;
  declare is_active: boolean;
  declare company_id: number | null;
  declare created_at: Date;
  declare updated_at: Date;

  static initModel(sequelize: Sequelize) {
    EmailTemplate.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name: { type: DataTypes.STRING(255), allowNull: false },
        code: { type: DataTypes.STRING(100), allowNull: false, unique: true },
        description: { type: DataTypes.TEXT, allowNull: true },
        model_name: { type: DataTypes.STRING(255), allowNull: true },
        subject_template: { type: DataTypes.STRING(500), allowNull: false },
        body_html: { type: DataTypes.TEXT, allowNull: false },
        body_text: { type: DataTypes.TEXT, allowNull: true },
        from_email: { type: DataTypes.STRING(255), allowNull: true },
        reply_to: { type: DataTypes.STRING(255), allowNull: true },
        cc_list: { type: DataTypes.STRING(500), allowNull: true },
        is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
        company_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'companies', key: 'id' },
        },
      },
      {
        sequelize,
        tableName: 'base_email_templates',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [{ fields: ['model_name'] }],
      },
    );
  }
}

/**
 * Email Queue — async email queue with retry logic.
 */
export class EmailQueue extends Model {
  declare id: number;
  declare template_id: number | null;
  declare to_email: string;
  declare subject: string;
  declare body_html: string;
  declare body_text: string | null;
  declare from_email: string | null;
  declare cc: string | null;
  declare bcc: string | null;
  declare attachments: object;
  declare status: string;
  declare retry_count: number;
  declare max_retries: number;
  declare next_retry_at: Date | null;
  declare sent_at: Date | null;
  declare error_message: string | null;
  declare created_at: Date;

  static initModel(sequelize: Sequelize) {
    EmailQueue.init(
      {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        template_id: { type: DataTypes.INTEGER, allowNull: true },
        to_email: { type: DataTypes.STRING(500), allowNull: false },
        subject: { type: DataTypes.STRING(500), allowNull: false },
        body_html: { type: DataTypes.TEXT, allowNull: false },
        body_text: { type: DataTypes.TEXT, allowNull: true },
        from_email: { type: DataTypes.STRING(255), allowNull: true },
        cc: { type: DataTypes.STRING(500), allowNull: true },
        bcc: { type: DataTypes.STRING(500), allowNull: true },
        attachments: { type: DataTypes.JSON, defaultValue: [] },
        status: {
          type: DataTypes.ENUM('pending', 'sending', 'sent', 'failed', 'cancelled'),
          defaultValue: 'pending',
        },
        retry_count: { type: DataTypes.INTEGER, defaultValue: 0 },
        max_retries: { type: DataTypes.INTEGER, defaultValue: 3 },
        next_retry_at: { type: DataTypes.DATE, allowNull: true },
        sent_at: { type: DataTypes.DATE, allowNull: true },
        error_message: { type: DataTypes.TEXT, allowNull: true },
      },
      {
        sequelize,
        tableName: 'base_email_queue',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: false,
        indexes: [
          { fields: ['status', 'next_retry_at'] },
          { fields: ['created_at'] },
        ],
      },
    );
  }
}
