import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/instance';

class QualificationTypeModel extends Model {
  id: any;
  name: any;
}

QualificationTypeModel.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    allowNull: false,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  type: {
    type: DataTypes.STRING,
    defaultValue: "program"
  },
  code: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  is_enabled: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: true,
  },
  is_deleted: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false,
  },
  program_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'programs',
      key: 'id',
    },
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
    type: DataTypes.CHAR(36),
    allowNull: true,
  },
  updated_by: {
    type: DataTypes.CHAR(36),
    allowNull: true,
  },
}, {
  sequelize,
  modelName: 'qualification_types',
  timestamps: false,
});

export default QualificationTypeModel;