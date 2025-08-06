import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../config/instance';
import ProgramModule from './program-module.model';
import { beforeSave } from "../hooks/timeFormatHook";
import shiftTypeConfiguration from './shift-type-configuration.model';

class ShiftType extends Model {
  id: any;
  shift_type_category!: string
  shift_type_name: any;
  created_on: any;
}

ShiftType.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    shift_type_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    shift_type_category: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    shift_type_time: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    shift_format: {
      type: DataTypes.ENUM,
      values: ["duration", "split", "time"],
      allowNull: true,
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
    time_duration: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    program_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "programs",
        key: "id",
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
    is_billable:{
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    }
  },
  {
    sequelize,
    tableName: 'shift_types',
    timestamps: false,
    hooks: {
      beforeSave: (instance) => {
        beforeSave(instance);
      },
    }
  }
);
sequelize.sync();
ShiftType.belongsTo(ProgramModule, {
  foreignKey: "program_id",
  as: "programs",
});
ShiftType.hasOne(shiftTypeConfiguration, {
  foreignKey: 'shift_type_id',
  as: 'shift_type_configuration',
});

shiftTypeConfiguration.belongsTo(ShiftType, {
  foreignKey: 'shift_type_id',
  as: 'shift_type',
});

export default ShiftType;