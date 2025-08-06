import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/instance';
import ProgramModule from './program-module.model';
import { beforeSave } from "../hooks/timeFormatHook";

class ShiftConfiguration extends Model {
  id!: string;
  shift_type!: object;
  program_id!: string;
  is_deleted!: boolean
}

ShiftConfiguration.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      defaultValue: false,
      allowNull: true,
    },
    time_format: {
      type: DataTypes.ENUM('12', '24'),
      values: ['12', '24'],
      defaultValue: '24',
    },
    is_enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    is_deleted: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
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
    program_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'programs',
        key: 'id',
      },
    },
  },
  {
    sequelize,
    tableName: 'shift_configurations',
    timestamps: false,
    hooks: {
      beforeSave: (instance) => {
        beforeSave(instance);
      },
    }
  }
);

sequelize.sync();

ShiftConfiguration.belongsTo(ProgramModule, {
  foreignKey: 'program_id',
  as: 'programs',
});

export default ShiftConfiguration;