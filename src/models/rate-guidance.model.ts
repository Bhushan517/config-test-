
import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/instance';
import RateGuidanceConfig from './rate-guidance-config.model'; // adjust path if needed

class RateGuidance extends Model {
  id: any;
  rate_guidance_id: any;
  is_enabled: any;
  event: any;
  event_name: any;

}

RateGuidance.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      primaryKey: true,
    },
    rate_guidance_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: RateGuidanceConfig,
        key: 'id',
      },
    },
    event: {
      type: DataTypes.ENUM(
        'create_job',
        'edit_job',
        'approve_job',
        'invoice_generation',
        'rate_review'
      ),
      allowNull: false,
    },
    is_enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    created_on: {
      type: DataTypes.BIGINT.UNSIGNED,
      defaultValue: Date.now(),
      allowNull: true,
    },
    updated_on: {
      type: DataTypes.BIGINT.UNSIGNED,
      defaultValue: Date.now(),
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'rate_guidance',
    timestamps: false,
  }
);

export default RateGuidance;
