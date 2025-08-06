import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/instance';
import { beforeSave } from '../hooks/timeFormatHook';
import { convertEmptyStringsToNull } from '../hooks/convertEmptyStringsToNull';
class Language extends Model {
  id: any;
  name: any;
}

Language.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    allowNull: false,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  locale: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  is_deleted: {
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
  tableName: 'language',
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
export default Language;
