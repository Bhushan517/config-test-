import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/instance';
import { beforeSave } from '../hooks/timeFormatHook';
import { Programs } from './programs.model';
import { convertEmptyStringsToNull } from '../hooks/convertEmptyStringsToNull';
import { industriesHooks } from '../hooks/afterRateCard';

class IndustriesModel extends Model {
  id: any;
  program_id: unknown;
  is_enabled: unknown;
  name: any;
}

IndustriesModel.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    code: {
      type: DataTypes.STRING,
      allowNull: true,
    },    
    is_enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    is_deleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    ref_id: {
      type: DataTypes.UUID,
    },
    program_id: {
      type: DataTypes.UUID,
      allowNull: false,
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
      type: DataTypes.UUID,
      allowNull: true,
    },
    updated_by: {
      type: DataTypes.UUID,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'labour_category',
    tableName: 'labour_category',
    timestamps: false,
    hooks: {
      beforeValidate: (instance) => {
        convertEmptyStringsToNull(instance);
      },
      beforeSave: (instance) => {
        beforeSave(instance);
      },
      afterCreate: industriesHooks.afterCreate
    },
  }
);

sequelize.sync();
IndustriesModel.belongsTo(Programs, { foreignKey: 'program_id' });
export default IndustriesModel;
