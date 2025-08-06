
import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/instance';
import { beforeSave } from '../hooks/timeFormatHook';
import { convertEmptyStringsToNull } from '../hooks/convertEmptyStringsToNull';

class Tenant extends Model {
  password_policy: any;
  id: any;
  name: any;
}

Tenant.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    allowNull: false,
    primaryKey: true,
  },
  tenant_parent_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: true,
    //unique: true,
  },
  type: {
    type: DataTypes.ENUM('client', 'msp', 'vendor'),
    allowNull: true,
  },
  display_name: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  logo: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  background_logo_color: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  addresses: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  contacts: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  password_policy: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  primary_contact: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  secondary_contact: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  vendor_code: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  is_enabled: {
    type: DataTypes.BOOLEAN,
    allowNull: true
  },
  is_deleted: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  ref_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  vendor_industry: {
    type: DataTypes.JSON,
    allowNull: true,
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
  created_by: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  updated_by: {
    type: DataTypes.UUID,
    allowNull: true,
  },
}, {
  sequelize,
  tableName: 'tenant',
  timestamps: false,
  hooks: {
    beforeValidate: (instance) => {
      convertEmptyStringsToNull(instance);
    },
    beforeSave: (instance) => {
      beforeSave(instance);

    },
  },
});

export default Tenant;
