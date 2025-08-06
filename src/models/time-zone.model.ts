import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/instance';
import { beforeSave } from '../hooks/timeFormatHook';
import { convertEmptyStringsToNull } from '../hooks/convertEmptyStringsToNull';

class TimeZone extends Model {
  id: any;
  name: any;
}

TimeZone.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    allowNull: false,
    primaryKey: true,
  },
  code: {
    type: DataTypes.CHAR(255),
    allowNull: false,
  },
  name: {
    type: DataTypes.CHAR(255),
    allowNull: false,
  },
  offset: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  utc_offset: {
    type: DataTypes.CHAR(255),
    allowNull: false,
    defaultValue: '',
  },
  region: {
    type: DataTypes.CHAR(255),
    allowNull: false,
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
  tableName: 'time_zones',
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

sequelize.sync();
export default TimeZone;