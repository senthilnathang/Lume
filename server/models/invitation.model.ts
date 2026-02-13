import { Model, DataTypes, Sequelize } from 'sequelize';
import {
  enterpriseModelFields,
  baseModelOptions,
  addSoftDeleteScope,
} from './base.model';

export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'cancelled' | 'resent';

export interface InvitationAttributes {
  id: number;
  email: string;
  token: string;
  status: InvitationStatus;
  company_id: number;
  role_id: number | null;
  group_ids: number[] | null;
  message: string | null;
  invited_by_id: number | null;
  expires_at: Date;
  accepted_at: Date | null;
  cancelled_at: Date | null;
  email_sent: boolean;
  email_sent_at: Date | null;
  email_error: string | null;
  resend_count: number;
  last_resent_at: Date | null;
  created_user_id: number | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export class Invitation extends Model<InvitationAttributes> {
  declare id: number;
  declare email: string;
  declare token: string;
  declare status: InvitationStatus;
  declare company_id: number;
  declare role_id: number | null;
  declare group_ids: number[] | null;
  declare message: string | null;
  declare invited_by_id: number | null;
  declare expires_at: Date;
  declare accepted_at: Date | null;
  declare cancelled_at: Date | null;
  declare email_sent: boolean;
  declare email_sent_at: Date | null;
  declare email_error: string | null;
  declare resend_count: number;
  declare last_resent_at: Date | null;
  declare created_user_id: number | null;

  static initModel(sequelize: Sequelize): typeof Invitation {
    Invitation.init(
      {
        ...enterpriseModelFields,
        email: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        token: {
          type: DataTypes.STRING(255),
          allowNull: false,
          unique: true,
        },
        status: {
          type: DataTypes.ENUM('pending', 'accepted', 'expired', 'cancelled', 'resent'),
          allowNull: false,
          defaultValue: 'pending',
        },
        company_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: { model: 'companies', key: 'id' },
        },
        role_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'roles', key: 'id' },
        },
        group_ids: {
          type: DataTypes.JSON,
          allowNull: true,
        },
        message: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        invited_by_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'users', key: 'id' },
        },
        expires_at: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        accepted_at: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        cancelled_at: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        email_sent: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        email_sent_at: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        email_error: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        resend_count: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        last_resent_at: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        created_user_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: { model: 'users', key: 'id' },
        },
      },
      {
        sequelize,
        tableName: 'user_invitations',
        ...baseModelOptions,
        indexes: [
          { unique: true, fields: ['token'] },
          { fields: ['email'] },
          { fields: ['company_id'] },
          { fields: ['status'] },
          { fields: ['expires_at'] },
        ],
      },
    );

    addSoftDeleteScope(Invitation);
    return Invitation;
  }
}
